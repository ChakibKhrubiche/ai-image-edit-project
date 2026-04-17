import { db } from '~/server/db';
import { SHOPIFY_PLANS } from '~/lib/shopify-plans';
import type { ShopifyPlanKey } from '~/lib/shopify-plans';

interface PageProps {
  searchParams: Promise<{ shop?: string; billing?: string }>;
}

const PLAN_COLORS: Record<string, string> = {
  TRIAL:   'bg-gray-100 text-gray-700',
  STARTER: 'bg-violet-100 text-violet-700',
  GROWTH:  'bg-violet-600 text-white',
  PRO:     'bg-gray-900 text-white',
};

const PLAN_ORDER: ShopifyPlanKey[] = ['STARTER', 'GROWTH', 'PRO'];

export default async function ShopifyDashboardPage({ searchParams }: PageProps) {
  const { shop, billing } = await searchParams;

  if (!shop) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-red-500">Paramètre shop manquant.</p>
      </main>
    );
  }

  const store = await db.shopifyStore.findUnique({ where: { shop } });

  if (!store || !store.isActive) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-red-500">Boutique non trouvée ou inactive.</p>
      </main>
    );
  }

  const currentPlanKey = store.plan as ShopifyPlanKey;
  const currentPlan    = SHOPIFY_PLANS[currentPlanKey];

  // Monthly usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const usageCount = await db.shopifyTryonUsage.count({
    where: { storeId: store.id, createdAt: { gte: startOfMonth } },
  });

  const quota = currentPlan.tryonsPerMonth;
  const usagePct = quota === Infinity ? 0 : Math.min((usageCount / quota) * 100, 100);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HijabTryOn</h1>
            <p className="text-sm text-gray-500">{shop}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${PLAN_COLORS[currentPlanKey]}`}>
            {currentPlan.label}
          </span>
        </div>

        {/* Billing notification banner */}
        {billing === 'success' && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm">
            Abonnement activé avec succès !
          </div>
        )}
        {billing === 'declined' && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-yellow-700 text-sm">
            Activation annulée. Votre plan n&apos;a pas été modifié.
          </div>
        )}
        {billing === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            Une erreur est survenue lors de l&apos;activation. Veuillez réessayer.
          </div>
        )}

        {/* Usage card */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Utilisation ce mois-ci</h2>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold text-gray-900">{usageCount}</span>
            <span className="text-gray-500 text-sm mb-1">
              {quota === Infinity ? 'try-ons illimités' : `/ ${quota} try-ons`}
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
              Période d&apos;essai jusqu&apos;au{' '}
              {store.trialEndsAt.toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>

        {/* Plans grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Plans disponibles</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLAN_ORDER.map((key) => {
              const plan      = SHOPIFY_PLANS[key];
              const isCurrent = key === currentPlanKey;
              const isUpgrade = PLAN_ORDER.indexOf(key) > PLAN_ORDER.indexOf(currentPlanKey as typeof PLAN_ORDER[number]);

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
                      <span className="text-sm font-normal text-gray-500">/mois</span>
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {plan.tryonsPerMonth === Infinity
                      ? 'Try-ons illimités'
                      : `${plan.tryonsPerMonth.toLocaleString()} try-ons/mois`}
                  </p>
                  {isCurrent ? (
                    <span className="block text-center rounded-lg bg-violet-600 text-white py-2 text-sm font-semibold">
                      Plan actuel
                    </span>
                  ) : isUpgrade ? (
                    <a
                      href={`/api/shopify/billing/subscribe?shop=${shop}&plan=${key}`}
                      className="block text-center rounded-lg bg-gray-900 text-white py-2 text-sm font-semibold hover:bg-gray-700 transition-colors"
                    >
                      Choisir {plan.label}
                    </a>
                  ) : (
                    <span className="block text-center rounded-lg border border-gray-200 text-gray-400 py-2 text-sm">
                      Plan inférieur
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-400 text-center">
          Pour configurer le widget (texte du bouton, couleur), ouvrez le Theme Editor Shopify
          et modifiez les paramètres du bloc HijabTryOn.
        </p>

      </div>
    </main>
  );
}
