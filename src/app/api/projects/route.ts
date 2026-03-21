import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    imageUrl: string;
    imageKitId?: string;
    filePath?: string;
  };

  if (!body.imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      name: body.name ?? "Untitled Project",
      imageUrl: body.imageUrl,
      imageKitId: body.imageKitId ?? "",
      filePath: body.filePath ?? "",
      userId: session.user.id,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
