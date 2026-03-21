import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Mobile OAuth callback endpoint.
 * Called by Better Auth after Google sign-in as the callbackURL.
 * Reads the session cookie set by Better Auth and redirects to the
 * app's deep link scheme with the token so expo-web-browser can capture it.
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("better-auth.session_token")?.value;

  if (token) {
    return NextResponse.redirect(
      `hijabtryon://auth?token=${encodeURIComponent(token)}`,
    );
  }

  return NextResponse.redirect("hijabtryon://auth?error=authentication_failed");
}
