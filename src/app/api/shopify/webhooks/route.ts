import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { env } from '~/env';

export async function POST(request: NextRequest) {
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
  const topic      = request.headers.get('X-Shopify-Topic');
  const shop       = request.headers.get('X-Shopify-Shop-Domain');

  if (!hmacHeader) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const rawBody = await request.text();

  const computed = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET ?? '')
    .update(rawBody, 'utf8')
    .digest('base64');

  if (computed !== hmacHeader) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // ── app/uninstalled ──────────────────────────────────────────────────────────
  if (topic === 'app/uninstalled' && shop) {
    await db.shopifyStore.updateMany({
      where: { shop },
      data: { isActive: false },
    });
  }

  // ── orders/paid ─────────────────────────────────────────────────────────────
  if (topic === 'orders/paid' && shop) {
    const store = await db.shopifyStore.findUnique({ where: { shop } });
    if (store) {
      const order = JSON.parse(rawBody) as {
        customer?: { id: number };
        total_price?: string;
      };

      const customerId = order.customer?.id?.toString();
      if (!customerId) {
        // Anonymous order — no customer to reset
        return new NextResponse(null, { status: 200 });
      }

      // Check minimum purchase amount if configured
      if (store.minPurchaseForReset !== null) {
        const orderTotal = parseFloat(order.total_price ?? '0');
        const minAmount  = parseFloat(store.minPurchaseForReset.toString());
        if (orderTotal < minAmount) {
          return new NextResponse(null, { status: 200 });
        }
      }

      // Reset credits for this customer
      await db.shopifyCustomerCredit.upsert({
        where:  { storeId_customerId: { storeId: store.id, customerId } },
        create: {
          storeId:     store.id,
          customerId,
          isAnonymous: false,
          credits:     store.creditsPerCustomer,
        },
        update: { credits: store.creditsPerCustomer },
      });
    }
  }

  return new NextResponse(null, { status: 200 });
}
