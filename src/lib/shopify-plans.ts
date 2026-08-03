export const SHOPIFY_PLANS = {
  TRIAL: {
    label: 'Essai gratuit',
    tryonsPerMonth: 50,
    price: 0,
    durationDays: 7,
  },
  // ⚠️ TEMPORARY TEST PRICES (low real charges for live billing testing).
  // Restore to 25 / 79 / 199 before going live.
  STARTER: {
    label: 'Starter',
    tryonsPerMonth: 200,
    price: 25,
  },
  GROWTH: {
    label: 'Growth',
    tryonsPerMonth: 1000,
    price: 79,
  },
  PRO: {
    label: 'Pro',
    tryonsPerMonth: 3000,
    price: 199,
  },
} as const;

export type ShopifyPlanKey = keyof typeof SHOPIFY_PLANS;
