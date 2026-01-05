import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
																				 
import { Polar } from "@polar-sh/sdk";
import { env } from "~/env";
import { checkout, polar, portal,usage, webhooks } from "@polar-sh/better-auth";
import { db } from "~/server/db";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,																							   
  server: "sandbox",
});

const prisma = new PrismaClient();

console.log("🔍 Initializing Polar client with token starting with:", env.POLAR_ACCESS_TOKEN?.substring(0, 12) + "...");

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          successUrl: "/dashboard",
          products: [
            {
              productId: "8c3d2346-d904-4fa8-b5f3-96a2427d134a",
              slug: "Small-Pack-50-Credits",
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
              case "8c3d2346-d904-4fa8-b5f3-96a2427d134a":
                creditsToAdd = 50;
                break;
              case "ef376a88-cb50-4ff0-8f31-2358c3ad3e2f":
                creditsToAdd = 200;
                break;
              case "2b81c291-b378-415a-aa64-7e8d45b7903e":
                creditsToAdd = 400;
                break;
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