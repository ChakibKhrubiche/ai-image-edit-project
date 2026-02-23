const BLOCKED_CATEGORIES = [
  "nudity", "nude body", "nsfw", "explicit content", "erotic",
  "sexualized", "lingerie", "bikini", "underwear", "cleavage",
  "exposed breasts", "nipples", "bare chest", "see-through clothes",
  "transparent fabric", "sensual pose", "pornographic", "adult content"
];

export async function moderateImage(base64Image: string): Promise<{
  safe: boolean;
  reason?: string;
}> {
  try {
    const response = await fetch("/api/moderate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    const data = await response.json() as { safe: boolean; reason?: string };
    return data;
  } catch {
    // En cas d'erreur, on bloque par sécurité
    return { safe: false, reason: "Content moderation check failed" };
  }
}