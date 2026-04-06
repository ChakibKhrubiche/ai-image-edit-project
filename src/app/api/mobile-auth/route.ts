import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

/**
 * Mobile OAuth callback endpoint.
 * Called by Better Auth after Google sign-in as the callbackURL.
 * Uses auth.api.getSession() so Better Auth resolves the correct cookie name
 * (on HTTPS/production it uses the __Secure- prefix automatically).
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (session?.session?.token && session?.user) {
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });
    const user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
      credits: dbUser?.credits ?? 0,
    };
    return NextResponse.redirect(
      `hijabtryon://auth?token=${encodeURIComponent(session.session.token)}&user=${encodeURIComponent(JSON.stringify(user))}`,
    );
  }

  return NextResponse.redirect("hijabtryon://auth?error=authentication_failed");
}
