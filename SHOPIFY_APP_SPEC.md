# Spécification technique — App Shopify HijabTryOn

> Rédigé le 2026-04-08 — à intégrer dans le backend Next.js existant (`ai-image-edit-project`)

---

## 1. Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────┐
│           Shopify Store (marchand)           │
│  ┌─────────────────────────────────────┐    │
│  │  Fiche produit (hijab)              │    │
│  │  [🪞 Essayer ce hijab] ← bouton     │    │
│  │         ↓                           │    │
│  │  Modal upload photo cliente         │    │
│  │         ↓                           │    │
│  │  Résultat try-on affiché            │    │
│  └─────────────────────────────────────┘    │
│         ↑ Theme Extension (JS/Liquid)        │
└──────────────────┬──────────────────────────┘
                   │ API calls
┌──────────────────▼──────────────────────────┐
│     Next.js Backend (existant + nouveau)     │
│                                              │
│  /api/shopify/auth       ← OAuth install     │
│  /api/shopify/callback   ← OAuth callback    │
│  /api/shopify/webhooks   ← Events Shopify    │
│  /api/shopify/tryon      ← Génération image  │
│  /api/shopify/billing    ← Plans & paiement  │
│  /app/shopify-dashboard  ← Embedded App UI   │
└──────────────────────────────────────────────┘
```

**Principe clé** : tout est intégré dans le backend Next.js existant. Pas de nouveau projet.

---

## 2. Prérequis

### Comptes & outils
- [ ] Compte **Shopify Partners** → partners.shopify.com (gratuit)
- [ ] Créer une **Development Store** Shopify (pour tester)
- [ ] **ngrok** pour exposer localhost pendant le dev : `ngrok http 3000`

### Nouvelles dépendances
```bash
npm install @shopify/shopify-api @shopify/shopify-app-session-storage-prisma
npm install -D @shopify/cli @shopify/theme-extension
```

### Nouvelles variables d'environnement
```env
# Shopify App
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx
SHOPIFY_SCOPES=read_products,write_script_tags
SHOPIFY_APP_URL=https://ton-domaine.com   # ou ngrok en dev
```

---

## 3. Nouveaux modèles Prisma

À ajouter dans `prisma/schema.prisma` :

```prisma
model ShopifyStore {
  id          String      @id @default(cuid())
  shop        String      @unique  // ex: ma-boutique.myshopify.com
  accessToken String
  plan        ShopifyPlan @default(STARTER)
  trialEndsAt DateTime?
  isActive    Boolean     @default(true)
  installedAt DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  billingId   String?     // ID subscription Shopify Billing

  tryonUsage  ShopifyTryonUsage[]
}

model ShopifyTryonUsage {
  id        String       @id @default(cuid())
  storeId   String
  store     ShopifyStore @relation(fields: [storeId], references: [id])
  productId String       // ID produit Shopify
  createdAt DateTime     @default(now())
}

enum ShopifyPlan {
  TRIAL
  STARTER  // 29€/mois — 200 try-ons
  GROWTH   // 79€/mois — 1 000 try-ons
  PRO      // 199€/mois — illimité
}
```

---

## 4. Structure des fichiers à créer

```
src/app/api/shopify/
├── auth/
│   └── route.ts              ← démarrage OAuth
├── callback/
│   └── route.ts              ← fin OAuth, sauvegarde token
├── webhooks/
│   └── route.ts              ← app/uninstalled, shop/update
├── tryon/
│   └── route.ts              ← endpoint principal du widget
└── billing/
    ├── subscribe/
    │   └── route.ts          ← création abonnement
    └── callback/
        └── route.ts          ← confirmation paiement

src/app/shopify-dashboard/
├── page.tsx                  ← Overview usage + plan
├── billing/
│   └── page.tsx              ← Upgrade plan
└── settings/
    └── page.tsx              ← Config widget

src/lib/
└── shopify-plans.ts          ← constantes plans & quotas

