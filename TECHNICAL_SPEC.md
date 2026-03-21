# Technical Specification — AI Hijab Virtual Try-On SaaS
## Version 1.0 — March 2026

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Technology Stack Explained](#2-technology-stack-explained)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Database Design](#4-database-design)
5. [Authentication System](#5-authentication-system)
6. [Payment & Credits System](#6-payment--credits-system)
7. [AI APIs in Detail](#7-ai-apis-in-detail)
8. [All Pages Explained](#8-all-pages-explained)
9. [All API Routes Explained](#9-all-api-routes-explained)
10. [Server Actions Explained](#10-server-actions-explained)
11. [The Image Generation Flow (Step by Step)](#11-the-image-generation-flow-step-by-step)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [UI & Styling System](#13-ui--styling-system)
14. [Security Mechanisms](#14-security-mechanisms)
15. [Mobile App — Planning Notes](#15-mobile-app--planning-notes)

---

## 1. What Is This Project?

This is a **web SaaS application** (Software as a Service — meaning a subscription-based web product) that lets users **virtually try on hijabs using AI**. Think of it like a virtual fitting room, but powered by artificial intelligence.

### How it works from a user's perspective:
1. User creates an account (or signs in with Google).
2. User receives a small number of free credits (5 by default).
3. User uploads their photo, selects a hijab style from a collection.
4. The AI generates a new image showing the user wearing that hijab.
5. User can download the result, save it, and browse past results.
6. When credits run out, the user buys more via a payment page.

### Business model:
- Free tier: 5 starter credits
- Paid credit packs: 30, 100, or 300 credits purchased via Polar (payment processor)
- Each AI generation costs 1 credit

---

## 2. Technology Stack Explained

This section explains every technology used and **why** it was chosen.

---

### 2.1 Next.js 15 (App Router)

**What it is:** Next.js is a framework built on top of React (a JavaScript library for building user interfaces). It adds many powerful features React doesn't have by itself.

**Why it's used here:**
- Lets you write both the **frontend** (what the user sees) and the **backend** (server-side logic, API routes) in one codebase.
- Uses the **App Router** — a modern routing system where each folder inside `src/app/` automatically becomes a URL path.
  - Example: `src/app/dashboard/create/page.tsx` → accessible at `/dashboard/create` in the browser.
- Supports **Server Actions** — functions that run on the server but can be called directly from frontend code.
- Supports **API Routes** — traditional server endpoints (like `/api/...`).

**Key concept — Server vs. Client components:**
- In Next.js App Router, components are **Server Components** by default (they run on the server, never sent as JavaScript to the browser).
- If a component needs browser features (events, state, effects), it adds `"use client"` at the top to run in the browser.

---

### 2.2 TypeScript

**What it is:** TypeScript is JavaScript with types. A "type" defines what kind of data a variable holds.

**Why it's used here:** Catches mistakes before the app runs. For example, if a function expects a number but gets a string, TypeScript flags it immediately in the editor.

**Example from this project:**
```typescript
// This says: imageUrl must be a string, credits must be a number
interface User {
  imageUrl: string;
  credits: number;
}
```

---

### 2.3 Tailwind CSS

**What it is:** A CSS framework where you style elements by adding short class names directly in HTML/JSX.

**Why it's used here:** Much faster to write styles than traditional CSS files. Instead of writing a CSS file, you add utility classes like `bg-purple-600 text-white rounded-lg px-4 py-2`.

**Version used:** 4.0.15 (very recent — configuration is minimal, mostly automatic).

---

### 2.4 Prisma ORM

**What it is:** Prisma is a tool that lets you interact with your PostgreSQL database using JavaScript/TypeScript objects instead of writing raw SQL.

**Why it's used here:** Instead of writing `SELECT * FROM users WHERE id = '123'`, you write `prisma.user.findUnique({ where: { id: '123' } })`.

**Key file:** `prisma/schema.prisma` — defines the database structure (tables, columns, relationships).

**How changes are applied to the database:**
```bash
npm run db:push    # Quick push (development)
npm run db:migrate # Proper migration with history (production)
```

---

### 2.5 PostgreSQL

**What it is:** A relational database (tables with rows and columns, connected by relationships).

**Why it's used here:** Stores users, sessions, projects, and credit balances. Reliable and widely supported.

**Local development:** The `start-database.sh` script starts a PostgreSQL instance using Docker.

---

### 2.6 Better Auth

**What it is:** A complete authentication library for Next.js. Handles sign-in, sign-up, sessions, OAuth (sign in with Google), etc.

**Why it's used here:** Building authentication from scratch is complex and error-prone. Better Auth handles all the hard parts (session tokens, cookie management, password hashing, OAuth handshakes).

**Integration points:**
- Backend: `src/lib/auth.js` — the server configuration
- Frontend: `src/lib/auth-client.js` — the client-side hooks
- API Route: `src/app/api/auth/[...all]/route.ts` — handles all `/api/auth/*` requests

---

### 2.7 Polar

**What it is:** A payment and subscription platform for developers. Similar to Stripe but simpler to integrate.

**Why it's used here:** Manages the purchase of credit packs. When a user pays, Polar sends a webhook (an HTTP POST notification) to the app, which adds credits to the user's account.

**Integration method:** Polar is connected as a **Better Auth plugin**, meaning it hooks into the auth system and uses the same session/user data.

---

### 2.8 WaveSpeed AI API

**What it is:** An external AI API that performs image editing using a technique called **LoRA** (Low-Rank Adaptation — a way to fine-tune an AI model for a specific task, in this case hijab fitting).

**Why it's used here:** The core feature of the app — actually placing the hijab on the user's photo.

**How it works (simplified):**
1. You send two images (user's face + hijab reference) and a text prompt to the API.
2. The API returns a job ID.
3. You poll (keep checking) that job every 5 seconds until it's done.
4. When done, you get back a URL to the generated image.

---

### 2.9 Anthropic Claude API

**What it is:** Claude is Anthropic's AI. In this project it's used only for **content moderation** (checking if uploaded images are safe/appropriate).

**Model used:** `claude-haiku-4-5-20251001` — the fast, cheap version of Claude.

**Why it's used here:** Before sending images to the AI generation API, the app needs to verify the images don't contain nudity or explicit content.

---

### 2.10 Nodemailer

**What it is:** A Node.js library for sending emails via SMTP.

**Why it's here:** Currently configured but not fully wired into user-facing features (set up for future use — e.g., welcome emails, notifications).

---

### 2.11 Radix UI / shadcn/ui Pattern

**What it is:** Radix UI provides accessible, unstyled interactive components (dialogs, tooltips, dropdowns, etc.). The project uses the shadcn/ui pattern — copying these components into `src/components/ui/` and styling them with Tailwind.

**Why it's used here:** Ready-made accessible components without opinionated styling. You own the code and can modify it.

---

### 2.12 React Hook Form

**What it is:** A library for managing form state and validation in React with minimal re-renders.

**Why it's used here:** Better Auth UI uses it internally for sign-in/sign-up forms.

---

### 2.13 Sonner

**What it is:** A toast notification library (those small pop-up messages like "Successfully saved!").

**Why it's used here:** Shows success/error messages after AI generation, saving, deleting projects, etc.

---

### 2.14 Vercel Analytics + Google Analytics

**What they are:** Tools that track how many users visit which pages, where they come from, etc.

**Why they're here:** Standard SaaS analytics to understand user behavior.

---

## 3. Project Folder Structure

```
ai-image-edit-project/
│
├── prisma/
│   ├── schema.prisma          # Database table definitions
│   └── migrations/            # History of database changes
│
├── public/
│   └── favicon.ico            # Browser tab icon
│
├── src/
│   ├── app/                   # All pages and API routes (Next.js App Router)
│   │   ├── layout.tsx         # Root HTML layout (wraps ALL pages)
│   │   ├── page.tsx           # Homepage (/)
│   │   ├── sitemap.xml/       # SEO sitemap generator
│   │   │
│   │   ├── (auth)/            # Auth pages group (parentheses = URL ignored)
│   │   │   ├── layout.tsx     # Auth-specific layout (sidebar branding)
│   │   │   └── auth/[path]/   # Dynamic route → /auth/sign-in, /auth/sign-up
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/       # Dashboard pages group
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx        # Sidebar + header for all dashboard pages
│   │   │   │   ├── page.tsx          # /dashboard — stats overview
│   │   │   │   ├── create/page.tsx   # /dashboard/create — AI try-on studio
│   │   │   │   ├── projects/page.tsx # /dashboard/projects — saved try-ons
│   │   │   │   └── settings/page.tsx # /dashboard/settings — account settings
│   │   │   └── customer-portal/
│   │   │       └── page.tsx          # /customer-portal — Polar billing portal
│   │   │
│   │   └── api/
│   │       ├── auth/[...all]/route.ts    # Better Auth handler (all /api/auth/* routes)
│   │       ├── wavespeed/
│   │       │   └── generate/route.ts    # POST /api/wavespeed/generate
│   │       └── moderate-image/route.ts  # POST /api/moderate-image
│   │
│   ├── components/
│   │   ├── ui/                # Base UI components (button, card, input, etc.)
│   │   ├── sidebar/           # Sidebar-specific components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── credits.tsx
│   │   │   ├── upgrade.tsx
│   │   │   ├── sidebar-menu-items.tsx
│   │   │   ├── breadcrumb-page-client.tsx
│   │   │   └── mobile-sidebar-close.tsx
│   │   ├── providers.tsx       # AuthUIProvider wrapper
│   │   ├── CustomerPortalRedirect.tsx
│   │   └── styles/globals.css  # Global CSS (Tailwind directives, custom vars)
│   │
│   ├── lib/
│   │   ├── auth.js             # Better Auth server config (MAIN AUTH FILE)
│   │   ├── auth-client.js      # Better Auth client-side hooks
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── polar.ts            # Polar SDK initialization
│   │   ├── content-moderation.ts # Claude moderation helper
│   │   ├── email.ts            # Nodemailer config
│   │   └── utils.ts            # cn() utility function
│   │
│   ├── server/
│   │   └── db.ts               # Database client (re-exports Prisma)
│   │
│   ├── actions/
│   │   ├── projects.tsx        # Server actions: create/read/delete projects, deduct credits
│   │   └── users.tsx           # Server actions: get user credits
│   │
│   ├── types/
│   │   └── wavespeed.ts        # TypeScript types for WaveSpeed API
│   │
│   ├── hooks/
│   │   └── use-mobile.ts       # Hook: is screen width < 768px?
│   │
│   └── env.js                  # Environment variable validation schema
│
├── .env.example                # Template for required environment variables
├── package.json                # Dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler configuration
├── next.config.js              # Next.js configuration
├── prettier.config.js          # Code formatting rules
├── postcss.config.js           # CSS processing config
└── start-database.sh           # Script to start local PostgreSQL via Docker
```

### Understanding Route Groups (parentheses in folder names)
In Next.js App Router, wrapping a folder name in `(parentheses)` creates a **route group**. This groups pages together for a shared layout **without affecting the URL**:
- `(auth)` → pages inside use the auth layout, but URLs are still `/auth/sign-in` not `/(auth)/auth/sign-in`
- `(dashboard)` → pages inside use the dashboard layout, but URLs are still `/dashboard` not `/(dashboard)/dashboard`

---

## 4. Database Design

The database is PostgreSQL, managed through Prisma. Below is every table (called a "model" in Prisma).

### 4.1 User Table

| Column | Type | Notes |
|--------|------|-------|
| id | String | Primary key, auto-generated (UUID-like) |
| name | String | Display name |
| email | String | Unique, used for login |
| emailVerified | Boolean | Default: false |
| image | String? | Profile picture URL (optional) |
| credits | Int | Default: 5. Decrements by 1 per AI generation |
| createdAt | DateTime | Auto-set on creation |
| updatedAt | DateTime | Auto-updated on change |

**Relations:** A User has many Sessions, Accounts, Projects, and Posts.

---

### 4.2 Session Table

| Column | Type | Notes |
|--------|------|-------|
| id | String | Primary key |
| expiresAt | DateTime | When the session expires |
| token | String | Unique session token (stored in cookie) |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| ipAddress | String? | Optional: user's IP |
| userAgent | String? | Optional: browser info |
| userId | String | Foreign key → User |

**Purpose:** Tracks who is logged in. Better Auth creates and manages these automatically.

---

### 4.3 Account Table

| Column | Type | Notes |
|--------|------|-------|
| id | String | Primary key |
| accountId | String | ID from OAuth provider (e.g., Google user ID) |
| providerId | String | "google", "email", etc. |
| userId | String | Foreign key → User |
| accessToken | String? | OAuth access token |
| refreshToken | String? | OAuth refresh token |
| idToken | String? | OAuth ID token |
| expiresAt | DateTime? | Token expiry |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Purpose:** Links a User to their OAuth providers (Google, etc.).

---

### 4.4 Verification Table

| Column | Type | Notes |
|--------|------|-------|
| id | String | Primary key |
| identifier | String | Usually the email address |
| value | String | Verification code/token |
| expiresAt | DateTime | When the verification expires |
| createdAt | DateTime? | |
| updatedAt | DateTime? | |

**Purpose:** Stores email verification tokens sent when a user registers.

---

### 4.5 Project Table (Most Important Custom Table)

| Column | Type | Notes |
|--------|------|-------|
| id | String | Primary key, auto-generated CUID |
| name | String? | Optional name given by user |
| imageUrl | String | URL of the AI-generated image |
| imageKitId | String | ImageKit CDN identifier |
| filePath | String | File path in ImageKit |
| userId | String | Foreign key → User (cascade delete) |
| createdAt | DateTime | Auto-set on creation |
| updatedAt | DateTime | Auto-updated |

**Purpose:** Stores each saved AI try-on result for a user.

**Cascade delete:** When a User is deleted, all their Projects are automatically deleted too.

---

### 4.6 Post Table (Legacy)

| Column | Type | Notes |
|--------|------|-------|
| id | Int | Primary key, auto-incremented |
| name | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| createdBy | User | Relation |
| createdById | String | Foreign key |

**Purpose:** Leftover from the T3 Stack template. Not actively used.

---

## 5. Authentication System

### 5.1 Overview

Authentication = the process of verifying who a user is (login/signup).

Better Auth handles this entirely. It provides:
- Email/password registration and login
- Google OAuth (sign in with Google)
- Secure session management (cookies)
- Automatic token rotation

### 5.2 Configuration (`src/lib/auth.js`)

```javascript
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: { enabled: true },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins: [
    polar({ /* Polar subscription plugin */ }),
  ],

  // When a new user signs up, give them 5 free credits
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.user.update({
            where: { id: user.id },
            data: { credits: 5 },
          });
        },
      },
    },
  },
});
```

### 5.3 How Sessions Work

1. User logs in → Better Auth creates a Session record in the database.
2. A secure HTTP-only cookie is set in the user's browser with the session token.
3. On every request, Better Auth reads the cookie, finds the Session, and knows who the user is.
4. `auth.api.getSession(request)` is called in server components/actions to get the current user.

### 5.4 Auth Pages

The dynamic route `src/app/(auth)/auth/[path]/page.tsx` renders different auth pages based on `[path]`:
- `/auth/sign-in` → sign-in form
- `/auth/sign-up` → registration form
- `/auth/forgot-password` → password reset

These pages are built using the `@daveyplate/better-auth-ui` library which auto-generates the forms.

---

## 6. Payment & Credits System

### 6.1 How Credits Work

- New users get **5 credits** on signup (via Better Auth database hook).
- Each AI image generation costs **1 credit**.
- Credits are stored as an integer in the `User.credits` database column.
- The `deductCredits()` server action decrements the value.

### 6.2 Polar Integration

Polar is the payment processor. Three credit packs are sold:

| Pack Name | Credits | Price | Polar Product ID |
|-----------|---------|-------|-----------------|
| Creator | 30 | $2.99 | b1a37096-0af7-4c9d-be68-d021df848a22 |
| Professional | 100 | $5.99 | 17a39420-9694-441a-b90a-35a76b452e51 |
| Ultimate | 300 | $14.99 | 377947ea-1265-42d1-bf11-70921c7f58d2 |

### 6.3 Purchase Flow

```
User clicks "Buy Credits"
    → authClient.checkout({ products: [{ productId: POLAR_PRODUCT_ID }] })
    → Redirect to Polar hosted checkout page
    → User pays
    → Polar sends webhook POST to /api/auth/[...all] (Better Auth handles it)
    → Better Auth Polar plugin receives "order.paid" event
    → Credits are added to user's account in database
    → User is redirected back to app
```

### 6.4 Webhook Security

Polar signs its webhooks with a secret (`POLAR_WEBHOOK_SECRET`). Better Auth verifies the signature before processing any webhook, preventing fake payment notifications.

### 6.5 Sidebar Display

The `src/components/sidebar/credits.tsx` component displays the current credit count. It fetches credits client-side and updates in real time. The `src/components/sidebar/upgrade.tsx` shows a "Add Credits" button that triggers the Polar checkout.

---

## 7. AI APIs in Detail

### 7.1 WaveSpeed AI — Image Generation

**Full endpoint:**
```
POST https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-2511-lora
```

**Authentication header:**
```
Authorization: Bearer YOUR_WAVESPEED_API_KEY
```

**Request body (JSON):**
```json
{
  "enable_base64_output": false,
  "enable_sync_mode": false,
  "images": [
    "data:image/jpeg;base64,/9j/4AAQ...",
    "data:image/jpeg;base64,/9j/4AAQ..."
  ],
  "loras": [
    {
      "path": "https://url-to-lora-weights.safetensors",
      "scale": 1.0
    }
  ],
  "output_format": "jpeg",
  "prompt": "A woman wearing a hijab, photorealistic, high quality",
  "seed": -1
}
```

**Field explanations:**
- `images[0]`: The user's face photo (base64 encoded)
- `images[1]`: The reference hijab image (base64 encoded)
- `loras`: LoRA model weights that specialize the AI for hijab placement. `scale` controls how strongly the LoRA is applied (1.0 = full strength).
- `prompt`: Text description guiding the generation
- `seed: -1`: Random seed (different result each time)
- `enable_sync_mode: false`: Don't wait for completion — use async polling
- `enable_base64_output: false`: Return image URLs, not base64

**Initial response:**
```json
{
  "data": {
    "id": "job_abc123",
    "status": "processing",
    "outputs": [],
    "urls": {
      "get": "https://api.wavespeed.ai/api/v3/predictions/job_abc123"
    }
  }
}
```

**Polling (every 5 seconds):**
```
GET https://api.wavespeed.ai/api/v3/predictions/job_abc123
Authorization: Bearer YOUR_WAVESPEED_API_KEY
```

**Polling response (when done):**
```json
{
  "data": {
    "id": "job_abc123",
    "status": "succeeded",
    "outputs": [
      "https://cdn.wavespeed.ai/outputs/generated-image.jpeg"
    ]
  }
}
```

**Possible statuses:** `processing`, `succeeded`, `failed`

**Timeout:** 60 polling attempts × 5 seconds = 5 minutes maximum wait.

---

### 7.2 Claude (Anthropic) — Content Moderation

**Purpose:** Before sending images to WaveSpeed, Claude checks if they contain inappropriate content.

**Endpoint:** Internal — `POST /api/moderate-image`

**The internal API route calls:**
```
POST https://api.anthropic.com/v1/messages
```

**Request sent to Claude:**
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 100,
  "system": "You are a strict content moderator. Analyze the image and respond with only 'SAFE' or 'UNSAFE'. Mark UNSAFE if the image contains nudity, explicit content, lingerie, bikini, or any inappropriate material. Mark SAFE for normal portraits, everyday clothing, hijab photos, and modest dress.",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "/9j/4AAQ..."
          }
        },
        {
          "type": "text",
          "text": "Is this image safe or unsafe?"
        }
      ]
    }
  ]
}
```

**Expected response:** Claude returns either `"SAFE"` or `"UNSAFE"` as text.

**What the app does:**
- `SAFE` → proceed to WaveSpeed generation
- `UNSAFE` → show error to user, stop the process

---

## 8. All Pages Explained

### 8.1 Homepage (`/`) — `src/app/page.tsx`

**Purpose:** Marketing landing page. Converts visitors to signups.

**Sections (top to bottom):**
1. **Navigation bar** — Logo, "Try It Free" button, "Sign In" link
2. **Hero section** — Big headline, subtitle, CTA buttons, sample images
3. **Features section** — 4 feature cards with icons
4. **How It Works** — 3-step numbered explanation
5. **Virtual Try-On Showcase** — Sample before/after images
6. **Pricing section** — 4 tiers with Polar checkout integration
7. **Testimonials** — User quotes
8. **FAQ section** — Common questions
9. **Final CTA** — "Get Started Free" button
10. **Footer** — Links, copyright

**Pricing tier data:**
```javascript
// Free plan uses authClient.signIn.social for Google OAuth
// Paid plans use authClient.checkout({ products: [{ productId }] })
```

---

### 8.2 Auth Pages (`/auth/sign-in`, `/auth/sign-up`)

**Layout (`src/app/(auth)/layout.tsx`):**
- Left column: App logo, tagline, decorative hijab images
- Right column: The auth form

**Forms are auto-generated by `@daveyplate/better-auth-ui`** — no manual form building needed.

---

### 8.3 Dashboard Overview (`/dashboard`)

**Purpose:** Shows the user's activity statistics and quick actions.

**Stats displayed:**
- Total Try-Ons (count of all saved projects)
- This Month (projects in current calendar month)
- This Week (projects in current calendar week)
- Member Since (formatted join date)

**Data fetching:** Uses `getUserProjects()` server action to count projects.

---

### 8.4 Create / Studio Page (`/dashboard/create`)

**Purpose:** The core feature — the AI virtual try-on interface. This is the most complex page.

**UI Sections:**

**Step 1 — Upload Your Photo:**
- Drag and drop or click to upload
- File validation (image files only, max 10MB)
- Preview of uploaded image
- Content moderation check runs automatically after upload

**Step 2 — Choose Your Hijab:**
- Grid of 6 hardcoded hijab options (images from ImageKit CDN)
- Clicking selects a hijab (highlighted border)
- Each hijab has a LoRA model URL associated with it

**Step 3 — Try On:**
- "Generate" button (disabled if no photo or hijab selected)
- Shows credit cost (1 credit per generation)
- Progress state with animated spinner
- Status message updates during generation

**Step 4 — Result Display:**
- Generated image shown
- "Download" button
- "Save to Projects" button → calls `createProject()` and `deductCredits()`
- "Try Another" button to reset

**State management (all in React useState):**
```typescript
const [uploadedImage, setUploadedImage] = useState(null)   // User's photo
const [selectedHijab, setSelectedHijab] = useState(null)    // Chosen hijab
const [generatedImage, setGeneratedImage] = useState(null)  // AI result
const [isGenerating, setIsGenerating] = useState(false)     // Loading state
const [credits, setCredits] = useState(0)                   // User credits
const [status, setStatus] = useState("")                    // Status message
```

**Hardcoded hijab collection (in the create page component):**
```javascript
const hijabCollection = [
  {
    id: "hijab-1",
    name: "Classic White",
    image: "https://ik.imagekit.io/.../hijab1.jpg",
    loraUrl: "https://...",
  },
  // ... 5 more hijabs
]
```

---

### 8.5 Projects Page (`/dashboard/projects`)

**Purpose:** Browse and manage all saved try-ons.

**Features:**
- Grid view and List view toggle
- Search by project name
- Sort by: newest, oldest, A-Z, Z-A
- Click image → full-size preview modal
- Download individual image
- Delete project (with confirmation)

**Data source:** `getUserProjects()` server action → returns all projects for logged-in user.

---

### 8.6 Settings Page (`/dashboard/settings`)

**Purpose:** Account management.

**Sections (rendered by `better-auth-ui`):**
- Account info (name, email, profile picture)
- Security (change password, connected accounts)
- Privacy information

---

### 8.7 Customer Portal (`/customer-portal`)

**Purpose:** Redirects to Polar's hosted customer portal where users manage their billing.

**How it works:**
```typescript
// The page calls Polar to generate a portal URL then redirects
authClient.customerPortal() → Polar hosted page URL → window.location.href = url
```

---

## 9. All API Routes Explained

### 9.1 `GET/POST /api/auth/[...all]`

**File:** `src/app/api/auth/[...all]/route.ts`

**What it does:** This single route handles EVERY authentication request. The `[...all]` is a catch-all — it matches any path starting with `/api/auth/`.

**Examples of what it handles:**
- `POST /api/auth/sign-in/email` — email login
- `POST /api/auth/sign-up/email` — registration
- `GET /api/auth/session` — get current session
- `POST /api/auth/sign-out` — logout
- `GET /api/auth/callback/google` — Google OAuth callback
- `POST /api/auth/polar/webhook` — Polar payment webhook

**Code:**
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

---

### 9.2 `POST /api/wavespeed/generate`

**File:** `src/app/api/wavespeed/generate/route.ts`

**What it receives (request body):**
```json
{
  "sourceImage": "data:image/jpeg;base64,...",
  "referenceImage": "data:image/jpeg;base64,...",
  "prompt": "optional custom prompt",
  "loraUrl": "https://...",
  "scale": 1.0
}
```

**What it does:**
1. Reads request body
2. Calls WaveSpeed API with the images
3. Starts polling loop (every 5 seconds, max 60 attempts)
4. Returns the generated image URL when done

**What it returns:**
```json
{
  "success": true,
  "imageUrl": "https://cdn.wavespeed.ai/outputs/result.jpeg"
}
```

**On error:**
```json
{
  "success": false,
  "error": "Image generation failed"
}
```

**Why this is an API route and not a server action:** API routes can handle long-running operations with streaming responses more cleanly. Also, it's called with `fetch()` from the client.

---

### 9.3 `POST /api/moderate-image`

**File:** `src/app/api/moderate-image/route.ts`

**What it receives:**
```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "mediaType": "image/jpeg"
}
```

**What it does:**
1. Sends image to Claude Haiku with a moderation prompt
2. Parses Claude's response (`"SAFE"` or `"UNSAFE"`)
3. Returns the result

**What it returns:**
```json
{
  "safe": true,
  "reason": "Image appears to contain appropriate content"
}
```

---

## 10. Server Actions Explained

Server Actions are a Next.js feature. They are **async functions that run on the server** but can be imported and called directly from client components. They have `"use server"` at the top.

### 10.1 `createProject()` — `src/actions/projects.tsx`

**Purpose:** Save a generated try-on image to the database.

**Input:**
```typescript
{
  name?: string,           // Optional project name
  imageUrl: string,        // URL of the generated image
  imageKitId: string,      // ImageKit CDN ID
  filePath: string,        // File path in ImageKit
}
```

**What it does:**
1. Gets current user session
2. If not logged in → throws error
3. Creates a new `Project` record linked to the user

**Returns:** The created project object.

---

### 10.2 `getUserProjects()` — `src/actions/projects.tsx`

**Purpose:** Fetch all projects for the current user.

**What it does:**
1. Gets current user session
2. Queries database: `prisma.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })`
3. Returns array of projects (newest first)

**Returns:** Array of Project objects.

---

### 10.3 `deductCredits()` — `src/actions/projects.tsx`

**Purpose:** Remove 1 credit from the user's balance after generation.

**What it does:**
1. Gets current user session
2. Updates user record: `prisma.user.update({ data: { credits: { decrement: 1 } } })`
3. Checks if credits would go below 0 → if so, throws error

**Returns:** Updated user object with new credit count.

---

### 10.4 `deleteProject(projectId)` — `src/actions/projects.tsx`

**Purpose:** Delete a project.

**Security check:** Verifies the project belongs to the current user before deleting (prevents users from deleting other users' projects).

**What it does:**
1. Gets current user session
2. Finds project, verifies `project.userId === session.user.id`
3. Deletes the project

---

### 10.5 `getUserCredits()` — `src/actions/users.tsx`

**Purpose:** Get the current user's credit balance.

**What it does:**
1. Gets current user session
2. Queries: `prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } })`
3. Returns the credits number

**Returns:** `number` (credit count)

---

## 11. The Image Generation Flow (Step by Step)

This is the complete end-to-end flow when a user clicks "Generate":

```
USER CLICKS "GENERATE"
│
▼
[Client: create/page.tsx]
│ 1. Check: is a photo uploaded? → if not, show error toast
│ 2. Check: is a hijab selected? → if not, show error toast
│ 3. Check: does user have credits? → if 0, show "buy more" message
│ 4. Set isGenerating = true, show spinner
│
▼
[Client: content moderation]
│ 5. Convert user's photo to base64
│ 6. Fetch POST /api/moderate-image with { imageBase64, mediaType }
│
▼
[Server: /api/moderate-image route]
│ 7. Send image to Claude Haiku API
│ 8. Claude analyzes the image
│ 9. Returns "SAFE" or "UNSAFE"
│
▼
[Client: check moderation result]
│ 10. If "UNSAFE" → show error "Image contains inappropriate content", stop
│ 11. If "SAFE" → continue
│
▼
[Client: image generation request]
│ 12. Convert user photo to base64 (already done)
│ 13. Convert selected hijab image to base64 (fetch it, convert)
│ 14. Fetch POST /api/wavespeed/generate with:
│     { sourceImage (base64), referenceImage (base64), loraUrl, scale, prompt }
│
▼
[Server: /api/wavespeed/generate route]
│ 15. Build WaveSpeed API request body
│ 16. POST to https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-2511-lora
│ 17. Receive { data: { id, urls: { get: pollingUrl } } }
│ 18. Start polling loop:
│     │ → Wait 5 seconds
│     │ → GET pollingUrl
│     │ → Check status:
│     │   "processing" → wait and try again (max 60 times)
│     │   "failed" → throw error
│     │   "succeeded" → break loop, get image URL from outputs[0]
│ 19. Return { success: true, imageUrl: "https://..." }
│
▼
[Client: display result]
│ 20. Set generatedImage = imageUrl
│ 21. Show the generated image to user
│ 22. Show "Download" and "Save to Projects" buttons
│
▼ (if user clicks "Save to Projects")
[Client → Server Action]
│ 23. Call createProject({ imageUrl, ... })
│ 24. Call deductCredits()
│ 25. Update displayed credit count
│ 26. Show success toast "Saved to Projects!"
│
END
```

---

## 12. Environment Variables Reference

All environment variables must be defined in a `.env` file (copy from `.env.example`). The `src/env.js` file validates them using Zod — if any required variable is missing, the app will refuse to start.

| Variable | Used In | Description | Required |
|----------|---------|-------------|----------|
| `DATABASE_URL` | Prisma | PostgreSQL connection string | YES |
| `BETTER_AUTH_SECRET` | Better Auth | Signing key for sessions (random 32+ char string) | YES |
| `BETTER_AUTH_URL` | Better Auth | Full URL of the app (server-side) | YES |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Better Auth Client | Same URL but accessible in browser | YES |
| `GOOGLE_CLIENT_ID` | Better Auth | Google OAuth app ID | YES |
| `GOOGLE_CLIENT_SECRET` | Better Auth | Google OAuth app secret | YES |
| `WAVESPEED_API_KEY` | API route | WaveSpeed AI API key | YES |
| `WAVESPEED_PROMPT` | API route | Default prompt override (optional) | NO |
| `WAVESPEED_LORA` | API route | Default LoRA URL override (optional) | NO |
| `WAVESPEED_SCALE` | API route | LoRA scale override (optional, default 1.0) | NO |
| `POLAR_ACCESS_TOKEN` | Better Auth/Polar | Polar API access token | YES |
| `POLAR_WEBHOOK_SECRET` | Better Auth/Polar | Polar webhook signing secret | YES |
| `ANTHROPIC_API_KEY` | API route | Claude API key for moderation | YES |
| `SMTP_HOST` | Email | SMTP server hostname | NO |
| `SMTP_PORT` | Email | SMTP server port | NO |
| `SMTP_USER` | Email | SMTP username | NO |
| `SMTP_PASS` | Email | SMTP password | NO |
| `NEXT_PUBLIC_APP_URL` | Analytics | Public app URL for analytics | NO |
| `NODE_ENV` | Global | "development" or "production" | NO |

**Important:** Variables starting with `NEXT_PUBLIC_` are **exposed to the browser**. Never put secrets in `NEXT_PUBLIC_` variables.

---

## 13. UI & Styling System

### 13.1 Tailwind CSS

The project uses Tailwind CSS 4 (very new). Key differences from Tailwind 3:
- No `tailwind.config.js` needed for basic setup
- CSS-first configuration (custom colors/fonts defined in CSS)
- Same utility class syntax

### 13.2 Color Scheme

The app uses purple and pink as primary brand colors:
- Primary buttons: `bg-purple-600 hover:bg-purple-700`
- Accent: `bg-pink-500`
- Gradients: `from-purple-600 to-pink-600`
- Text: `text-gray-900` (dark), `text-gray-600` (medium), `text-gray-400` (light)
- Background: `bg-gray-50` (light gray)

### 13.3 Component Architecture

Components follow the shadcn/ui pattern:
1. **Base UI components** (`src/components/ui/`) — generic, reusable (Button, Card, Input, etc.)
2. **Feature components** — specific to this app (AppSidebar, Credits, etc.)
3. **Page components** — the page files themselves

**The `cn()` utility** (in `src/lib/utils.ts`):
```typescript
// Merges Tailwind classes intelligently
// Handles conditional classes and removes duplicates
cn("px-4 py-2", condition && "bg-red-500", "px-6")
// → "py-2 bg-red-500 px-6" (px-6 overrides px-4)
```

### 13.4 Icon Library

Lucide React provides all icons:
```tsx
import { Wand2, Shield, Eye, Download } from "lucide-react"
// Usage:
<Wand2 className="w-5 h-5" />
```

### 13.5 Toast Notifications (Sonner)

```tsx
import { toast } from "sonner"

