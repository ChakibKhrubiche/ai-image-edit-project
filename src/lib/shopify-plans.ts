export const SHOPIFY_PLANS = {
  TRIAL: {
    label: 'Essai gratuit',
    tryonsPerMonth: 50,
    price: 0,
    durationDays: 7,
  },
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

// Launch promo applied to every new paid subscription via Shopify's native
// AppSubscription discount. percentage is a fraction (0.25 = 25%).
// Set to null to disable.
export const LAUNCH_PROMO: { percentage: number; intervals: number } | null = {
  percentage: 0.25,
  intervals: 1,
};
