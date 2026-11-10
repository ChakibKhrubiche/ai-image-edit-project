# Outreach pipeline

Invites small modest-fashion / hijab Shopify stores to install HijabTryOn: finds stores, checks them, finds a contact,
generates try-on examples on their own products, and writes email drafts. **Nothing is sent without `--approve` + `--send`.**

All state lives in `scripts/outreach/data/` (git-ignored: it contains prospect emails). Run from the project root,
**one script at a time** (each rewrites `stores.json`). Every step only handles what the previous one produced and skips
what is already done, so re-running is safe.

## Cycle

```
node scripts/outreach/1-collect.mts --from 40 --to 43              # ShopifySpy hijab niche, higher page = smaller stores
node --env-file=.env scripts/outreach/2-qualify.mts --limit 40     # small catalog (<=200) + >=90% modest/hijab, no other category
node scripts/outreach/3-contacts.mts --limit 20                    # email from /, /pages/contact, /pages/about...
npx tsx --tsconfig scripts/outreach/tsconfig.json --env-file=.env scripts/outreach/4-generate.mts --limit 6 --per-store 2
node --env-file=.env scripts/outreach/4b-upload.mts --limit 6      # host images on ImageKit
node --env-file=.env scripts/outreach/5-draft.mts --limit 6        # add --redo to rewrite drafts not yet sent
node --env-file=.env scripts/outreach/6-send.mts                   # list drafts + status
```

Preview a draft: open `scripts/outreach/data/drafts/<domain>.html` in a browser.

## Sending

```
node --env-file=.env scripts/outreach/6-send.mts --test you@mail.com [--only domain]   # one [TEST] copy, not recorded
node --env-file=.env scripts/outreach/6-send.mts --approve a.com,b.com                  # or --approve all
node --env-file=.env scripts/outreach/6-send.mts --send --limit 5 --delay 90            # approved + unsent only
```

Refuses to send if `OUTREACH_FOOTER` is empty, if a draft still points to local images, or if it is not approved.
`sentAt` is recorded right after each send so a store is never contacted twice. Start small (20-30 emails) from a
dedicated mailbox, and read each example image before approving: garment results are good about one time in two.

## What costs money

`2-qualify` (Claude Haiku, cents), `4-generate` (WaveSpeed credits + Haiku), `5-draft` (Claude Sonnet, cents).

## .env

`ANTHROPIC_API_KEY`, `WAVESPEED_API_KEY` (+ the LoRA variables the app already uses), `IMAGEKIT_PRIVATE_KEY`,
`OUTREACH_SENDER_NAME`, `OUTREACH_FOOTER` (legal identity / postal address), and SMTP: `OUTREACH_SMTP_HOST/PORT/USER/PASS`
(falls back to `SMTP_*`), optional `OUTREACH_FROM_EMAIL`, `OUTREACH_REPLY_TO`. See `.env.example`.

## Rules baked in

- Qualified = small catalog and >=90% hijabs/abayas/modest wear; hijab accessories (pins, magnets, scrunchies) count as modest,
  prayer rugs / home / beauty / men's / kids do not.
- Examples skip accessories and skirt-only products (a set that includes a skirt is fine); a store with mostly hijabs uses
  the bust model + hijab LoRA, otherwise the full-body model.
- A result is rejected if the product does not appear in it, or if a clear face is visible (our models have a blurred face).
- Personal-looking addresses and invalid addresses are excluded by hand (set `contact.email` to `null` in `stores.json`).
- Offer in the email: 7-day free trial, then 25% off the first month (`LAUNCH_PROMO` in `src/lib/shopify-plans.ts`).
  Install link: https://apps.shopify.com/hijabtryonapp

## Models and paths

Model photos are read from `C:/Chakib/Perso/Coding/AI/AI_Projects/HijabTryON/Shopify/` (`Model_Email.png` bust,
`modele_2.png` full body); override with `--model-hijab` / `--model-garment`.
