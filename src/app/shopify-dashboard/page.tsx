import Image from 'next/image';
import { db } from '~/server/db';
import { SHOPIFY_PLANS } from '~/lib/shopify-plans';
import type { ShopifyPlanKey } from '~/lib/shopify-plans';
import { isRefreshTokenExpired } from '~/lib/shopify';
import { CreditSettingsForm } from './CreditSettingsForm';
import { OnboardingModal } from './OnboardingModal';
import { env } from '~/env';

interface PageProps {
  searchParams: Promise<{ shop?: string; billing?: string; installed?: string }>;
}

const PLAN_COLORS: Record<string, string> = {
  TRIAL:   'bg-gray-100 text-gray-700',
  STARTER: 'bg-violet-100 text-violet-700',
  GROWTH:  'bg-violet-600 text-white',
  PRO:     'bg-gray-900 text-white',
};

const PLAN_ORDER: ShopifyPlanKey[] = ['STARTER', 'GROWTH', 'PRO'];

export default async function ShopifyDashboardPage({ searchParams }: PageProps) {
  const { shop, billing, installed } = await searchParams;

  if (!shop) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-red-500">Missing shop parameter.</p>
      </main>
    );
  }

  const store = await db.shopifyStore.findUnique({ where: { shop } });

  if (!store?.isActive) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-red-500">Store not found or inactive.</p>
      </main>
    );
  }

  const currentPlanKey = store.plan;
  const currentPlan    = SHOPIFY_PLANS[currentPlanKey];
  // Banner only when refresh token is expired/missing — access token is refreshed silently
  const tokenExpired = isRefreshTokenExpired(store.refreshTokenExpiresAt);

  // Monthly usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const usageCount = await db.shopifyTryonUsage.count({
    where: { storeId: store.id, createdAt: { gte: startOfMonth } },
  });

  const quota = currentPlan.tryonsPerMonth;
  const usagePct = quota === Infinity ? 0 : Math.min((usageCount / quota) * 100, 100);

  const customerCredits = await db.shopifyCustomerCredit.findMany({
    where: { storeId: store.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  // Deep link that pre-adds the HijabTryOn app block into the product main section
  // (appended below the Buy buttons on standard themes). Merchant only clicks Save.
  const addBlockUrl = `https://${shop}/admin/themes/current/editor?template=product&addAppBlockId=${env.SHOPIFY_API_KEY}/tryon-button&target=mainSection`;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      {installed === '1' && <OnboardingModal shop={shop} addBlockUrl={addBlockUrl} />}
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="HijabTryOn" width={44} height={44} className="rounded-xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HijabTryOn</h1>
              <p className="text-sm text-gray-500">{shop}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${PLAN_COLORS[currentPlanKey]}`}>
            {currentPlan.label}
          </span>
        </div>

        {/* Token expiry warning */}
        {tokenExpired && (
          <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-orange-800 text-sm flex items-start gap-3">
            <span className="text-lg leading-none">⚠️</span>
            <div>
              <p className="font-semibold">Connection expired</p>
              <p className="mt-0.5">
                Your store&apos;s access token has expired. The try-on widget can no longer communicate with Shopify.{' '}
                <a
                  href={`/api/shopify/auth?shop=${shop}`}
                  className="underline font-medium hover:text-orange-900"
                >
                  Reconnect store →
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Billing notification banner */}
        {billing === 'success' && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm">
            Subscription activated successfully!
          </div>
        )}
        {billing === 'declined' && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-yellow-700 text-sm">
            Activation cancelled. Your plan was not changed.
          </div>
        )}
        {billing === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            An error occurred during activation. Please try again.
          </div>
        )}

        {/* Usage card */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Usage this month</h2>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold text-gray-900">{usageCount}</span>
            <span className="text-gray-500 text-sm mb-1">
              {quota === Infinity ? 'unlimited try-ons' : `/ ${quota} try-ons`}
            </span>
          </div>
          {quota !== Infinity && (
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
          {currentPlanKey === 'TRIAL' && store.trialEndsAt && (
            <p className="text-xs text-gray-400">
              Trial period until{' '}
              {store.trialEndsAt.toLocaleDateString('en-US')}
            </p>
          )}
        </div>

        {/* Plans grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Available plans</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLAN_ORDER.map((key) => {
              const plan      = SHOPIFY_PLANS[key];
              const isCurrent = key === currentPlanKey;
              const currentIdx = PLAN_ORDER.indexOf(currentPlanKey);
              const planIdx    = PLAN_ORDER.indexOf(key);
              const isUpgrade  = currentIdx >= 0 && planIdx > currentIdx;
              const isDowngrade = currentIdx >= 0 && planIdx < currentIdx;

              const ctaLabel = isCurrent
                ? 'Current plan'
                : isUpgrade
                ? `Upgrade to ${plan.label}`
                : isDowngrade
                ? `Downgrade to ${plan.label}`
                : `Choose ${plan.label}`;

              return (
                <div
                  key={key}
                  className={`rounded-xl border p-5 space-y-4 ${
                    isCurrent
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{plan.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {plan.price}€
                      <span className="text-sm font-normal text-gray-500">/month</span>
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {plan.tryonsPerMonth === Infinity
                      ? 'Unlimited try-ons'
                      : `${plan.tryonsPerMonth.toLocaleString()} try-ons/month`}
                  </p>
                  {isCurrent ? (
                    <span className="block text-center rounded-lg bg-violet-600 text-white py-2 text-sm font-semibold">
                      {ctaLabel}
                    </span>
                  ) : (
                    <a
                      href={`/api/shopify/billing/subscribe?shop=${shop}&plan=${key}`}
                      className={`block text-center rounded-lg py-2 text-sm font-semibold transition-colors ${
                        isDowngrade
                          ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          : 'bg-gray-900 text-white hover:bg-gray-700'
                      }`}
                    >
                      {ctaLabel}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Credit settings */}
        <CreditSettingsForm
          shop={shop}
          creditsPerCustomer={store.creditsPerCustomer}
          allowAnonymousCredits={store.allowAnonymousCredits}
          minPurchaseForReset={store.minPurchaseForReset ? Number(store.minPurchaseForReset) : null}
        />

        {/* Widget configuration info */}
        <div className="rounded-xl bg-violet-50 border border-violet-200 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-violet-900">Your Store Is Almost Ready! 🎉</h2>
          <p className="text-sm text-violet-700">
            Complete one final step to enable AI Virtual Try-On on your product pages.
          </p>
          <p className="text-sm text-violet-700">
            Click the button below to open the Shopify Theme Editor with the{' '}
            <strong>HijabTryOn</strong> block pre-added. Just click <strong>Save</strong>, and
            your customers will instantly see the Try-On button.
          </p>
          <p className="text-sm text-violet-700">
            You can customize the button&apos;s text and colors anytime from the block settings.
          </p>
          <a
            href={addBlockUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Add widget to product page →
          </a>
        </div>

        {/* Customer credits table */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer credits</h2>
          {customerCredits.length === 0 ? (
            <p className="text-sm text-gray-400">No customers have used the widget yet.</p>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Remaining credits</th>
                    <th className="px-4 py-3 text-right">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerCredits.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {c.customerId.length > 20 ? `${c.customerId.slice(0, 20)}…` : c.customerId}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.isAnonymous ? 'bg-gray-100 text-gray-500' : 'bg-violet-100 text-violet-700'}`}>
                          {c.isAnonymous ? 'Anonymous' : 'Logged in'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{c.credits}</td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {c.updatedAt.toLocaleDateString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


      </div>
    </main>
  );
}
