import type { ReactNode } from "react";
import { Providers } from "~/components/providers";
import { Sparkles, Eye, Lock, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-blue-50 lg:flex lg:w-1/3">
          <div className="bg-grid-white/[0.05] absolute inset-0 bg-[size:30px_30px]" />
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
            {/* Logo */}
            <Link href="/" className="mb-12 flex items-center gap-3">
             <div className="mb-8 inline-flex items-center justify-center">
              <img
                src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                alt="Hero"
                className="w-64 h-64 object-contain"
              />
            </div>
            </Link>

            {/* Hero Content */}
            <div className="max-w-md">
              <h1 className="mb-6 text-4xl leading-tight font-bold text-gray-900 xl:text-5xl">
                Virtual Hijab Try On{" "}
                <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                  Try Different Hijab Styles
                </span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-gray-700">
                Experience a realistic virtual hijab try on powered by AI. 
                See how different hijab styles look on your face and outfits.
              </p>

              {/* Feature List 
              <div className="space-y-4">
                {[
                  {
                    icon: Eye,
                    text: "Virtual Try-On Technology",
                    color:
                      "bg-purple-100 border-purple-300/40 text-purple-600",
                  },
                  {
                    icon: Lock,
                    text: "100% Secure & Private",
                    color: "bg-emerald-100 border-emerald-300/40 text-emerald-600",
                  },
                  {
                    icon: CheckCircle2,
                    text: "Shop with Peace of Mind",
                    color:
                      "bg-pink-100 border-pink-300/40 text-pink-600",
                  },
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border backdrop-blur-sm ${feature.color}`}
                    >
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-gray-800">
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
              */}
            </div>
{/*
            //Bottom Stats 
            <div className="mt-16 grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">15K+</div>
                <div className="text-sm text-gray-600">Virtual Try-Ons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">5K+</div>
                <div className="text-sm text-gray-600">Happy Women</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">4.9★</div>
                <div className="text-sm text-gray-600">User Rating</div>
              </div>
            </div>
*/}
            {/* Trust Badge */}
            <div className="mt-12 rounded-lg border border-purple-200/60 bg-white/60 backdrop-blur p-4">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Your privacy is protected.</span> Photos are processed securely and never stored.
                </p>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 right-20 h-32 w-32 rounded-full bg-purple-200/30 blur-3xl" />
          <div className="absolute right-32 bottom-20 h-24 w-24 rounded-full bg-pink-200/25 blur-2xl" />
          <div className="absolute top-1/2 right-10 h-16 w-16 rounded-full bg-blue-200/20 blur-xl" />
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {/* Mobile Logo */}
            <div className="mb-8 text-center lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-xl font-bold text-transparent">
                  Hijab TryOn
                </span>
              </Link>
            </div>

            {/* Auth Form Container */}
            <div>{children}</div>

            {/* Footer Link */}
            <p className="mt-6 text-center text-sm text-gray-700">
              Back to{" "}
              <Link
                href="/"
                className="font-medium text-purple-600 transition-colors hover:text-purple-700"
              >
                homepage
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Providers>
  );
}
