// Haiku vision checks shared by 4-generate (before/after generation) and 7-audit (existing examples).
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// One-piece / hooded garments (prayer abayas, jilbabs, khimars, telekung...) are not rendered faithfully on our
// sample models (first client feedback, Ookti): skip them rather than send a misleading preview.
export const HARD_GARMENT = /\b(prayer|salah|salat|jilbabs?|jilbaab|khimars?|telekung|mukena|niqabs?|burqas?|hooded|one[- ]?piece)\b/i;

type Media = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export function sniff(buf: Buffer): { media: Media; ext: string } {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { media: "image/png", ext: "png" };
  if (buf[0] === 0x52 && buf[1] === 0x49) return { media: "image/webp", ext: "webp" };
  if (buf[0] === 0x47 && buf[1] === 0x49) return { media: "image/gif", ext: "gif" };
  return { media: "image/jpeg", ext: "jpg" };
}

async function askJson<T>(system: string, images: Buffer[], text: string): Promise<T> {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system,
    messages: [
      {
        role: "user",
        content: [
          ...images.map((b) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: sniff(b).media, data: b.toString("base64") },
          })),
          { type: "text" as const, text },
        ],
      },
    ],
  });
  const block = res.content.find((c) => c.type === "text");
  const raw = block?.type === "text" ? block.text : "{}";
  return JSON.parse(raw.replace(/```json|```/g, "").trim()) as T;
}

// Pre-generation gate: a product that is ONLY a skirt renders badly, a set that includes a skirt is fine.
export async function isSkirtOnly(product: Buffer, title: string) {
  return askJson<{ skirt_only: boolean; reason: string }>(
    `You inspect an e-commerce photo of a modest-fashion product.
Respond ONLY with JSON: {"skirt_only": <bool>, "reason": "<short>"}
skirt_only=true ONLY when the product for sale is a skirt on its own (skirt, extender skirt, underskirt shown alone, or just a bottom).
skirt_only=false for sets, outfits, dresses, tops, blouses, abayas, hijabs, or any ensemble that includes a skirt.`,
    [product],
    `Product title: ${title}`,
  );
}

// Post-generation gate: reject when the product does not appear (or is not faithful: silhouette, hood/veil, sleeves,
// colour, pattern), or when a clear realistic face shows (it may resemble the store's real model; our model photos
// have a blurred face).
export async function checkResult(product: Buffer, result: Buffer, title: string) {
  return askJson<{ product_visible: boolean; product_faithful: boolean; face_blurred: boolean; reason: string }>(
    `Image 1 is a product photo. Image 2 is an AI try-on result of a person wearing it.
Respond ONLY with JSON: {"product_visible": <bool>, "product_faithful": <bool>, "face_blurred": <bool>, "reason": "<short>"}
product_visible=true if the main item(s) of image 1 (same colour/pattern/cut) are clearly recognisable on the person in image 2.
product_visible=false if they are absent, or replaced by clearly different items.
product_faithful=true ONLY if ALL hold: same garment type and silhouette (e.g. one-piece vs open kimono/cardigan, attached hood or veil vs separate scarf, sleeve shape, length, closure), same colour, and a pattern of the same kind and scale.
product_faithful=false if any of those clearly differs (for example a plain or differently patterned garment, or a different cut), even if the colours are similar.
Judge ONLY the product named in the title. Ignore any other clothing worn with it (for a hijab, ignore the dress or abaya underneath; for an abaya, ignore the hijab). Ignore small background and pose differences.
face_blurred=true if the face in image 2 is blurred/obscured or no face is visible.
face_blurred=false if a clear, realistic face (eyes, nose, mouth) is visible.`,
    [product, result],
    `Product title: ${title}`,
  );
}
