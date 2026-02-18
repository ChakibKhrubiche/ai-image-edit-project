import { Polar } from "@polar-sh/sdk";

export const polarSDK = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: "production", // Change to "production" for production environment
});