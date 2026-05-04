import { db } from '~/server/db';
import { refreshAccessToken, isTokenExpired } from '~/lib/shopify';

interface StoreTokenFields {
  shop: string;
  accessToken: string;
  accessTokenExpiresAt: Date | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;
}

// Returns a valid access token, refreshing it transparently if needed.
// Throws if refresh fails (merchant must reconnect via OAuth).
export async function getValidAccessToken(store: StoreTokenFields): Promise<string> {
  if (!isTokenExpired(store.accessTokenExpiresAt)) {
    return store.accessToken;
  }

  if (!store.refreshToken) {
    throw new Error('Access token expired and no refresh token available. Merchant must reconnect.');
  }

  const refreshed = await refreshAccessToken(store.shop, store.refreshToken);

  await db.shopifyStore.update({
    where: { shop: store.shop },
    data: {
      accessToken:           refreshed.accessToken,
      accessTokenExpiresAt:  refreshed.accessTokenExpiresAt,
      refreshToken:          refreshed.refreshToken,
      refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
    },
  });

  return refreshed.accessToken;
}
