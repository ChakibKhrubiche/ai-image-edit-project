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

/** Limite Anthropic : 5 MB par image (taille décodée). */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Déduit le media type à partir de la signature des octets (magic bytes vus
 * depuis leur encodage base64). C'est la source de vérité : un en-tête
 * `data:` ou un `content-type` CDN peut être absent, paramétré
 * (`image/jpeg; charset=utf-8`) ou carrément faux — et Anthropic renvoie 400
 * si le `media_type` déclaré ne correspond pas aux octets envoyés.
 */
function sniffMediaType(base64: string): AnthropicMediaType | null {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp"; // RIFF....WEBP
  return null;
}

type ImageSource =
  | { type: "url"; url: string }
  | { type: "base64"; media_type: AnthropicMediaType; data: string };

/**
 * Normalise l'entrée en source d'image acceptée par l'API Messages.
 * Accepte : URL http(s), URL protocol-relative (//cdn...), data URL base64,
 * ou base64 brut sans en-tête.
 */
function buildImageSource(
  input: string,
): { source: ImageSource } | { error: string } {
  const trimmed = input.trim();

  // Cas URL : on laisse Anthropic récupérer l'image lui-même.
  if (/^https?:\/\//i.test(trimmed)) {
    return { source: { type: "url", url: trimmed } };
  }
  if (trimmed.startsWith("//")) {
    return { source: { type: "url", url: `https:${trimmed}` } };
  }

  // Cas base64 : on retire les espaces/retours ligne et l'éventuel en-tête.
  const compact = trimmed.replace(/\s/g, "");
  const dataUrl = /^data:([^;,]*)(?:;[^;,]*)*;base64,(.*)$/i.exec(compact);
  const declaredType = dataUrl ? dataUrl[1]!.toLowerCase() : null;
  const base64Data = dataUrl ? dataUrl[2]! : compact;

  if (!base64Data || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data)) {
    return {
      error:
        "Image non conforme (ni URL http(s), ni base64 valide, ni data URL base64).",
    };
  }

  // Signature d'abord, en-tête déclaré en repli.
  const mediaType =
    sniffMediaType(base64Data) ??
    (declaredType && ALLOWED_MEDIA_TYPES.has(declaredType as AnthropicMediaType)
      ? (declaredType as AnthropicMediaType)
      : null);

  if (!mediaType) {
    return {
      error: `Format d'image non supporté par Claude (déclaré : ${
        declaredType ?? "aucun"
      }, signature inconnue — jpeg/png/gif/webp attendus).`,
    };
  }

  const decodedBytes = Math.floor((base64Data.length * 3) / 4);
  if (decodedBytes > MAX_IMAGE_BYTES) {
    return {
      error: `Image trop volumineuse pour Claude (${Math.round(
        decodedBytes / 1024 / 1024,
      )} MB > 5 MB).`,
    };
  }

  return { source: { type: "base64", media_type: mediaType, data: base64Data } };
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
  const built = buildImageSource(imageBase64DataUrl);
  if ("error" in built) {
    return { category: "AMBIGUOUS", confidence: 0, reason: built.error };
  }

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
              source: built.source,
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
    console.error("[lora-classifier] classification failed", error);
    return {
      category: "AMBIGUOUS",
      confidence: 0,
      reason: `Échec de la classification Haiku : ${describeError(error)}.`,
    };
  }
}

/** Aplatit une erreur SDK Anthropic (`400 {"type":"error",...}`) en une ligne lisible. */
function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    const body = error.error as
      | { error?: { type?: string; message?: string } }
      | undefined;
    const detail = body?.error?.message ?? error.message;
    return `${error.status ?? ""} ${detail}`.trim();
  }
  return error instanceof Error ? error.message : "erreur inconnue";
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
