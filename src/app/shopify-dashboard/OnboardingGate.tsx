'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingGateProps {
  shop: string;
  /** Deep link that pre-adds the HijabTryOn block in the Theme Editor. */
  addBlockUrl: string;
}

// Full-screen, non-dismissable onboarding gate shown until the merchant has
// added the widget. The dashboard is not rendered behind it.
export function OnboardingGate({ shop, addBlockUrl }: OnboardingGateProps) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const handleAdd = async () => {
    if (busy) return;
    setBusy(true);
    // Open the Theme Editor (with the block pre-added) in a new tab.
    window.open(addBlockUrl, '_blank', 'noopener,noreferrer');
    try {
      // Mark onboarding as done so the gate is not shown again.
      await fetch(`/api/shopify/widget-added?shop=${encodeURIComponent(shop)}`, {
        method: 'POST',
      });
    } catch {
      // Non-blocking — the gate will simply reappear on next load if this failed.
    }
    // Reveal the dashboard.
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="p-8 space-y-5">
          {/* Success badge */}
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-sm font-semibold">Installed successfully</span>
          </div>

          {/* Next action */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Your Store Is Almost Ready! 🎉</h2>
            <p className="text-sm leading-relaxed text-gray-600">
              Complete one final step to enable AI Virtual Try-On on your product pages.
            </p>
            <p className="text-sm leading-relaxed text-gray-600">
              Click the button below to open the Shopify Theme Editor with the{' '}
              <strong>HijabTryOn</strong> block pre-added. Just click <strong>Save</strong>,
              and your customers will instantly see the Try-On button.
            </p>
            <p className="text-sm leading-relaxed text-gray-600">
              You can customize the button&apos;s text and colors anytime from the block settings.
            </p>
          </div>

          {/* Action */}
          <div className="pt-2">
            <button
              onClick={handleAdd}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
            >
              {busy ? 'Opening Theme Editor…' : 'Add widget to product page →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
