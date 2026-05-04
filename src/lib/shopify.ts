import crypto from 'crypto';
import { env } from '~/env';

export function validateShopifyHmac(searchParams: URLSearchParams): boolean {
  const hmac = searchParams.get('hmac');
  if (!hmac) return false;

  const params: string[] = [];
  searchParams.forEach((value, key) => {
    if (key !== 'hmac') params.push(`${key}=${value}`);
  });

  const message = params.sort().join('&');
  const computed = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET ?? '')
    .update(message)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(hmac, 'hex'),
    );
  } catch {
    return false;
  }
}

export function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop);
}

export interface TokenResult {
  accessToken: string;
  accessTokenExpiresAt: Date | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;
}

export async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<TokenResult> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
      expiring: 1, // required since April 2026 — issues 60 min token + 90 day refresh token
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify token exchange failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  };

  console.log('[shopify] token exchange — expires_in:', data.expires_in ?? 'none', '| has refresh_token:', !!data.refresh_token);

  const now = Date.now();
  const accessTokenExpiresAt = data.expires_in
    ? new Date(now + data.expires_in * 1000)
    : null;
  const refreshTokenExpiresAt = data.refresh_token
    ? new Date(now + (data.refresh_token_expires_in ?? 90 * 24 * 60 * 60) * 1000)
    : null;

  return {
    accessToken: data.access_token,
    accessTokenExpiresAt,
    refreshToken: data.refresh_token ?? null,
    refreshTokenExpiresAt,
  };
}

export async function refreshAccessToken(
  shop: string,
  refreshToken: string,
): Promise<TokenResult> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify token refresh failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    refresh_token_expires_in?: number;
  };

  const now = Date.now();
  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: new Date(now + data.expires_in * 1000),
    refreshToken: data.refresh_token,
    refreshTokenExpiresAt: new Date(now + (data.refresh_token_expires_in ?? 90 * 24 * 60 * 60) * 1000),
  };
}

// True when access token expires within 5 minutes — triggers silent refresh
export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  const buffer = 5 * 60 * 1000; // 5 min
  return expiresAt.getTime() - Date.now() < buffer;
}

// True when refresh token is expired or missing — merchant must reconnect via OAuth
export function isRefreshTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= Date.now();
}
