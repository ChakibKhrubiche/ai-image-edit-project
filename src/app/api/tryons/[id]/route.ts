
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { headers } from "next/headers";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const tryOnId = params.id;
    const userId = session.user.id;

    // Récupérer le try-on pour vérifier la propriété
    const tryOn = await db.project.findUnique({
      where: { id: tryOnId },
    });

    if (!tryOn) {
      return new Response(
        JSON.stringify({ error: "Try-on not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Vérifier que c'est bien l'utilisateur qui en est propriétaire
    if (tryOn.userId !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supprimer de la base de données
    await db.project.delete({
      where: { id: tryOnId },
    });

    // Optionnel: Supprimer de ImageKit aussi
    // await imagekit.deleteFile(tryOn.imageKitId);

    return new Response(
      JSON.stringify({ success: true, message: "Try-on deleted successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting try-on:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
