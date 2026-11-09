// Step 3: find a business contact email for qualified stores (public pages only).
// Usage: node scripts/outreach/3-contacts.mts --limit 10
import { arg, fetchText, loadStores, saveStores, sleep, type Contact } from "./lib.mts";

const limit = Number(arg("limit", "10"));
const PAGES = ["/", "/pages/contact", "/pages/contact-us", "/pages/about-us", "/pages/about"];
const JUNK = /(sentry|wixpress|shopify|example|domain\.com|yourdomain|email\.com|godaddy|cloudflare|\.(png|jpe?g|webp|gif|svg|css|js)$)/i;
const GENERIC = /^(contact|hello|info|support|care|customer|service|shop|sales|team|enquir|orders|help|bonjour|salam)/i;

const rootOf = (host: string) => host.replace(/^www\./, "").split(".").slice(-2).join(".");

function score(email: string, storeRoot: string): number {
  const [local, host] = email.split("@") as [string, string];
  return (rootOf(host) === storeRoot ? 2 : 0) + (GENERIC.test(local) ? 1 : 0);
}

async function findContact(domain: string): Promise<Contact> {
  const found = new Map<string, string>(); // email -> page where found
  for (const path of PAGES) {
    const url = `https://${domain}${path}`;
    const res = await fetchText(url);
    if (res.ok) {
      const html = res.text.replace(/&#0*64;|&commat;|\[at\]/gi, "@");
      for (const m of html.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
        const email = m[0].toLowerCase();
        if (!JUNK.test(email) && !found.has(email)) found.set(email, url);
      }
    }
    await sleep(800);
  }
  const root = rootOf(domain);
  const ranked = [...found.keys()].sort((a, b) => score(b, root) - score(a, root));
  const best = ranked[0] ?? null;
  return { email: best, source: best ? found.get(best)! : null, candidates: ranked };
}

const stores = await loadStores();
const todo = stores.filter((s) => s.qualification?.status === "qualified" && !s.contact).slice(0, limit);
console.log(`finding contacts for ${todo.length} qualified stores`);

for (const store of todo) {
  store.contact = await findContact(store.domain);
  console.log(`${store.contact.email ?? "NO EMAIL".padEnd(8)}  ${store.domain}`);
  await saveStores(stores);
}
