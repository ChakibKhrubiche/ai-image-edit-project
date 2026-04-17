import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

// POST /api/shopify/tryon/credits/deduct
// Body: { shop, customerId, anonymous }
// Deducts 1 credit. Returns updated balance.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    shop?: string;
    customerId?: string;
    anonymous?: boolean;
  };

  const { shop, customerId, anonymous: isAnonymous = false } = body;

  if (!shop || !customerId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const store = await db.shopifyStore.findUnique({ where: { shop } });
  if (!store?.isActive) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const record = await db.shopifyCustomerCredit.findUnique({
    where: { storeId_customerId: { storeId: store.id, customerId } },
  });

  if (!record || record.credits <= 0) {
    return NextResponse.json({ error: 'No credits remaining', credits: 0 }, { status: 403 });
  }

  const updated = await db.shopifyCustomerCredit.update({
    where: { storeId_customerId: { storeId: store.id, customerId } },
    data:  { credits: { decrement: 1 } },
  });

  return NextResponse.json({ credits: updated.credits });
}
