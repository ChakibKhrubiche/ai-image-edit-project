// Step 2: qualify stores (small + 100% modest fashion / hijab) from their public catalog.
// Usage: node --env-file=.env scripts/outreach/2-qualify.mts --limit 10 --max-products 200
import Anthropic from "@anthropic-ai/sdk";
import { arg, fetchText, loadStores, saveStores, sleep, type Qualification, type SampleProduct } from "./lib.mts";

const limit = Number(arg("limit", "10"));
const maxProducts = Number(arg("max-products", "200"));
const MIN_MODEST_SHARE = 90;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ShopifyProduct {
  title: string;
  handle: string;
  product_type: string;
  tags: string[] | string;
  images: { src: string }[];
}

const SYSTEM = `You classify online fashion stores from a sample of their catalog.
MODEST = hijabs, scarves worn as hijab, underscarves, abayas, jilbabs, kaftans, khimars, niqabs, modest dresses/skirts/tunics/maxi dresses, prayer garments, modest sets, and small hijab accessories (pins, magnets, brooches for scarves, caps, scrunchies, hand socks).
OTHER = men's clothing, kids' clothing, non-modest fashion (shorts, mini dresses, crop tops, swimwear that is not modest), standalone jewelry, bags, shoes, beauty/makeup, home goods, prayer rugs, Quran/books, perfumes.
Respond ONLY with JSON: {"modest_share": <0-100 percent of the sample that is MODEST>, "sells_other_categories": <true if any meaningful OTHER category is sold>, "reason": "<short>"}`;

async function classify(name: string, products: ShopifyProduct[]) {
  const lines = products
    .slice(0, 40)
    .map((p) => `${p.title} | ${p.product_type} | ${Array.isArray(p.tags) ? p.tags.join(",") : p.tags}`)
    .join("\n");
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: "user", content: `Store: ${name}\nCatalog sample (title | type | tags):\n${lines}` }],
  });
  const block = res.content.find((c) => c.type === "text");
  const raw = block?.type === "text" ? block.text : "{}";
  return JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
    modest_share: number;
    sells_other_categories: boolean;
    reason: string;
  };
}

async function qualify(domain: string, name: string, spyQty: number | null): Promise<Qualification> {
  const fail = (status: Qualification["status"], reason: string, productCount: number | null = null): Qualification => ({
    status,
    reason,
    productCount,
    modestShare: null,
    sellsOther: null,
    samples: [],
  });

  if (spyQty !== null && spyQty > maxProducts * 2) return fail("rejected", `large catalog (${spyQty} products per ShopifySpy)`, spyQty);

  const res = await fetchText(`https://${domain}/products.json?limit=250`);
  if (!res.ok) return fail("rejected", `products.json unavailable (HTTP ${res.status})`);

  let products: ShopifyProduct[];
  try {
    products = (JSON.parse(res.text) as { products: ShopifyProduct[] }).products;
  } catch {
    return fail("rejected", "products.json is not valid JSON");
  }
  if (products.length === 0) return fail("rejected", "empty catalog", 0);
  if (products.length >= 250 || products.length > maxProducts) {
    return fail("rejected", `catalog too large (${products.length >= 250 ? "250+" : products.length} products)`, products.length);
  }

  const verdict = await classify(name, products);
  const samples: SampleProduct[] = products
    .filter((p) => p.images[0]?.src)
    .slice(0, 8)
    .map((p) => ({ title: p.title, handle: p.handle, image: p.images[0]!.src, productType: p.product_type }));

  const ok = verdict.modest_share >= MIN_MODEST_SHARE && !verdict.sells_other_categories;
  return {
    status: ok ? "qualified" : "rejected",
    reason: verdict.reason,
    productCount: products.length,
    modestShare: verdict.modest_share,
    sellsOther: verdict.sells_other_categories,
    samples,
  };
}

const stores = await loadStores();
const todo = stores.filter((s) => !s.qualification).slice(0, limit);
console.log(`qualifying ${todo.length} stores`);

for (const store of todo) {
  try {
    store.qualification = await qualify(store.domain, store.name, store.spyProductQuantity);
  } catch (e) {
    store.qualification = {
      status: "error",
      reason: e instanceof Error ? e.message : "unknown error",
      productCount: null,
      modestShare: null,
      sellsOther: null,
      samples: [],
    };
  }
  const q = store.qualification;
  console.log(`${q.status.padEnd(9)} ${store.domain} — ${q.reason}`);
  await saveStores(stores);
  await sleep(1500);
}
