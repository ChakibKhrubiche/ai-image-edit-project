import crypto from 'crypto';
import { env } from '~/env';

/**
 * Validates the HMAC signature sent by Shopify on OAuth callbacks and webhooks.
 * Excludes the 'hmac' param itself, sorts the rest, and compares with HMAC-SHA256.
 */
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

/**
 * Checks that the shop domain is a valid *.myshopify.com domain.
 */
export function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop);
}

/**
 * Exchanges the temporary OAuth code for a permanent access token.
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<string> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Shopify token exchange failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}
