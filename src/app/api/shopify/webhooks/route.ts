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

  // Verify HMAC signature — required for all webhooks including compliance ones
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
        return new NextResponse(null, { status: 200 });
      }

      if (store.minPurchaseForReset !== null) {
        const orderTotal = parseFloat(order.total_price ?? '0');
        const minAmount  = parseFloat(store.minPurchaseForReset.toString());
        if (orderTotal < minAmount) {
          return new NextResponse(null, { status: 200 });
        }
      }

      await db.shopifyCustomerCredit.upsert({
        where:  { storeId_customerId: { storeId: store.id, customerId } },
        create: { storeId: store.id, customerId, isAnonymous: false, credits: store.creditsPerCustomer },
        update: { credits: store.creditsPerCustomer },
      });
    }
  }

  // ── customers/data_request ───────────────────────────────────────────────────
  // A customer requested a copy of their personal data.
  // We only store their Shopify customer ID and try-on credit count — no PII.
  // Acknowledge with 200; no data export needed for this data footprint.
  if (topic === 'customers/data_request') {
    // Nothing to export — customer ID + credit count are not sensitive PII
  }

  // ── customers/redact ─────────────────────────────────────────────────────────
  // A customer requested deletion of their personal data from our system.
  if (topic === 'customers/redact' && shop) {
    const payload = JSON.parse(rawBody) as {
      customer?: { id: number };
    };
    const customerId = payload.customer?.id?.toString();

    if (customerId) {
      const store = await db.shopifyStore.findUnique({ where: { shop } });
      if (store) {
        await db.shopifyCustomerCredit.deleteMany({
          where: { storeId: store.id, customerId },
        });
      }
    }
  }

  // ── shop/redact ──────────────────────────────────────────────────────────────
  // 48h after uninstall, Shopify requests full deletion of all shop data.
  if (topic === 'shop/redact' && shop) {
    const store = await db.shopifyStore.findUnique({ where: { shop } });
    if (store) {
      await db.$transaction([
        db.shopifyCustomerCredit.deleteMany({ where: { storeId: store.id } }),
        db.shopifyTryonUsage.deleteMany({ where: { storeId: store.id } }),
        db.shopifyStore.delete({ where: { id: store.id } }),
      ]);
    }
  }

  return new NextResponse(null, { status: 200 });
}