extensions/
└── hijab-tryon-widget/
    ├── assets/
    │   ├── tryon-widget.js   ← logique principale
    │   └── tryon-widget.css  ← styles du modal
    ├── blocks/
    │   └── tryon-button.liquid
    └── shopify.extension.toml
```

---

## 5. Détail des routes API

### `GET /api/shopify/auth`
Démarre le flux OAuth Shopify.
```
Entrée  : ?shop=ma-boutique.myshopify.com
Sortie  : redirect vers accounts.shopify.com/oauth/authorize
```

### `GET /api/shopify/callback`
Shopify redirige ici après autorisation du marchand.
```
Entrée  : ?code=xxx&shop=xxx&hmac=xxx
Actions :
  1. Valider le HMAC (sécurité)
  2. Échanger le code contre un accessToken
  3. Sauvegarder ShopifyStore en DB
  4. Injecter le Script Tag (widget JS) dans la boutique
  5. Démarrer la période d'essai (7 jours)
  6. Redirect vers /shopify-dashboard
```

### `POST /api/shopify/tryon`
Endpoint principal appelé par le widget sur la fiche produit.
```
Headers : X-Shop-Domain: ma-boutique.myshopify.com
Body    : {
  productImage: "base64...",   // image hijab (URL produit Shopify)
  customerPhoto: "base64..."   // photo uploadée par la cliente
}
Actions :
  1. Identifier le store via X-Shop-Domain
  2. Vérifier le plan (quota try-ons atteint ?)
  3. Modérer la photo cliente (réutilise /api/moderate-image)
  4. Appeler WaveSpeed (réutilise la logique /api/wavespeed/generate)
  5. Incrémenter ShopifyTryonUsage
  6. Retourner l'image générée
Sortie  : { success: true, imageUrl: "..." }
```

### `POST /api/shopify/webhooks`
Écoute les événements Shopify.
```
Events gérés :
  - app/uninstalled → isActive = false en DB
  - shop/update     → mettre à jour les infos store
Sécurité : validation HMAC obligatoire sur chaque requête
```

### `POST /api/shopify/billing/subscribe`
Crée un abonnement via Shopify Billing API.
```
Body   : { plan: "GROWTH" }
Sortie : { confirmationUrl: "https://..." }
         → redirect marchand vers cette URL pour confirmer le paiement
```

### `GET /api/shopify/billing/callback`
Shopify redirige ici après confirmation du paiement.
```
Actions :
  1. Vérifier le statut de l'abonnement
  2. Mettre à jour ShopifyStore.plan en DB
  3. Redirect vers /shopify-dashboard
```

---

## 6. Plans & quotas

```typescript
// src/lib/shopify-plans.ts
export const PLANS = {
  TRIAL: {
    label: "Essai gratuit",
    tryonsPerMonth: 50,
    price: 0,
    durationDays: 7,
  },
  STARTER: {
    label: "Starter",
    tryonsPerMonth: 200,
    price: 29,
  },
  GROWTH: {
    label: "Growth",
    tryonsPerMonth: 1000,
    price: 79,
  },
  PRO: {
    label: "Pro",
    tryonsPerMonth: Infinity,
    price: 199,
  },
} as const;
```

---

## 7. Theme Extension — Widget

### Comportement

```
1. Marchand active le bloc "HijabTryOn" dans le Theme Editor Shopify
   (drag & drop, no-code pour le marchand)

2. La cliente voit le bouton [🪞 Essayer ce hijab] sur la fiche produit

3. Clic → modal s'ouvre :
   - Upload photo ou prise webcam
   - Aperçu : photo cliente + image hijab sélectionné
   - Bouton "Générer" → POST /api/shopify/tryon

4. Résultat affiché dans le modal
   - Bouton "Télécharger"
   - Bouton "Partager" (Instagram, etc.)
```

### Fichiers clés

**`extensions/hijab-tryon-widget/blocks/tryon-button.liquid`**
```liquid
<div id="hijab-tryon-root"
     data-shop="{{ shop.permanent_domain }}"
     data-product-image="{{ product.featured_image | img_url: 'large' }}">
