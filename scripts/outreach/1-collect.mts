// Step 1: collect store domains from ShopifySpy's public hijab niche listing.
// Usage: node scripts/outreach/1-collect.mts --from 50 --to 52
import { arg, fetchText, loadStores, saveStores, sleep, type Store } from "./lib.mts";

const from = Number(arg("from", "1"));
const to = Number(arg("to", String(from)));

const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function parsePage(html: string): Store[] {
  const stores: Store[] = [];
  for (const row of html.matchAll(/<tr>\s*<td[^>]*>\s*\d+\s*<\/td>[\s\S]*?<\/tr>/g)) {
    const site = /SiteFilters\('[^']*','([^']+)','([^']*)'/.exec(row[0]);
    if (!site) continue;
    const cells = [...row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => strip(m[1]!));
    const qty = Number((cells[7] ?? "").replace(/[^\d]/g, ""));
    stores.push({
      domain: site[1]!.toLowerCase(),
      name: site[2]!,
      country: cells[3] ?? "",
      spyRank: Number(cells[0]),
      spyProductQuantity: qty > 0 ? qty : null,
      collectedAt: new Date().toISOString(),
    });
  }
  return stores;
}

const known = await loadStores();
const byDomain = new Map(known.map((s) => [s.domain, s]));
let added = 0;

for (let page = from; page <= to; page++) {
  const url = `https://shopifyspy.com/stores/niches/hijab/${page}?page=${page}&search_niche=hijab&orderBy=sw_rank`;
  const res = await fetchText(url);
  if (!res.ok) {
    console.error(`page ${page}: HTTP ${res.status}, skipped`);
    continue;
  }
  const found = parsePage(res.text);
  for (const s of found) {
    if (!byDomain.has(s.domain)) {
      byDomain.set(s.domain, s);
      added++;
    }
  }
  console.log(`page ${page}: ${found.length} stores`);
  await sleep(2000);
}

await saveStores([...byDomain.values()]);
console.log(`done: +${added} new, ${byDomain.size} total`);
