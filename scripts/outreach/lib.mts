// Shared helpers for the outreach pipeline.
// Run scripts with: node --env-file=.env scripts/outreach/<script>.mts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const USER_AGENT = "HijabTryOnBot/1.0";

export const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");
const STORES_FILE = join(DATA_DIR, "stores.json");

export interface SampleProduct {
  title: string;
  handle: string;
  image: string;
  productType: string;
}

export interface Qualification {
  status: "qualified" | "rejected" | "error";
  reason: string;
  productCount: number | null;
  modestShare: number | null;
  sellsOther: boolean | null;
  samples: SampleProduct[];
}

export interface Contact {
  email: string | null;
  source: string | null;
  candidates: string[];
}

export interface Example {
  productTitle: string;
  productHandle: string;
  productImage: string;
  category: string;
  /** Try-on result, relative to the data dir, e.g. images/shop.com/1.jpg */
  imagePath: string;
  /** Original product photo (saved locally), relative to the data dir. */
  productImagePath: string;
  /** Model photo used for this example, relative to the data dir. */
  modelImagePath: string;
  /** Public, email-sized URLs (set by 4b-upload). */
  urls?: { model: string; product: string; result: string };
}

export interface Draft {
  to: string;
  lang: "fr" | "en";
  subject: string;
  /** Plain-text body (images referenced by file name only). */
  text: string;
  /** Path of the HTML preview, relative to the data dir. */
  htmlPath: string;
  createdAt: string;
  /** Set manually after you send it, so the store is never contacted twice. */
  sentAt?: string;
}

export interface Store {
  domain: string;
  name: string;
  country: string;
  spyRank: number;
  spyProductQuantity: number | null;
  collectedAt: string;
  qualification?: Qualification;
  contact?: Contact;
  examples?: Example[];
  draft?: Draft;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchText(url: string, timeoutMs = 15000): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}

export async function loadStores(): Promise<Store[]> {
  try {
    return JSON.parse(await readFile(STORES_FILE, "utf8")) as Store[];
  } catch {
    return [];
  }
}

export async function saveStores(stores: Store[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORES_FILE, JSON.stringify(stores, null, 2));
}

export function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}
