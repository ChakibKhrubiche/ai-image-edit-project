import { type NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { isValidShopDomain } from '~/lib/shopify';

// Marks the store's widget as added so the onboarding gate is not shown again.
// Called by the dashboard when the merchant opens the Theme Editor to add the block.
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.json({ error: 'Invalid shop' }, { status: 400 });
  }

  const store = await db.shopifyStore.findUnique({ where: { shop }, select: { id: true } });
  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  await db.shopifyStore.update({
    where: { shop },
    data: { widgetAdded: true },
  });

  return NextResponse.json({ ok: true });
}
