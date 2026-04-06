import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";

/**
 * Mobile session verification endpoint.
 * Accepts the session token via Authorization: Bearer <token> header
 * and returns the user data. This avoids React Native cookie jar issues.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(null, { status: 401 });
  }

  const token = authHeader.slice(7);

  // Build a fake request with the correct cookie header so that
  // auth.api.getSession() handles the __Secure- prefix automatically.
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-better-auth.session_token"
      : "better-auth.session_token";

  const fakeHeaders = new Headers();
  fakeHeaders.set("cookie", `${cookieName}=${token}`);

  const session = await auth.api.getSession({ headers: fakeHeaders });
  if (!session?.user) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}
