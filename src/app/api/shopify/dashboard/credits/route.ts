import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';

// GET /api/shopify/dashboard/credits?shop=xxx
// Returns all customer credit records + store settings
export async function GET(request: NextRequest) {
  const shop = new URL(request.url).searchParams.get('shop');
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 });

  const store = await db.shopifyStore.findUnique({
    where: { shop },
    include: {
      customerCredits: {
        orderBy: { updatedAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  return NextResponse.json({
    settings: {
      creditsPerCustomer:    store.creditsPerCustomer,
      allowAnonymousCredits: store.allowAnonymousCredits,
      minPurchaseForReset:   store.minPurchaseForReset,
    },
    customers: store.customerCredits,
  });
}

// PATCH /api/shopify/dashboard/credits
// Update store settings OR manually adjust a customer's credits
// Body: { shop, settings?: {...}, customerId?: string, credits?: number }
export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    shop?: string;
    settings?: {
      creditsPerCustomer?:    number;
      allowAnonymousCredits?: boolean;
      minPurchaseForReset?:   number | null;
    };
    customerId?: string;
    credits?: number;
  };

  const { shop, settings, customerId, credits } = body;
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 });

  const store = await db.shopifyStore.findUnique({ where: { shop } });
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

  // Update store-level settings
  if (settings) {
    await db.shopifyStore.update({
      where: { shop },
      data: {
        ...(settings.creditsPerCustomer    !== undefined && { creditsPerCustomer:    settings.creditsPerCustomer }),
        ...(settings.allowAnonymousCredits !== undefined && { allowAnonymousCredits: settings.allowAnonymousCredits }),
        ...(settings.minPurchaseForReset   !== undefined && { minPurchaseForReset:   settings.minPurchaseForReset }),
      },
    });
  }

  // Manual credit adjustment for a specific customer
  if (customerId !== undefined && credits !== undefined) {
    await db.shopifyCustomerCredit.upsert({
      where:  { storeId_customerId: { storeId: store.id, customerId } },
      create: { storeId: store.id, customerId, isAnonymous: false, credits },
      update: { credits },
    });
  }

  return NextResponse.json({ ok: true });
}
