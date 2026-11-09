// Step 4: generate try-on examples on each prospect's own products (costs WaveSpeed credits).
// Reuses the app's garment classifier and LoRA routing.
// Usage: npx tsx --tsconfig scripts/outreach/tsconfig.json --env-file=.env scripts/outreach/4-generate.mts --limit 1 --per-store 2
import Anthropic from "@anthropic-ai/sdk";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { classifyGarmentImage, resolveLoraConfig, type GarmentCategory } from "~/lib/lora-classifier";
import { arg, DATA_DIR, loadStores, saveStores, sleep, type Example, type SampleProduct } from "./lib.mts";

const limit = Number(arg("limit", "1"));
const perStore = Number(arg("per-store", "2"));
const SHOPIFY_DIR = "C:/Chakib/Perso/Coding/AI/AI_Projects/HijabTryON/Shopify";
// Bust-length model for hijab products, full-body model for garments.
const hijabModelPath = arg("model-hijab", `${SHOPIFY_DIR}/Model_Email.png`);
const garmentModelPath = arg("model-garment", `${SHOPIFY_DIR}/modele_2.png`);

// Small accessories make poor demos and their titles don't match what is shown.
const ACCESSORY = /\b(pins?|magnets?|scrunchies?|brooch(es)?|caps?|hand ?socks?|head ?socks?)\b/i;
// A store whose (non-accessory) products are mostly hijabs always uses the hijab model + hijab LoRA.
const HIJAB_PRODUCT = /\b(hijabs?|scarf|scarves|shawls?|jersey|modal|chiffon|foulard|voile|headscarf)\b/i;
const HIJAB_STORE_SHARE = 0.7;

const apiKey = process.env.WAVESPEED_API_KEY;
if (!apiKey) throw new Error("WAVESPEED_API_KEY missing (run with --env-file=.env)");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Media = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
function sniff(buf: Buffer): { media: Media; ext: string } {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { media: "image/png", ext: "png" };
  if (buf[0] === 0x52 && buf[1] === 0x49) return { media: "image/webp", ext: "webp" };
  if (buf[0] === 0x47 && buf[1] === 0x49) return { media: "image/gif", ext: "gif" };
  return { media: "image/jpeg", ext: "jpg" };
}
const dataUrl = (buf: Buffer) => `data:${sniff(buf).media};base64,${buf.toString("base64")}`;

