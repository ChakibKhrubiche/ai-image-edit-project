import Anthropic from "@anthropic-ai/sdk";
import { type NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a strict content moderation system for a hijab virtual try-on app.
Your job is to block explicit/pornographic content.

Respond ONLY with JSON: {"safe": true} or {"safe": false, "reason": "brief reason"}

BLOCK the image ONLY if it clearly shows:
- Nudity or partial nudity (exposed breasts, nipples, bare chest, buttocks, genitals)
- Underwear, lingerie, bikini worn in a suggestive way
- See-through or transparent clothing revealing body parts
- Sexually suggestive or sensual poses
- Explicit, erotic, or pornographic content
- NSFW (Not Safe For Work) content
- Cleavage that is prominently displayed in a sexualized manner

ALWAYS MARK AS SAFE:
- Normal portraits and selfies (even with some skin visible like arms, neck, face)
- Women in normal clothing (dresses, t-shirts, blouses, etc.)
- Hijab photos or fabric/textile images
- Any photo that a normal person would consider appropriate for a family-friendly app

When in doubt → mark as SAFE.
Respond ONLY with the JSON, no other text.`;

async function callClaudeWithRetry(
  base64Data: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  maxRetries = 3
): Promise<{ safe: boolean; overloaded?: boolean; reason?: string }> {

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: "Analyze this image for inappropriate content.",
              },
            ],
          },
        ],
      });

      const textContent = response.content.find(c => c.type === "text");
      const resultText = textContent?.type === "text" ? textContent.text : '{"safe": true}';

      try {
        const clean = resultText.replace(/```json|```/g, "").trim();
        return JSON.parse(clean) as { safe: boolean; reason?: string };
      } catch {
        console.warn("Could not parse moderation response:", resultText);
        return { safe: true };
      }

    } catch (error: unknown) {
      const isOverloaded =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status: number }).status === 529;

      if (isOverloaded) {
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`⚠️ Claude overloaded, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Tous les retries épuisés → surcharge confirmée
        console.error("❌ Claude still overloaded after all retries.");
        return {
          safe: false,
          overloaded: true,
          reason: "Our moderation service is temporarily overloaded. Please try again in a few moments.",
        };
      }

      // Autre erreur inattendue → on laisse passer
      console.error("Unexpected moderation error:", error);
      return { safe: true };
    }
  }

  // Fallback (ne devrait pas être atteint)
  return {
    safe: false,
    overloaded: true,
    reason: "Our moderation service is temporarily overloaded. Please try again in a few moments.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { image: string };
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { safe: false, reason: "No image provided" },
        { status: 400 }
      );
    }

    const matches = /^data:(.+);base64,(.+)$/.exec(image);
    if (!matches) {
      return NextResponse.json(
        { safe: false, reason: "Invalid image format" },
        { status: 400 }
      );
    }

    const mediaType = matches[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    const base64Data = matches[2]!;

    const result = await callClaudeWithRetry(base64Data, mediaType);

    // Retourne 503 si surchargé pour que le client puisse distinguer
    if (result.overloaded) {
      return NextResponse.json(result, { status: 503 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Moderation route error:", error);
    return NextResponse.json({ safe: true });
  }
}