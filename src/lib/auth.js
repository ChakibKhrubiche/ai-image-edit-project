import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
//import { sendEmail } from './email'; // your email sending function
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
  /*emailVerification: {
        sendOnSignUp: true,
         autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            void sendEmail({
                to: user.email,
                subject: 'Verify your email address',
                text: `Click the link to verify your email: ${url}`
            })
        }
    },*/
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