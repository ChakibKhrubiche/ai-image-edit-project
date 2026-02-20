import { createAuthClient } from "better-auth/react";
import { env } from "process";
import { polarClient } from "@polar-sh/better-auth";


export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [polarClient()],
});

//const authClient = createAuthClient();
const signIn = async () => {
  const data = await authClient.signIn.social({
    provider: "google",
  })
  console.log("🔍 Sign-in response:", data);};

//console.log("🔍 ********************Plugins disponibles :", authClient.polar);