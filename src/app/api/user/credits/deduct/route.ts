import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { amount?: number };
  const amount = body.amount ?? 1;

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.credits < amount) {
    return NextResponse.json(
      { error: "Insufficient credits", credits: user.credits },
      { status: 402 },
    );
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: { credits: user.credits - amount },
    select: { credits: true },
  });

  return NextResponse.json({ success: true, credits: updated.credits });
}
