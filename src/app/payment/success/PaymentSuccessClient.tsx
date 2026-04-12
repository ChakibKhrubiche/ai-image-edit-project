"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaymentSuccessClient({
  credits,
  source,
  userName,
}: {
  credits: number;
  source: string;
  userName: string | null;
}) {
  const isMobile = source === "mobile";
  const [countdown, setCountdown] = useState(isMobile ? 3 : null);

  useEffect(() => {
    if (!isMobile) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          window.location.href = "hijabtryon://payment-success";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">

        {/* Icône succès */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {userName ? `Merci, ${userName.split(" ")[0]} !` : "Merci pour votre achat !"}
        </h1>
        <p className="text-gray-500 text-sm mb-6">Votre paiement a bien été reçu</p>

        {/* Credits ajoutés */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl px-6 py-4 mb-4">
          <p className="text-sm text-purple-600 font-medium mb-1">Crédits ajoutés</p>
          <p className="text-4xl font-bold text-purple-700">+{credits}</p>
          <p className="text-xs text-purple-400 mt-1">disponibles immédiatement</p>
        </div>

        {/* Facture */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-8 text-left">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            Une <span className="font-semibold text-gray-800">facture</span> a été envoyée à votre adresse email
          </p>
        </div>

        {/* CTA */}
        {isMobile ? (
          <div className="space-y-3">
            <a
              href="hijabtryon://payment-success"
              className="block w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              Retourner à HijabTryOn
            </a>
            {countdown !== null && countdown > 0 && (
              <p className="text-xs text-gray-400">
                Retour automatique dans {countdown}s...
              </p>
            )}
          </div>
        ) : (
          <Link
            href="/dashboard"
            className="block w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            Accéder à mon dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
