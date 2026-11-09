// Step 5: write one email draft per store (HTML preview + plain text). Nothing is sent.
// Usage: node --env-file=.env scripts/outreach/5-draft.mts --limit 5
// Env (optional): OUTREACH_SENDER_NAME, OUTREACH_FOOTER (identity / postal address line)
import Anthropic from "@anthropic-ai/sdk";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { arg, DATA_DIR, loadStores, saveStores, type Store } from "./lib.mts";

const limit = Number(arg("limit", "5"));
const redo = process.argv.includes("--redo"); // rewrite drafts that were not sent yet
const INSTALL_URL = "https://apps.shopify.com/hijabtryonapp";
const SENDER = process.env.OUTREACH_SENDER_NAME ?? "Jilali";
const FOOTER = process.env.OUTREACH_FOOTER ?? "";
const FR_COUNTRIES = new Set(["FR", "BE", "CH", "LU", "MA", "DZ", "TN"]);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ShopifySpy names are often SEO titles ("Brand | Premium Hijabs &amp; Prints"): keep the brand only.
const shortName = (name: string) =>
  name
    .replace(/&amp;/g, "&")
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .split(/\s+[|–—-]\s+/)[0]!
    .trim();

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function personalize(store: Store, lang: "fr" | "en") {
  const titles = store.examples!.map((e) => e.productTitle).join(" ; ");
  const res = await anthropic.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 300,
    system: `You write the personalized parts of a short cold email from a small SaaS founder to a small modest-fashion store owner.
Rules: language=${lang === "fr" ? "French" : "English"}; warm, humble, no hype, no superlatives, no emojis, no exclamation marks; use ONLY the facts given (store name, product titles); never invent details about the store.
Respond ONLY with JSON: {"subject": "<max 8 words, mentions the store name, no spam words like free/offer/!>", "opening": "<one sentence, max 25 words, a specific genuine remark about one of the products or the store's focus>"}`,
    messages: [{ role: "user", content: `Store name: ${shortName(store.name)}\nDomain: ${store.domain}\nProducts used in the demo: ${titles}` }],
  });
  const block = res.content.find((c) => c.type === "text");
  const raw = block?.type === "text" ? block.text : "{}";
  return JSON.parse(raw.replace(/```json|```/g, "").trim()) as { subject: string; opening: string };
}

interface Copy {
  labels: { model: string; product: string; result: string };
  hi: (name: string) => string;
  intro: string;
  disclosure: string;
  offer: string;
  cta: string;
  reply: string;
  stop: string;
}

const COPY: Record<"fr" | "en", Copy> = {
  en: {
    labels: { model: "Model", product: "Your product", result: "Result" },
    hi: (n) => `Hi ${n} team,`,
    intro:
      "I'm the creator of HijabTryOn, a Shopify app that lets your customers see your hijabs and modest wear on themselves, directly on the product page. Here is how some of your own products look in the app:",
    disclosure: "(AI-generated previews on a sample model, made from your product photos.)",
    offer:
      "You can try it for 7 days free of commitment, and if you decide to keep it, your first month is 25% off. I'm offering this to a small group of early stores.",
    cta: "Install it from the Shopify App Store:",
    reply: "If you have any question or want me to set it up with you, just reply to this email.",
    stop: "If you'd rather not hear from me, reply \"stop\" and I won't write again.",
  },
  fr: {
    labels: { model: "Modèle", product: "Votre produit", result: "Résultat" },
    hi: (n) => `Bonjour l'équipe ${n},`,
    intro:
      "Je suis le créateur de HijabTryOn, une application Shopify qui permet à vos clientes de voir vos hijabs et vêtements modestes sur elles, directement sur la fiche produit. Voici ce que donnent certains de vos produits dans l'application :",
    disclosure: "(Aperçus générés par IA sur un modèle d'exemple, à partir de vos photos produit.)",
    offer:
      "Vous pouvez l'essayer 7 jours sans engagement, et si vous la gardez, votre premier mois est à -25 %. Je propose cette offre à un petit groupe de boutiques pionnières.",
    cta: "Installation depuis le Shopify App Store :",
    reply: "Pour toute question, ou si vous voulez que je vous aide à la configurer, répondez simplement à cet email.",
    stop: "Si vous ne souhaitez plus recevoir de message de ma part, répondez « stop » et je ne vous écrirai plus.",
  },
};