toast.success("Image saved successfully!")
toast.error("Something went wrong")
toast.loading("Generating your image...")
```

### 13.6 Responsive Design

- Mobile-first approach (styles apply to mobile, overridden for larger screens)
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Mobile sidebar handled by `use-mobile.ts` hook + Sheet component

---

## 14. Security Mechanisms

### 14.1 Content Moderation

Every user-uploaded image is analyzed by Claude before generation. This prevents:
- Explicit/NSFW content from being processed
- Potentially offensive images entering the system

### 14.2 Authentication Guards

All dashboard pages check for an active session:
```typescript
// In server components:
const session = await auth.api.getSession({ headers: request.headers });
if (!session) redirect("/auth/sign-in");
```

### 14.3 Ownership Verification

Before deleting a project, the server action verifies:
```typescript
if (project.userId !== session.user.id) {
  throw new Error("Unauthorized");
}
```

### 14.4 Credit Enforcement

Credits are checked before generation:
- Client-side: shows message if credits = 0 (UX improvement)
- Server-side: `deductCredits()` prevents credits going below 0 (actual enforcement)

### 14.5 Webhook Signature Verification

Polar webhooks are cryptographically signed. Better Auth verifies the signature using `POLAR_WEBHOOK_SECRET` before crediting any user account.

### 14.6 Environment Variable Validation

`src/env.js` uses Zod to validate all environment variables at startup. The app will not start if required secrets are missing.

### 14.7 HTTP-Only Cookies

Better Auth session tokens are stored in HTTP-only cookies (cannot be read by JavaScript in the browser), preventing XSS attacks from stealing sessions.

---

## 15. Mobile App — Planning Notes

This section documents the key information needed to build a mobile version of this app.

### 15.1 Core Features to Replicate

| Feature | Web Implementation | Mobile Notes |
|---------|-------------------|--------------|
| Authentication | Better Auth + Google OAuth | Use OAuth with PKCE flow; Better Auth has REST API |
| Image Upload | HTML file input + drag-drop | Use camera/gallery picker |
| Hijab Selection | Grid of 6 hardcoded images | Same grid, touch-optimized |
| AI Generation | Fetch to `/api/wavespeed/generate` | Same API call via HTTP |
| Content Moderation | Fetch to `/api/moderate-image` | Same API call via HTTP |
| Credits Display | React state + server action | Fetch from same server action endpoint |
| Projects Browse | Grid/List with search | Infinite scroll recommended |
| Payment | Polar checkout (web redirect) | In-App Purchase (iOS/Android) OR Polar web redirect |

### 15.2 APIs Available for Mobile

The mobile app can call these same backend endpoints (no new backend needed):

- `POST /api/wavespeed/generate` — image generation
- `POST /api/moderate-image` — content moderation
- Better Auth REST API:
  - `POST /api/auth/sign-in/email`
  - `POST /api/auth/sign-up/email`
  - `GET /api/auth/session`
  - `GET /api/auth/callback/google`
- Server actions need to be converted to API routes for mobile consumption

### 15.3 Technology Recommendation for Mobile

**React Native with Expo** is the most natural choice because:
- Same language (TypeScript/React)
- Shares business logic and API integration code
- Large ecosystem
- Fast development with Expo Go

Alternative: **Flutter** (Dart language, very performant native apps)

### 15.4 Data the App Needs

The mobile app needs these data structures from the backend:

```typescript
// User
{ id, name, email, image, credits }

