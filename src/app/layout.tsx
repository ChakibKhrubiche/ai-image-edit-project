import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Toaster } from "~/components/ui/sonner"

import { Analytics } from "@vercel/analytics/next"


export const metadata: Metadata = {
  title: "Hijab TryOn",
  description: "Hijab Try-On Platform",
  icons: [{ rel: "icon", url: "https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>{children}
        <Toaster />
      </body>
    </html>
  );
}
