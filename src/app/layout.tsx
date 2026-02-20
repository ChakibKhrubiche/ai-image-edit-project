import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Toaster } from "~/components/ui/sonner"

import { Analytics } from "@vercel/analytics/next"

import { GoogleAnalytics } from "@next/third-parties/google";


export const metadata: Metadata = {
  title: "Hijab TryOn",
  description: "Try hijab online with our advanced AI virtual try-on technology. Upload your photo and instantly see realistic previews of different hijab styles, colors, and fabrics tailored to your face and outfit",
  icons: [{ rel: "icon", url: "https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://hijabtryon.com"),

  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL ?? "https://hijabtryon.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Virtual Hijab Try-On | AI-Powered Fashion",
    description: "Try on different hijab designs with AI technology",
    type: "website",
    images: [
      {
        url: "https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771", // image 1200x630px
        width: 450,
        height: 450,
        alt: "HijabTryOn",
      },
    ],
    locale: "en_US",
  },
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
        <GoogleAnalytics gaId="G-1D068V590Z"/>
        <Toaster />
      </body>
    </html>
  );
}


