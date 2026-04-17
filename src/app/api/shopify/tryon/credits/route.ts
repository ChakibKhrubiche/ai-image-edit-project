import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '~/server/db';

// GET /api/shopify/tryon/credits?shop=xxx&customerId=yyy&anonymous=true|false
// Returns remaining credits for a customer (creates record on first visit)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop        = searchParams.get('shop');
  const customerId  = searchParams.get('customerId');
  const isAnonymous = searchParams.get('anonymous') === 'true';

  if (!shop || !customerId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const store = await db.shopifyStore.findUnique({ where: { shop } });
  if (!store?.isActive) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // Anonymous customers: check if store allows them
  if (isAnonymous && !store.allowAnonymousCredits) {
    return NextResponse.json({ credits: 0, allowed: false });
  }

  // Get or create credit record
  const record = await db.shopifyCustomerCredit.upsert({
    where:  { storeId_customerId: { storeId: store.id, customerId } },
    create: {
      storeId:     store.id,
      customerId,
      isAnonymous,
      credits:     store.creditsPerCustomer,
    },
    update: {}, // don't overwrite existing credits
  });

  return NextResponse.json({
    credits:           record.credits,
    creditsPerCustomer: store.creditsPerCustomer,
    allowed:           record.credits > 0,
  });
}
