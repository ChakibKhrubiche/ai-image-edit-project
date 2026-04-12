import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import PaymentSuccessClient from "./PaymentSuccessClient";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; credits?: string }>;
}) {
  const params = await searchParams;
  const source = params.source ?? "web";
  const credits = parseInt(params.credits ?? "0") || 0;

  // Try to get the user's name — best effort, not required
  let userName: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    userName = session?.user?.name ?? null;
  } catch {
    // Non-critical
  }

  return (
    <PaymentSuccessClient
      credits={credits}
      source={source}
      userName={userName}
    />
  );
}
