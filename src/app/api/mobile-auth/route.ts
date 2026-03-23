import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";

/**
 * Mobile OAuth callback endpoint.
 * Called by Better Auth after Google sign-in as the callbackURL.
 * Uses auth.api.getSession() so Better Auth resolves the correct cookie name
 * (on HTTPS/production it uses the __Secure- prefix automatically).
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (session?.session?.token) {
    return NextResponse.redirect(
      `hijabtryon://auth?token=${encodeURIComponent(session.session.token)}`,
    );
  }

  return NextResponse.redirect("hijabtryon://auth?error=authentication_failed");
}
