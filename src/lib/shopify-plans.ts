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
    price: 29,
  },
  GROWTH: {
    label: 'Growth',
    tryonsPerMonth: 1000,
    price: 79,
  },
  PRO: {
    label: 'Pro',
    tryonsPerMonth: Infinity,
    price: 199,
  },
} as const;

export type ShopifyPlanKey = keyof typeof SHOPIFY_PLANS;
