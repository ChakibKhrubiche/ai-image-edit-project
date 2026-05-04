import { NextRequest, NextResponse } from 'next/server';
import { env } from '~/env';
import { db } from '~/server/db';
import {
  validateShopifyHmac,
  isValidShopDomain,
  exchangeCodeForToken,
} from '~/lib/shopify';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 1. Validate HMAC — ensures this request really comes from Shopify
  if (!validateShopifyHmac(searchParams)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 2. Validate state (nonce) — anti-CSRF
  const storedState = request.cookies.get('shopify_oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 401 });
  }

  if (!shop || !isValidShopDomain(shop) || !code) {
    return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
  }

  // 3. Exchange code for access token
  let accessToken: string;
  let accessTokenExpiresAt: Date | null;
  try {
    ({ accessToken, expiresAt: accessTokenExpiresAt } = await exchangeCodeForToken(shop, code));
    console.log('[shopify/callback] accessTokenExpiresAt:', accessTokenExpiresAt, '| expires_in (s):', accessTokenExpiresAt ? Math.round((accessTokenExpiresAt.getTime() - Date.now()) / 1000) : null);
  } catch (error) {
    console.error('[shopify/callback] Token exchange failed:', error);
    return NextResponse.json({ error: 'Failed to exchange OAuth code' }, { status: 500 });
  }

  // 4. Save or update the store in DB — upsert handles reinstalls gracefully
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  await db.shopifyStore.upsert({
    where: { shop },
    create: {
      shop,
      accessToken,
      accessTokenExpiresAt,
      plan: 'TRIAL',
      trialEndsAt,
      isActive: true,
    },
    update: {
      accessToken,
      accessTokenExpiresAt,
      isActive: true,
    },
  });

  // 5. Clear the state cookie and redirect to the merchant dashboard
  // Always use request origin so the redirect works on any deployment (preview, prod)
  const appUrl = new URL(request.url).origin;
  const response = NextResponse.redirect(`${appUrl}/shopify-dashboard?shop=${shop}`);
  response.cookies.delete('shopify_oauth_state');

  return response;
}
