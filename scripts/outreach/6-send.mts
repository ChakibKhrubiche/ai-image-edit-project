// Step 6: approve and send drafts. Nothing is sent unless you pass --send (or --test).
//
//   node --env-file=.env scripts/outreach/6-send.mts                       list drafts and their status
//   node --env-file=.env scripts/outreach/6-send.mts --approve a.com,b.com  mark drafts as approved ("all" = every draft)
//   node --env-file=.env scripts/outreach/6-send.mts --test me@mail.com     send ONE test copy (first draft, or --only a.com), not recorded
//   node --env-file=.env scripts/outreach/6-send.mts --send --limit 5       send approved, unsent drafts (delay between emails)
//
// Env: OUTREACH_SMTP_HOST/PORT/USER/PASS (fallback SMTP_*), OUTREACH_SENDER_NAME, OUTREACH_FROM_EMAIL (default = SMTP user),
//      OUTREACH_REPLY_TO (optional), OUTREACH_FOOTER (required to send).
// Tip: use a dedicated mailbox/domain for cold outreach, not your app's transactional sender.
import nodemailer from "nodemailer";
import { arg, loadStores, saveStores, sleep, type Store } from "./lib.mts";

const has = (flag: string) => process.argv.includes(`--${flag}`);
const stores = await loadStores();
const drafts = stores.filter((s): s is Store & { draft: NonNullable<Store["draft"]> } => !!s.draft);

const status = (s: Store) => (s.draft!.sentAt ? "SENT    " : s.draft!.approvedAt ? "approved" : "pending ");

// --- approve ---------------------------------------------------------------
const approve = arg("approve", "");
if (approve) {
  const wanted = new Set(approve.split(",").map((d) => d.trim().toLowerCase()));
  let n = 0;
  for (const s of drafts) {
    if ((wanted.has("all") || wanted.has(s.domain)) && !s.draft.sentAt) {
      s.draft.approvedAt ??= new Date().toISOString();
      n++;
    }
  }
  await saveStores(stores);
  console.log(`approved ${n} draft(s)`);
  process.exit(0);
}

// --- list (default) --------------------------------------------------------
if (!has("send") && !arg("test", "")) {
  console.log(`${drafts.length} drafts`);
  for (const s of drafts) console.log(`${status(s)}  ${s.domain.padEnd(32)} → ${s.draft.to}  "${s.draft.subject}"`);
  process.exit(0);
}

// --- send / test -----------------------------------------------------------
const host = process.env.OUTREACH_SMTP_HOST ?? process.env.SMTP_HOST;
const port = Number(process.env.OUTREACH_SMTP_PORT ?? process.env.SMTP_PORT);
const user = process.env.OUTREACH_SMTP_USER ?? process.env.SMTP_USER;
const pass = process.env.OUTREACH_SMTP_PASS ?? process.env.SMTP_PASS;
if (!host || !port || !user || !pass) throw new Error("SMTP settings missing (OUTREACH_SMTP_* or SMTP_* in .env)");

const fromEmail = process.env.OUTREACH_FROM_EMAIL ?? user;
const fromName = process.env.OUTREACH_SENDER_NAME ?? "HijabTryOn";
if (!process.env.OUTREACH_FOOTER && !has("allow-empty-footer")) {
  throw new Error("OUTREACH_FOOTER is empty: add your identity / postal address to .env before sending.");
}

const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });

async function deliver(s: Store & { draft: NonNullable<Store["draft"]> }, to: string, subjectPrefix = "") {
  if (s.draft.html.includes('src="../')) {
    throw new Error(`${s.domain}: draft still references local images — run 4b-upload then 5-draft --redo`);
  }
  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    replyTo: process.env.OUTREACH_REPLY_TO,
    subject: subjectPrefix + s.draft.subject,
    text: s.draft.text,
    html: s.draft.html,
    headers: { "List-Unsubscribe": `<mailto:${fromEmail}?subject=stop>` },
  });
}

const testTo = arg("test", "");
if (testTo) {
  const only = arg("only", "");
  const s = drafts.find((d) => !only || d.domain === only);
  if (!s) throw new Error("no draft to test");
  await deliver(s, testTo, "[TEST] ");
  console.log(`test copy of ${s.domain} sent to ${testTo} (not recorded)`);
  process.exit(0);
}

const limit = Number(arg("limit", "5"));
const delaySec = Number(arg("delay", "90"));
const alreadyContacted = new Set(drafts.filter((d) => d.draft.sentAt).map((d) => d.draft.to.toLowerCase()));
const queue = drafts
  .filter((s) => s.draft.approvedAt && !s.draft.sentAt && !alreadyContacted.has(s.draft.to.toLowerCase()))
  .slice(0, limit);
console.log(`sending ${queue.length} approved draft(s), ~${delaySec}s apart`);

for (const [i, s] of queue.entries()) {
  try {
    await deliver(s, s.draft.to);
    s.draft.sentAt = new Date().toISOString();
    await saveStores(stores); // record right away so a crash never causes a double send
    console.log(`sent  ${s.domain} → ${s.draft.to}`);
  } catch (e) {
    console.error(`FAIL  ${s.domain}: ${e instanceof Error ? e.message : e}`);
  }
  if (i < queue.length - 1) await sleep(delaySec * 1000 * (0.7 + Math.random() * 0.6));
}
