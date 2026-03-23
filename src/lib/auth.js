import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { sendEmail } from './email';
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
																				 
import { Polar } from "@polar-sh/sdk";
import { env } from "~/env";
import { checkout, polar, portal,usage, webhooks } from "@polar-sh/better-auth";
import { db } from "~/server/db";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,																							   
  server: "production", // Change to "production" for production environment
});

//const prisma = new PrismaClient();


console.log("🔍 Initializing Polar client with token starting with:", env.POLAR_ACCESS_TOKEN?.substring(0, 12) + "...");

export const auth = betterAuth({
  
  database: prismaAdapter(db, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your HijabTryOn email",
        text: `Hi ${user.name ?? "there"},\n\nPlease verify your email by clicking the link below:\n${url}\n\nThis link expires in 24 hours.\n\nIf you did not create an account, you can ignore this email.`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">
            <img src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771" alt="HijabTryOn" style="width:48px;height:48px;border-radius:10px;margin-bottom:16px;" />
            <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Verify your email</h2>
            <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${user.name ?? "there"}, thanks for signing up! Please confirm your email address to get started.</p>
            <a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">Verify Email</a>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">This link expires in 24 hours. If you didn't create a HijabTryOn account, you can ignore this email.</p>
          </div>
        `,
      });
    },
  },
  /*databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return { data: { ...user, credits: 5 } };
        },
      },
    },
  },*/
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    
        google: { 
            clientId: process.env.GOOGLE_CLIENT_ID ?? (() => { throw new Error("GOOGLE_CLIENT_ID is not set"); })(),
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? (() => { throw new Error("GOOGLE_CLIENT_SECRET is not set"); })(),
        }, 
    },
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          //successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          successUrl: "/dashboard",
          products: [
            {
              productId: "b1a37096-0af7-4c9d-be68-d021df848a22",
              slug: "Creator Pack 30 Credits",
            },
          ],
        }),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onOrderPaid: async (order) => {
            const externalCustomerId = order.data.customer.externalId;

            if (!externalCustomerId) {
              console.error("No external customer ID found.");
              throw new Error("No external customer id found.");
            }

            const productId = order.data.productId;

            let creditsToAdd = 0;

            switch (productId) {
              case "b1a37096-0af7-4c9d-be68-d021df848a22":
                creditsToAdd = 30;
                break;
              case "17a39420-9694-441a-b90a-35a76b452e51":
                creditsToAdd = 100;
                break;
              case "377947ea-1265-42d1-bf11-70921c7f58d2":
                creditsToAdd = 300;
                break;
                {/*
                  OLD PRODUCT IDS (to remove once migrated):
                  Small : 8c3d2346-d904-4fa8-b5f3-96a2427d134a
                  Medium : ef376a88-cb50-4ff0-8f31-2358c3ad3e2f
                  Big one : 2b81c291-b378-415a-aa64-7e8d45b7903e

                  */  }
            }

            await db.user.update({
              where: { id: externalCustomerId },
              data: {
                credits: {
                  increment: creditsToAdd,
                },
              },
            });
          },
        }),
      ],
    }),
  ],
  // Ajoute ceci :
  logger: {
    level: "debug",
  },
});
//console.log("Better Auth routes:", Object.keys(auth.context.pathMap));
console.log("*********Polar Plugin Detecté ?", auth.options.plugins.map(p => p.id));