</div>
{{ 'tryon-widget.css' | asset_url | stylesheet_tag }}
{{ 'tryon-widget.js' | asset_url | script_tag }}
```

**`extensions/hijab-tryon-widget/assets/tryon-widget.js`**
Gère :
- Injection du bouton sur la page
- Ouverture du modal
- Upload / webcam
- Appel `POST /api/shopify/tryon`
- Affichage du résultat

---

## 8. Dashboard Embedded App (`/shopify-dashboard`)

### Page Overview
- Nombre de try-ons ce mois vs quota
- Graphique usage 30 derniers jours
- Plan actuel + bouton "Upgrader"
- Statut de l'essai gratuit (si applicable)

### Page Billing
- Grille des 3 plans (Starter / Growth / Pro)
- Bouton "Choisir ce plan" → appel `/api/shopify/billing/subscribe`

### Page Settings
- Texte personnalisable du bouton ("Essayer ce hijab" par défaut)
- Couleur du bouton (hex picker)
- Activer/désactiver le watermark HijabTryOn sur les résultats

---

## 9. Sécurité

| Point | Mécanisme |
|-------|-----------|
| Requêtes Shopify → backend | Validation HMAC SHA-256 |
| Widget → /api/shopify/tryon | Header `X-Shop-Domain` vérifié en DB |
| SQL injection | Prisma (ORM, requêtes paramétrées) |
| Abus try-on | Rate limit par shop + vérification quota plan |
| Photo cliente | Modération obligatoire avant génération |
| Tokens marchands | Stockés chiffrés en DB |

---

## 10. Ordre de développement

### Phase 1 — Socle OAuth (Semaine 1)
- [ ] Créer l'app sur Shopify Partners Dashboard
- [ ] Installer `@shopify/shopify-api`
- [ ] Migration Prisma (`ShopifyStore`, `ShopifyTryonUsage`, `ShopifyPlan`)
- [ ] Route `GET /api/shopify/auth`
- [ ] Route `GET /api/shopify/callback`
- [ ] Tester l'installation complète sur la dev store

### Phase 2 — Core Feature Try-On (Semaine 2 — 2.5)
- [ ] Route `POST /api/shopify/tryon` (adapte WaveSpeed existant)
- [ ] Theme extension : structure de base
- [ ] Widget : bouton sur fiche produit
- [ ] Widget : modal upload photo
- [ ] Widget : appel API + affichage résultat
- [ ] Test end-to-end sur une vraie fiche produit hijab

### Phase 3 — Monétisation (Semaine 3)
- [ ] `src/lib/shopify-plans.ts` (constantes plans)
- [ ] Route `POST /api/shopify/billing/subscribe`
- [ ] Route `GET /api/shopify/billing/callback`
- [ ] Vérification quota dans `/api/shopify/tryon`
- [ ] Page Dashboard Overview
- [ ] Page Dashboard Billing

### Phase 4 — Polish & Soumission (Semaine 4)
- [ ] Route `POST /api/shopify/webhooks` (app/uninstalled)
- [ ] Page Dashboard Settings (config widget)
- [ ] Tests multi-stores
- [ ] Listing Shopify App Store (icône, screenshots, description)
- [ ] Soumission pour review Shopify

**Durée totale estimée : 4 semaines**

---

## 11. Ce qu'il faut avant de commencer le développement

1. **Créer le compte Shopify Partners** → fournir `SHOPIFY_API_KEY` et `SHOPIFY_API_SECRET`
2. **Créer une Development Store** → fournir l'URL `xxx.myshopify.com`
3. **Installer ngrok** et fournir l'URL publique (ex: `https://abc123.ngrok.io`)
4. Confirmer l'intégration dans le **backend existant** `ai-image-edit-project`

---

## 12. Revenus projetés

| Scénario | Marchands | Plan moyen | MRR |
|----------|-----------|------------|-----|
| Conservateur | 10 | Growth 79€ | ~790€ |
| Réaliste | 30 | Growth 79€ | ~2 370€ |
| Optimiste | 100 | Mix | ~8 000€ |