async function fetchBuffer(url: string, width?: number): Promise<Buffer> {
  const u = new URL(url.startsWith("//") ? `https:${url}` : url);
  if (width) u.searchParams.set("width", String(width)); // keep under the 5 MB vision limit
  const res = await fetch(u, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`image HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
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
async function isSkirtOnly(product: Buffer, title: string) {
  return askJson<{ skirt_only: boolean; reason: string }>(
    `You inspect an e-commerce photo of a modest-fashion product.
Respond ONLY with JSON: {"skirt_only": <bool>, "reason": "<short>"}
skirt_only=true ONLY when the product for sale is a skirt on its own (skirt, extender skirt, underskirt shown alone, or just a bottom).
skirt_only=false for sets, outfits, dresses, tops, blouses, abayas, hijabs, or any ensemble that includes a skirt.`,
    [product],
    `Product title: ${title}`,
  );
}

// Post-generation gate: reject when the product does not appear in the result, or when a clear,
// realistic face shows (it may resemble the store's real model; our model photos have a blurred face).
async function checkResult(product: Buffer, result: Buffer, title: string) {
  return askJson<{ product_visible: boolean; face_blurred: boolean; reason: string }>(
    `Image 1 is a product photo. Image 2 is an AI try-on result of a person wearing it.
Respond ONLY with JSON: {"product_visible": <bool>, "face_blurred": <bool>, "reason": "<short>"}
product_visible=true if the main item(s) of image 1 (same colour/pattern/cut) are clearly recognisable on the person in image 2.
product_visible=false if they are absent, or replaced by clearly different items.
face_blurred=true if the face in image 2 is blurred/obscured or no face is visible.
face_blurred=false if a clear, realistic face (eyes, nose, mouth) is visible.`,
    [product, result],
    `Product title: ${title}`,
  );
}

async function generate(modelDataUrl: string, productDataUrl: string, lora: { path: string; prompt: string; scale: number }): Promise<string> {
  const create = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-2511-lora", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      enable_base64_output: false,
      enable_sync_mode: false,
      images: [modelDataUrl, productDataUrl],
      loras: [{ path: lora.path, scale: lora.scale }],
      output_format: "jpeg",
      prompt: lora.prompt,
      seed: -1,
    }),
  });
  if (create.status === 401) {
    console.error("WaveSpeed rejected the API key (401). Fix WAVESPEED_API_KEY in .env and retry.");
    process.exit(1);
  }
  if (!create.ok) throw new Error(`WaveSpeed HTTP ${create.status}`);
  const initial = (await create.json()) as { code: number; message?: string; data: { urls: { get: string } } };
  if (initial.code !== 200) throw new Error(initial.message ?? "WaveSpeed task creation failed");

  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep(5000);
    const poll = await fetch(initial.data.urls.get, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!poll.ok) throw new Error(`poll HTTP ${poll.status}`);
    const { data } = (await poll.json()) as { data: { status: string; outputs: string[]; error?: string } };
    if (data.status === "succeeded" || data.status === "completed") {
      if (!data.outputs[0]) throw new Error("no output URL");
      return data.outputs[0];
    }
    if (data.status === "failed") throw new Error(data.error ?? "generation failed");
  }
  throw new Error("timeout");
}

// Copy the model photos next to the other images so drafts can reference them.
await mkdir(join(DATA_DIR, "images", "_models"), { recursive: true });
const hijabModelRel = `images/_models/hijab-${basename(hijabModelPath)}`;
const garmentModelRel = `images/_models/garment-${basename(garmentModelPath)}`;
await copyFile(hijabModelPath, join(DATA_DIR, hijabModelRel));
await copyFile(garmentModelPath, join(DATA_DIR, garmentModelRel));
const hijabModel = dataUrl(await readFile(hijabModelPath));
const garmentModel = dataUrl(await readFile(garmentModelPath));

const stores = await loadStores();
const todo = stores
  .filter((s) => s.qualification?.status === "qualified" && s.contact?.email && !s.examples)
  .slice(0, limit);
console.log(`generating examples for ${todo.length} stores (${perStore} each)`);

for (const store of todo) {
  const examples: Example[] = [];
  const candidates: SampleProduct[] = store.qualification!.samples.filter(
    (p) => !ACCESSORY.test(`${p.title} ${p.productType} ${p.handle}`),
  );
  const hijabShare =
    candidates.length > 0
      ? candidates.filter((p) => HIJAB_PRODUCT.test(`${p.title} ${p.productType}`)).length / candidates.length
      : 0;
  const hijabStore = hijabShare >= HIJAB_STORE_SHARE;
  console.log(`${store.domain}: ${hijabStore ? "hijab store (forced hijab model + LoRA)" : "garment store"} (hijab share ${Math.round(hijabShare * 100)}%)`);

  for (const product of candidates) {
    if (examples.length >= perStore) break;
    try {
      const productBuf = await fetchBuffer(product.image, 1024);
      const productUrl = dataUrl(productBuf);

      let category: GarmentCategory;
      if (hijabStore) {
        category = "HIJAB_ONLY";
      } else {
        const skirt = await isSkirtOnly(productBuf, product.title);
        if (skirt.skirt_only) {
          console.log(`  skip ${product.handle}: skirt only (${skirt.reason})`);
          continue;
        }
        const cls = await classifyGarmentImage(productUrl, { productTitle: product.title });
        if (cls.category === "AMBIGUOUS" || cls.confidence < 0.6) {
          console.log(`  skip ${product.handle}: ${cls.category} (${cls.confidence})`);
          continue;
        }
        category = cls.category;
      }

      const isHijab = category === "HIJAB_ONLY";
      const outUrl = await generate(isHijab ? hijabModel : garmentModel, productUrl, resolveLoraConfig(category));
      const resultBuf = await fetchBuffer(outUrl);

      const check = await checkResult(productBuf, resultBuf, product.title);
      if (!check.product_visible) {
        console.log(`  reject ${product.handle}: product not visible in result (${check.reason})`);
        continue;
      }
      if (!check.face_blurred) {
        console.log(`  reject ${product.handle}: clear face visible in result`);
        continue;
      }

      const n = examples.length + 1;
      const dir = join(DATA_DIR, "images", store.domain);
      await mkdir(dir, { recursive: true });
      const productRel = `images/${store.domain}/${n}-product.${sniff(productBuf).ext}`;
      const resultRel = `images/${store.domain}/${n}.jpg`;
      await writeFile(join(DATA_DIR, productRel), productBuf);
      await writeFile(join(DATA_DIR, resultRel), resultBuf);

      examples.push({
        productTitle: product.title,
        productHandle: product.handle,
        productImage: product.image,
        category,
        imagePath: resultRel,
        productImagePath: productRel,
        modelImagePath: isHijab ? hijabModelRel : garmentModelRel,
      });
      console.log(`  ok ${store.domain}/${product.handle} [${category}]`);
    } catch (e) {
      console.log(`  fail ${product.handle}: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (examples.length > 0) {
    store.examples = examples;
    await saveStores(stores);
  }
  console.log(`${examples.length}/${perStore} examples for ${store.domain}`);
}
