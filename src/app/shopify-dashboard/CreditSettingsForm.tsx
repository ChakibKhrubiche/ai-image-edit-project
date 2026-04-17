'use client';

import { useState } from 'react';

interface Props {
  shop: string;
  creditsPerCustomer: number;
  allowAnonymousCredits: boolean;
  minPurchaseForReset: number | null;
}

export function CreditSettingsForm({
  shop,
  creditsPerCustomer: initialCredits,
  allowAnonymousCredits: initialAnon,
  minPurchaseForReset: initialMin,
}: Props) {
  const [credits, setCredits]     = useState(initialCredits);
  const [anon, setAnon]           = useState(initialAnon);
  const [minPurchase, setMinPurchase] = useState(initialMin?.toString() ?? '');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/shopify/dashboard/credits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop,
        settings: {
          creditsPerCustomer:    credits,
          allowAnonymousCredits: anon,
          minPurchaseForReset:   minPurchase === '' ? null : parseFloat(minPurchase),
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Paramètres des crédits clients</h2>

      {/* Credits per customer */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Crédits par client</p>
          <p className="text-xs text-gray-400">Nombre de try-ons offerts à chaque client</p>
        </div>
        <input
          type="number"
          min={1}
          max={100}
          value={credits}
          onChange={(e) => setCredits(parseInt(e.target.value) || 1)}
          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Allow anonymous */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Clients anonymes</p>
          <p className="text-xs text-gray-400">Autoriser les visiteurs non connectés à utiliser leurs crédits</p>
        </div>
        <button
          onClick={() => setAnon(!anon)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${anon ? 'bg-violet-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${anon ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Min purchase */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">Montant minimum d&apos;achat</p>
          <p className="text-xs text-gray-400">Laisser vide = tout achat réinitialise les crédits</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">€</span>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={minPurchase}
            onChange={(e) => setMinPurchase(e.target.value)}
            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-violet-600 text-white py-2 text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}
      </button>
    </div>
  );
}
