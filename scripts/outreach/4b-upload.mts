// Step 4b: upload example images to ImageKit so emails can reference public URLs.
// Images are served resized (340px wide JPEG) through ImageKit URL transformations.
// Usage: node --env-file=.env scripts/outreach/4b-upload.mts --limit 5 [--dry-run]
// Needs IMAGEKIT_PRIVATE_KEY in .env (ImageKit dashboard > Developer options > API keys).
import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { arg, DATA_DIR, loadStores, saveStores } from "./lib.mts";

const limit = Number(arg("limit", "5"));
const dryRun = process.argv.includes("--dry-run");
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
if (!privateKey && !dryRun) throw new Error("IMAGEKIT_PRIVATE_KEY missing in .env (run with --env-file=.env)");

const CACHE_FILE = join(DATA_DIR, "uploaded.json");
const cache: Record<string, string> = await readFile(CACHE_FILE, "utf8").then(
  (t) => JSON.parse(t) as Record<string, string>,
  () => ({}),
);

// Email-sized rendition served by ImageKit; f-jpg because some mail clients don't render WebP/AVIF.
const emailSized = (url: string) => `${url}?tr=w-340,f-jpg,q-80`;

async function upload(rel: string, folder: string): Promise<string> {
  const cached = cache[rel];
  if (cached) return cached;
  if (dryRun) {
    console.log(`  [dry-run] would upload ${rel} -> ${folder}`);
    return `https://dry-run.invalid/${rel}`;
  }
  const form = new FormData();
  form.append("file", new Blob([await readFile(join(DATA_DIR, rel))]), basename(rel));
  form.append("fileName", basename(rel));
  form.append("folder", folder);
  form.append("useUniqueFileName", "false");
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`ImageKit HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { url } = (await res.json()) as { url: string };
  cache[rel] = url;
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  return url;
}

const stores = await loadStores();
const todo = stores.filter((s) => s.examples?.some((e) => !e.urls)).slice(0, limit);
console.log(`uploading images for ${todo.length} stores`);

for (const store of todo) {
  for (const e of store.examples!) {
    // ImageKit folder names only accept letters, digits, "-" and "_" (no dots).
    const folder = `/outreach/${store.domain.replace(/[^a-z0-9_-]/gi, "-")}`;
    const [model, product, result] = await Promise.all([
      upload(e.modelImagePath, "/outreach/_models"),
      upload(e.productImagePath, folder),
      upload(e.imagePath, folder),
    ]);
    e.urls = { model: emailSized(model), product: emailSized(product), result: emailSized(result) };
  }
  if (!dryRun) await saveStores(stores);
  console.log(`${store.domain}: ${store.examples!.length} examples hosted`);
}
