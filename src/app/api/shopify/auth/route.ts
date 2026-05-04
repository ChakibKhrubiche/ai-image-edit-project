import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { env } from '~/env';
import { isValidShopDomain, isTokenExpired } from '~/lib/shopify';
import { db } from '~/server/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.json({ error: 'Invalid shop parameter' }, { status: 400 });
  }

  // Skip OAuth only if the store has a valid, non-expired, expiring token
  // Force re-auth if: no store, inactive, non-expiring token (null), or token expired/expiring
  const existing = await db.shopifyStore.findUnique({ where: { shop } });
  const hasValidToken = existing?.isActive
    && existing.accessTokenExpiresAt !== null
    && !isTokenExpired(existing.accessTokenExpiresAt);
  if (hasValidToken) {
    const appUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${appUrl}/shopify-dashboard?shop=${shop}`);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  // Derive app URL from env var, or fall back to request origin (works on Vercel previews)
  const appUrl = env.SHOPIFY_APP_URL ?? new URL(request.url).origin;
  const redirectUri = `${appUrl}/api/shopify/callback`;
  const scopes = env.SHOPIFY_SCOPES ?? 'read_products,write_script_tags';

  const authUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${env.SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${nonce}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('shopify_oauth_state', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
