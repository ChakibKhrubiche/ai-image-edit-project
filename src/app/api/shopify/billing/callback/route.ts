import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import type { ShopifyPlanKey } from '~/lib/shopify-plans';

interface ShopifyChargeResponse {
  recurring_application_charge: {
    id: number;
    status: string;
  };
}

// GET /api/shopify/billing/callback?shop=xxx&plan=STARTER&charge_id=XXX
// Shopify redirects here after the merchant accepts or declines the charge
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const shop      = searchParams.get('shop');
  const plan      = searchParams.get('plan') as ShopifyPlanKey | null;
  const chargeId  = searchParams.get('charge_id');

  if (!shop || !plan || !chargeId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const store = await db.shopifyStore.findUnique({ where: { shop } });
  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // 1. Verify charge status with Shopify
  const verifyRes = await fetch(
    `https://${shop}/admin/api/2024-10/recurring_application_charges/${chargeId}.json`,
    { headers: { 'X-Shopify-Access-Token': store.accessToken } },
  );

  if (!verifyRes.ok) {
    return NextResponse.redirect(`${origin}/shopify-dashboard?shop=${shop}&billing=error`);
  }

  const { recurring_application_charge: charge } =
    (await verifyRes.json()) as ShopifyChargeResponse;

  if (charge.status !== 'accepted') {
    // Merchant declined — redirect back to dashboard without upgrading
    return NextResponse.redirect(
      `${origin}/shopify-dashboard?shop=${shop}&billing=declined`,
    );
  }

  // 2. Activate the charge
  await fetch(
    `https://${shop}/admin/api/2024-10/recurring_application_charges/${chargeId}/activate.json`,
    {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': store.accessToken },
    },
  );

  // 3. Update plan in DB
  await db.shopifyStore.update({
    where: { shop },
    data: {
      plan,
      billingId: String(chargeId),
    },
  });

  return NextResponse.redirect(
    `${origin}/shopify-dashboard?shop=${shop}&billing=success`,
  );
}
