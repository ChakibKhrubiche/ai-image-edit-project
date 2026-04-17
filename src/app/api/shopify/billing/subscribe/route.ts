import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { SHOPIFY_PLANS } from '~/lib/shopify-plans';
import type { ShopifyPlanKey } from '~/lib/shopify-plans';

// GET /api/shopify/billing/subscribe?shop=xxx.myshopify.com&plan=STARTER
// Creates a RecurringApplicationCharge and redirects to Shopify confirmation page
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

  // return_url: Shopify will append ?charge_id=XXX to this URL
  const returnUrl = `${origin}/api/shopify/billing/callback?shop=${shop}&plan=${plan}`;

  const res = await fetch(
    `https://${shop}/admin/api/2024-10/recurring_application_charges.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken,
      },
      body: JSON.stringify({
        recurring_application_charge: {
          name: `HijabTryOn ${planData.label}`,
          price: planData.price,
          return_url: returnUrl,
          test: true, // TODO: set to false in production for real stores
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[billing/subscribe] Shopify error:', err);
    return NextResponse.redirect(
      `${origin}/shopify-dashboard?shop=${shop}&billing=error`,
    );
  }

  const data = (await res.json()) as {
    recurring_application_charge: { confirmation_url: string };
  };

  return NextResponse.redirect(data.recurring_application_charge.confirmation_url);
}
