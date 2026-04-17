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

  // Read raw body for HMAC verification (must be done before any JSON parsing)
  const rawBody = await request.text();

  // Verify HMAC — Shopify signs with the client secret, base64-encodes the result
  const computed = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET ?? '')
    .update(rawBody, 'utf8')
    .digest('base64');

  if (computed !== hmacHeader) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Handle app/uninstalled — deactivate the store
  if (topic === 'app/uninstalled' && shop) {
    await db.shopifyStore.updateMany({
      where: { shop },
      data: { isActive: false },
    });
  }

  return new NextResponse(null, { status: 200 });
}
