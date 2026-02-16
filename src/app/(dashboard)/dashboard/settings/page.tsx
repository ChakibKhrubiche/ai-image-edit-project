"use client";

import {
  RedirectToSignIn,
  SecuritySettingsCards,
  SignedIn,
} from "@daveyplate/better-auth-ui";
import { AccountSettingsCards } from "@daveyplate/better-auth-ui";
import { Loader2, Shield, User } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const checkSession = async () => {
      try {
        await authClient.getSession();
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void checkSession();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-gray-600 text-sm">
            Loading your settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        <div className="space-y-8">
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Account Settings
            </h1>
            <p className="text-gray-700 text-lg">
              Manage your account preferences, security settings, and personal information
            </p>
          </div>

          {/* Settings Sections */}
          <div className="space-y-8">
            {/* Account Settings Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200/60">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Account Information
                  </h2>
                  <p className="text-sm text-gray-600">
                    Update your personal information
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-purple-200/60 bg-white/70 backdrop-blur overflow-hidden">
                <AccountSettingsCards className="w-full [&_*]:border-purple-200/60 [&_button]:bg-gradient-to-r [&_button]:from-purple-600 [&_button]:to-pink-600 [&_button]:hover:from-purple-700 [&_button]:hover:to-pink-700 [&_button]:text-white [&_button]:shadow-md [&_button]:hover:shadow-lg" />
              </div>
            </div>

            {/* Security Settings Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/60">
                  <Shield className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Security & Privacy
                  </h2>
                  <p className="text-sm text-gray-600">
                    Manage your password, sessions, and privacy settings
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200/60 bg-white/70 backdrop-blur overflow-hidden">
                <SecuritySettingsCards className="w-full [&_*]:border-emerald-200/60 [&_button]:bg-gradient-to-r [&_button]:from-emerald-600 [&_button]:to-teal-600 [&_button]:hover:from-emerald-700 [&_button]:hover:to-teal-700 [&_button]:text-white [&_button]:shadow-md [&_button]:hover:shadow-lg" />
              </div>
            </div>

            {/* Privacy Notice Card */}
            <Card className="border-purple-200/60 bg-gradient-to-br from-purple-50/50 to-pink-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Your Privacy Matters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    At Hijab TryOn, we take your privacy seriously. Here's what you should know:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 font-bold mt-1">✓</span>
                      <span className="text-gray-700">
                        <strong>Your photos are never shared</strong> - Used only for your try-on previews
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 font-bold mt-1">✓</span>
                      <span className="text-gray-700">
                        <strong>Secure processing</strong> - End-to-end encryption for all images
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 font-bold mt-1">✓</span>
                      <span className="text-gray-700">
                        <strong>You stay in control</strong> - Delete your data anytime with one click
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 font-bold mt-1">✓</span>
                      <span className="text-gray-700">
                        <strong>No marketing</strong> - Your photos are never used for training or marketing
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Safety Tips Card */}
            <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/50 to-cyan-50/50">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Keep Your Account Secure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    Follow these best practices to keep your Hijab TryOn account safe:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold mt-1">1</span>
                      <span className="text-gray-700">
                        Use a <strong>strong, unique password</strong> (mix of letters, numbers, symbols)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold mt-1">2</span>
                      <span className="text-gray-700">
                        Enable <strong>two-factor authentication</strong> for extra security
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold mt-1">3</span>
                      <span className="text-gray-700">
                        Never share your password or verification codes with anyone
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold mt-1">4</span>
                      <span className="text-gray-700">
                        Log out of old sessions if you don't recognize them
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold mt-1">5</span>
                      <span className="text-gray-700">
                        Update your password <strong>regularly</strong> (every 3-6 months recommended)
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SignedIn>
    </>
  );
}