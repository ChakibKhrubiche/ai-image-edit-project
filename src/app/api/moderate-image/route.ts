import Anthropic from "@anthropic-ai/sdk";
import { type NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, 
});



const SYSTEM_PROMPT = `You are a strict content moderation system. 
Analyze the image and respond with ONLY a JSON object in this exact format:
{"safe": true} or {"safe": false, "reason": "brief reason"}

Block the image if it contains ANY of the following:
- Nudity or partial nudity (exposed breasts, nipples, bare chest, buttocks, genitals)
- Underwear, lingerie, bikini worn in a suggestive way
- See-through or transparent clothing revealing body parts
- Sexually suggestive or sensual poses
- Explicit, erotic, or pornographic content
- NSFW (Not Safe For Work) content
- Cleavage that is prominently displayed in a sexualized manner

If the image is a normal portrait, clothed person, hijab photo, fabric/textile — mark as safe.
Respond ONLY with the JSON, no other text.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { image: string };
    const { image } = body;

    if (!image) {
      return NextResponse.json({ safe: false, reason: "No image provided" }, { status: 400 });
    }

    // Extract base64 data and media type
    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ safe: false, reason: "Invalid image format" }, { status: 400 });
    }

    const mediaType = matches[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    const base64Data = matches[2];

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // Fast & cheap for moderation
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
                data: base64Data!,
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
    const resultText = textContent?.type === "text" ? textContent.text : '{"safe": false}';
    
    const clean = resultText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean) as { safe: boolean; reason?: string };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Moderation error:", error);
    return NextResponse.json(
      { safe: false, reason: "Moderation service unavailable" },
      { status: 500 }
    );
  }
}