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

  if (!validateShopifyHmac(searchParams)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  const shop  = searchParams.get('shop');
  const code  = searchParams.get('code');
  const state = searchParams.get('state');

  const storedState = request.cookies.get('shopify_oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 401 });
  }

  if (!shop || !isValidShopDomain(shop) || !code) {
    return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
  }

  let tokenResult: Awaited<ReturnType<typeof exchangeCodeForToken>>;
  try {
    tokenResult = await exchangeCodeForToken(shop, code);
  } catch (error) {
    console.error('[shopify/callback] Token exchange failed:', error);
    return NextResponse.json({ error: 'Failed to exchange OAuth code' }, { status: 500 });
  }

  const { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt } = tokenResult;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  // Detect first install (vs re-auth) to trigger the onboarding modal.
  const existingStore = await db.shopifyStore.findUnique({
    where: { shop },
    select: { id: true },
  });
  const isFirstInstall = !existingStore;

  await db.shopifyStore.upsert({
    where: { shop },
    create: {
      shop,
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      plan: 'TRIAL',
      trialEndsAt,
      isActive: true,
    },
    update: {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      isActive: true,
    },
  });

  const appUrl = new URL(request.url).origin;
  const dashboardUrl = `${appUrl}/shopify-dashboard?shop=${shop}${isFirstInstall ? '&installed=1' : ''}`;
  const response = NextResponse.redirect(dashboardUrl);
  response.cookies.delete('shopify_oauth_state');

  return response;
}
