import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { env } from '~/env';
import { SHOPIFY_PLANS } from '~/lib/shopify-plans';
import type { ShopifyPlanKey } from '~/lib/shopify-plans';
import { getValidAccessToken } from '~/lib/shopify-token';

const GRAPHQL_API_VERSION = '2024-10';

// GET /api/shopify/billing/subscribe?shop=xxx.myshopify.com&plan=STARTER
// Creates an AppSubscription via GraphQL and redirects to Shopify confirmation page
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const shop = searchParams.get('shop');
  const plan = searchParams.get('plan') as ShopifyPlanKey | null;

  if (!shop || !plan || !(plan in SHOPIFY_PLANS)) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 });
  }

  const planData = SHOPIFY_PLANS[plan];
  if (planData.price === 0) {
    return NextResponse.json({ error: 'Cannot subscribe to trial plan' }, { status: 400 });
  }

  const store = await db.shopifyStore.findUnique({ where: { shop } });
  if (!store?.isActive) {
    return NextResponse.json({ error: 'Store not found or inactive' }, { status: 403 });
  }

  const returnUrl = `${origin}/api/shopify/billing/callback?shop=${shop}&plan=${plan}`;

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(store);
  } catch {
    return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=error`);
  }

  const res = await fetch(
    `https://${shop}/admin/api/${GRAPHQL_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: `
          mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean!, $price: Decimal!) {
            appSubscriptionCreate(
              name: $name
              returnUrl: $returnUrl
              test: $test
              lineItems: [{
                plan: {
                  appRecurringPricingDetails: {
                    price: { amount: $price, currencyCode: EUR }
                    interval: EVERY_30_DAYS
                  }
                }
              }]
            ) {
              userErrors { field message }
              confirmationUrl
              appSubscription { id }
            }
          }
        `,
        variables: {
          name: `HijabTryOn ${planData.label}`,
          returnUrl,
          // SHOPIFY_BILLING_TEST=true → simulated charges (dev stores)
          // Default false so real stores are charged real money
          test: env.SHOPIFY_BILLING_TEST === 'true',
          price: planData.price.toFixed(2),
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[billing/subscribe] Shopify GraphQL HTTP error:', err);
    return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=error`);
  }

  const json = (await res.json()) as {
    data?: {
      appSubscriptionCreate?: {
        userErrors: { field: string; message: string }[];
        confirmationUrl?: string;
        appSubscription?: { id: string };
      };
    };
    errors?: unknown;
  };

  const result = json.data?.appSubscriptionCreate;

  if (!result?.confirmationUrl || result.userErrors.length > 0) {
    console.error('[billing/subscribe] Shopify errors:', JSON.stringify(result?.userErrors ?? json.errors));
    return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=error`);
  }

  return NextResponse.redirect(result.confirmationUrl);
}
