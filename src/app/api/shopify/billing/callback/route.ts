import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import type { ShopifyPlanKey } from '~/lib/shopify-plans';

const GRAPHQL_API_VERSION = '2024-10';

// GET /api/shopify/billing/callback?shop=xxx&plan=STARTER&charge_id=XXX
// Shopify redirects here after the merchant accepts or declines the subscription
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const shop     = searchParams.get('shop');
  const plan     = searchParams.get('plan') as ShopifyPlanKey | null;
  const chargeId = searchParams.get('charge_id');

  if (!shop || !plan || !chargeId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const store = await db.shopifyStore.findUnique({ where: { shop } });
  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // charge_id may be a numeric ID or a full GID
  const subscriptionGid = chargeId.startsWith('gid://')
    ? chargeId
    : `gid://shopify/AppSubscription/${chargeId}`;

  // 1. Check subscription status
  const statusRes = await fetch(
    `https://${shop}/admin/api/${GRAPHQL_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken,
      },
      body: JSON.stringify({
        query: `
          query GetSubscription($id: ID!) {
            appSubscription(id: $id) { id status }
          }
        `,
        variables: { id: subscriptionGid },
      }),
    },
  );

  if (!statusRes.ok) {
    console.error('[billing/callback] Status check failed:', statusRes.status);
    return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=error`);
  }

  const statusJson = (await statusRes.json()) as {
    data?: { appSubscription?: { id: string; status: string } };
  };

  const subscription = statusJson.data?.appSubscription;

  if (subscription?.status !== 'ACCEPTED') {
    console.log('[billing/callback] Subscription not accepted:', subscription?.status);
    return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=declined`);
  }

  // 2. Activate subscription
  const activateRes = await fetch(
    `https://${shop}/admin/api/${GRAPHQL_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken,
      },
      body: JSON.stringify({
        query: `
          mutation Activate($id: ID!) {
            appSubscriptionActivate(id: $id) {
              userErrors { field message }
              appSubscription { id status }
            }
          }
        `,
        variables: { id: subscriptionGid },
      }),
    },
  );

  if (!activateRes.ok) {
    console.error('[billing/callback] Activate request failed:', activateRes.status);
    return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=error`);
  }

  const activateJson = (await activateRes.json()) as {
    data?: {
      appSubscriptionActivate?: {
        userErrors: { field: string; message: string }[];
        appSubscription?: { id: string; status: string };
      };
    };
  };

  const activateResult = activateJson.data?.appSubscriptionActivate;

  if (!activateResult || activateResult.userErrors.length > 0) {
    console.error('[billing/callback] Activation errors:', JSON.stringify(activateResult?.userErrors));
    return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=error`);
  }

  // 3. Update plan in DB
  await db.shopifyStore.update({
    where: { shop },
    data: { plan, billingId: chargeId },
  });

  return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=success`);
}
