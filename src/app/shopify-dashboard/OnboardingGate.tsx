'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface OnboardingGateProps {
  shop: string;
  /** Deep link that pre-adds the HijabTryOn block in the Theme Editor. */
  addBlockUrl: string;
}

// Full-screen, non-dismissable onboarding gate shown until the merchant has
// added the widget. It overlays the (dimmed + blurred) dashboard so the backdrop
// reads as "the dashboard behind glass" — and because there is NO click handler
// on the backdrop, touching the transparent area never closes the window.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="p-12 space-y-7">
          {/* Logo + success badge */}
          <div className="flex flex-col items-center gap-4 text-center">
            <Image src="/logo.png" alt="HijabTryOn" width={88} height={88} className="drop-shadow-sm" />
            <div className="inline-flex items-center gap-2 text-emerald-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-base font-semibold">Installed successfully</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            You&apos;re just one step away!
          </h2>

          {/* 2-step instructions */}
          <div className="space-y-4">
            <p className="text-lg font-medium text-gray-700 text-center">
              To complete the setup:
            </p>
            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-base font-bold text-violet-700">
                  1
                </span>
                <p className="text-lg leading-relaxed text-gray-600">
                  Click the button below to open the Shopify Theme Editor with the{' '}
                  <strong>HijabTryOn</strong> block already added.
                </p>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-base font-bold text-violet-700">
                  2
                </span>
                <p className="text-lg leading-relaxed text-gray-600">
                  Click <strong>&quot;Save&quot;</strong> in the top-right corner to publish the
                  changes and enable the Try-On button on your product pages.
                </p>
              </li>
            </ol>
          </div>

          {/* Action — Shopify green */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleAdd}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#008060] px-7 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#006e52] disabled:opacity-60"
            >
              {busy ? 'Opening Theme Editor…' : 'Enable Try-On Button'}
              {!busy && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
