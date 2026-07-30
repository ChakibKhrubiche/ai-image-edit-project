// src/lib/lora-classifier.ts
//
// Classifie l'image "produit" (hijab ou vêtement) d'un pipeline de virtual
// try-on via Claude Haiku 4.5 afin de router vers le bon LoRA WaveSpeed.
//
//   HIJAB_ONLY   -> LoRA spécialisé hijab (WAVESPEED_LORA)
//   GARMENT_ONLY -> LoRA modest-fashion (WAVESPEED_LORA_GARMENT)
//   MIXED        -> LoRA modest-fashion (hijab + vêtement assorti)
//   AMBIGUOUS    -> LoRA modest-fashion (fallback de sécurité)
//
// Portage TypeScript du script classify_garment_for_lora.py.

import Anthropic from "@anthropic-ai/sdk";
import { env } from "~/env";

const MODEL = "claude-haiku-4-5-20251001";

export type GarmentCategory =
  | "HIJAB_ONLY"
  | "GARMENT_ONLY"
  | "MIXED"
  | "AMBIGUOUS";

const VALID_CATEGORIES = new Set<string>([
  "HIJAB_ONLY",
  "GARMENT_ONLY",
  "MIXED",
  "AMBIGUOUS",
]);

type AnthropicMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const ALLOWED_MEDIA_TYPES = new Set<AnthropicMediaType>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface ClassificationResult {
  category: GarmentCategory;
  confidence: number;
  reason: string;
}

const SYSTEM_PROMPT = `Tu es un classificateur d'images pour un pipeline de virtual try-on de mode modeste (hijab, abaya, jilbab, burkini, etc.).

Ta seule tâche : déterminer quelle partie de la tenue est représentée dans l'image (tissu, vêtement, ou photo de personne portant l'article), afin de router vers le bon modèle de traitement en aval.

Catégories possibles (choisis-en EXACTEMENT une) :
- HIJAB_ONLY   : l'image montre uniquement un hijab / foulard / tissu ou échantillon de tissu destiné à un hijab (même sans forme, un simple swatch de texture compte comme HIJAB_ONLY si le contexte produit l'indique).
- GARMENT_ONLY : l'image montre uniquement un vêtement (robe, abaya, jilbab, burkini, tunique...) sans hijab associé.
- MIXED        : l'image montre à la fois un hijab/tissu de hijab ET un vêtement assorti (photo de tenue complète, swatch combiné montrant les deux tissus, mannequin habillé avec hijab).
- AMBIGUOUS    : tu ne peux pas déterminer la catégorie avec confiance suffisante (image trop générique, floue, ou aucun indice visuel/textuel exploitable).

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises markdown, au format exact :
{"category": "HIJAB_ONLY" | "GARMENT_ONLY" | "MIXED" | "AMBIGUOUS", "confidence": <float entre 0 et 1>, "reason": "<justification en une phrase>"}`;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Classifie une image "produit" (data URL base64) via Claude Haiku 4.5.
 *
 * En cas d'erreur (réseau, parsing, format invalide) renvoie AMBIGUOUS, ce qui
 * route vers le LoRA modest-fashion — le fallback voulu.
 */
export async function classifyGarmentImage(
  imageBase64DataUrl: string,
  opts: { productTitle?: string; productTags?: string } = {},
): Promise<ClassificationResult> {
  const matches = /^data:(.+);base64,(.+)$/.exec(imageBase64DataUrl);
  if (!matches) {
    return {
      category: "AMBIGUOUS",
      confidence: 0,
      reason: "Image non conforme (data URL base64 attendue).",
    };
  }

  const rawMediaType = matches[1]!;
  const base64Data = matches[2]!;
  const mediaType: AnthropicMediaType = ALLOWED_MEDIA_TYPES.has(
    rawMediaType as AnthropicMediaType,
  )
    ? (rawMediaType as AnthropicMediaType)
    : "image/png";

  const contextLines: string[] = [];
  if (opts.productTitle) contextLines.push(`Titre produit : ${opts.productTitle}`);
  if (opts.productTags) contextLines.push(`Tags produit : ${opts.productTags}`);
  const contextText =
    contextLines.length > 0
      ? contextLines.join("\n")
      : "Aucune métadonnée produit fournie — base-toi uniquement sur l'image.";

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: `${contextText}\n\nClassifie cette image.`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    const rawText = textBlock?.type === "text" ? textBlock.text : "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(cleaned) as {
      category?: string;
      confidence?: number;
      reason?: string;
    };
    const rawCategory = parsed.category ?? "";
    const category: GarmentCategory = VALID_CATEGORIES.has(rawCategory)
      ? (rawCategory as GarmentCategory)
      : "AMBIGUOUS";

    return {
      category,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      reason:
        typeof parsed.reason === "string"
          ? parsed.reason
          : category === "AMBIGUOUS"
            ? "Catégorie retournée invalide, marquée AMBIGUOUS par sécurité."
            : "",
    };
  } catch (error) {
    return {
      category: "AMBIGUOUS",
      confidence: 0,
      reason: `Échec de la classification Haiku : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }.`,
    };
  }
}

export interface LoraConfig {
  /** URL .safetensors du LoRA à charger. */
  path: string;
  /** Prompt WaveSpeed (contient le trigger word du LoRA). */
  prompt: string;
  /** Poids du LoRA. */
  scale: number;
}

/**
 * Mappe une catégorie vers la config WaveSpeed complète (LoRA + prompt + scale).
 * Seul HIJAB_ONLY utilise le LoRA hijab historique ; tout le reste
 * (GARMENT_ONLY, MIXED, AMBIGUOUS) utilise le LoRA modest-fashion.
 *
 * Le prompt/scale garment retombent sur les valeurs hijab si non configurés.
 */
export function resolveLoraConfig(category: GarmentCategory): LoraConfig {
  const hijabPrompt = env.WAVESPEED_PROMPT ?? "";
  const hijabScale = env.WAVESPEED_SCALE ?? 1;

  if (category === "HIJAB_ONLY") {
    return {
      path: env.WAVESPEED_LORA ?? "",
      prompt: hijabPrompt,
      scale: hijabScale,
    };
  }

  return {
    path: env.WAVESPEED_LORA_GARMENT ?? "",
    prompt: env.WAVESPEED_PROMPT_GARMENT ?? hijabPrompt,
    scale: env.WAVESPEED_SCALE_GARMENT ?? hijabScale,
  };
}