const stores = await loadStores();
const todo = stores
  .filter(
    (s) =>
      s.qualification?.status === "qualified" &&
      s.contact?.email &&
      (s.examples?.length ?? 0) > 0 &&
      (!s.draft || (redo && !s.draft.sentAt)),
  )
  .slice(0, limit);
console.log(`drafting ${todo.length} emails`);
if (!FOOTER) console.warn("warning: OUTREACH_FOOTER is empty — add your legal identity / postal address line before sending.");

await mkdir(join(DATA_DIR, "drafts"), { recursive: true });

for (const store of todo) {
  const lang = FR_COUNTRIES.has(store.country.toUpperCase()) ? "fr" : "en";
  const c = COPY[lang];
  const brand = shortName(store.name);
  const { subject, opening } = await personalize(store, lang);
  const examples = store.examples!;

  const text = [
    c.hi(brand),
    "",
    opening,
    "",
    c.intro,
    ...examples.map(
      (e) =>
        `- ${e.productTitle}: ${c.labels.model} (${e.urls?.model ?? e.modelImagePath}) | ${c.labels.product} (${e.urls?.product ?? e.productImagePath}) | ${c.labels.result} (${e.urls?.result ?? e.imagePath})`,
    ),
    c.disclosure,
    "",
    c.offer,
    "",
    `${c.cta} ${INSTALL_URL}`,
    "",
    c.reply,
    "",
    SENDER,
    "HijabTryOn",
    "",
    FOOTER,
    c.stop,
  ].join("\n");

  const html = `<!doctype html><html lang="${lang}"><meta charset="utf-8"><title>${esc(subject)}</title>
<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:560px;margin:24px auto">
<p style="background:#fff8e1;border:1px solid #ffe082;padding:8px;font-size:12px">DRAFT — to: ${esc(store.contact!.email!)} — subject: <b>${esc(subject)}</b></p>
<p>${esc(c.hi(brand))}</p>
<p>${esc(opening)}</p>
<p>${esc(c.intro)}</p>
${examples
  .map((e) => {
    const cell = (src: string, label: string) =>
      `<td width="33%" valign="top" style="padding:0 4px;text-align:center"><img src="${src}" alt="${esc(label)}" width="170" style="display:block;width:100%;height:auto;border-radius:6px"><span style="font-size:12px;color:#555">${esc(label)}</span></td>`;
    return `<p style="margin:14px 0 4px;font-size:13px;color:#333"><b>${esc(e.productTitle)}</b></p>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>${cell(e.urls?.model ?? `../${e.modelImagePath}`, c.labels.model)}${cell(e.urls?.product ?? `../${e.productImagePath}`, c.labels.product)}${cell(e.urls?.result ?? `../${e.imagePath}`, c.labels.result)}</tr></table>`;
  })
  .join("\n")}
<p style="font-size:12px;color:#777">${esc(c.disclosure)}</p>
<p>${esc(c.offer)}</p>
<p>${esc(c.cta)} <a href="${INSTALL_URL}">${INSTALL_URL}</a></p>
<p>${esc(c.reply)}</p>
<p>${esc(SENDER)}<br>HijabTryOn</p>
<p style="font-size:12px;color:#777">${esc(FOOTER)}<br>${esc(c.stop)}</p>
</body></html>`;

  const htmlPath = `drafts/${store.domain}.html`;
  await writeFile(join(DATA_DIR, htmlPath), html);
  store.draft = {
    to: store.contact!.email!,
    lang,
    subject,
    text,
    htmlPath,
    createdAt: new Date().toISOString(),
  };
  await saveStores(stores);
  console.log(`${store.domain} → ${store.draft.to} [${lang}] "${subject}"`);
}