// Project
{ id, name, imageUrl, createdAt }

// Generation result
{ success: boolean, imageUrl: string }

// Moderation result
{ safe: boolean, reason: string }
```

### 15.5 State Management for Mobile

Recommended approach:
- **Zustand** — simple global state (same as or similar to what works for React)
- **React Query / TanStack Query** — server state, caching, background refetch
- **AsyncStorage** — persistent local storage (for auth tokens if not using cookies)

### 15.6 Image Handling Notes

- WaveSpeed accepts base64 images — mobile apps can convert camera/gallery images to base64 natively
- Generated image URLs are temporary CDN URLs — save them to the database promptly
- For offline viewing, cache downloaded images locally on device

### 15.7 Key Differences from Web

| Aspect | Web | Mobile |
|--------|-----|--------|
| Navigation | URL-based (Next.js router) | Stack-based (React Navigation / Expo Router) |
| Image input | File input element | Camera + image picker library |
| Cookies | HTTP-only cookies (auto) | Store token in SecureStore |
| Payments | Polar web redirect | Apple/Google IAP or web redirect |
| Offline | Not supported | Consider offline mode with cached results |
| Push notifications | Browser notifications | Native push (Expo Notifications) |

---

*End of Technical Specification*

*Generated: March 2026*
*Project: AI Hijab Virtual Try-On SaaS*
*Codebase version: commit e08b616*
