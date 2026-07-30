'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingModalProps {
  shop: string;
  /** Deep link that pre-adds the HijabTryOn block in the Theme Editor. */
  addBlockUrl: string;
}

export function OnboardingModal({ shop, addBlockUrl }: OnboardingModalProps) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  if (!open) return null;

  const close = () => {
    setOpen(false);
    // Strip the ?installed=1 flag so the modal doesn't reappear on refresh.
    router.replace(`/shopify-dashboard?shop=${encodeURIComponent(shop)}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

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
            <h2 id="onboarding-title" className="text-xl font-bold text-gray-900">
              Add the widget to your product page
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">
              The try-on button does not appear automatically — you need to add the{' '}
              <strong>HijabTryOn</strong> block to your product page once. Click the button
              below: the block will be pre-added in the Theme Editor. Then just click{' '}
              <strong>Save</strong> (top right). You can also customize the button text and
              color from the block settings.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <a
              href={addBlockUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Add widget to product page →
            </a>
            <button
              onClick={close}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
