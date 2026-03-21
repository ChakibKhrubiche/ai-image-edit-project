import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
