# DG Expert

**Your Intelligent Diesel Generator Knowledge & Troubleshooting Assistant**

DG Expert is an AI-powered technical knowledge platform for diesel generator
professionals, technicians, engineers, maintenance teams and learners. It combines
structured OEM-aware technical knowledge with an AI assistant, a troubleshooting
system, a subscription model, and a full admin knowledge-publishing workflow.

Built with **React + TypeScript + Vite + Tailwind CSS + Supabase** (Auth,
PostgreSQL, Realtime, Storage) and **Lucide** icons. The AI is called through a
**secure Supabase Edge Function** — no AI key ever touches the browser.

---

## Table of contents

1. [Install dependencies](#1-install-dependencies)
2. [Configure Supabase](#2-configure-supabase)
3. [Configure `.env`](#3-configure-env)
4. [Run the SQL script](#4-run-the-sql-script)
5. [Create the first admin](#5-create-the-first-admin)
6. [Run locally](#6-run-locally)
7. [Build for production](#7-build-for-production)
8. [Deploy](#8-deploy)
9. [Connect an AI provider](#9-connect-an-ai-provider)
10. [Configure Realtime](#10-configure-realtime)
11. [How subscriptions work](#11-how-subscriptions-work)
12. [How to add OEMs](#12-how-to-add-oems)
13. [How to publish knowledge](#13-how-to-publish-knowledge)
14. [Project structure](#project-structure)
15. [Security model](#security-model)

---

## 1. Install dependencies

Requires **Node.js 20+**.

```bash
npm install
```

## 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Publishable / anon key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
     (prefer the new `sb_publishable_...` key when available).
3. **Never** use the `service_role` key in the frontend or in `.env`.

## 3. Configure `.env`

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

`.env` is git-ignored. The app shows a clear banner if these are missing.

## 4. Run the SQL script

In the Supabase dashboard: **SQL Editor → New Query**.

1. Paste the **entire** contents of [`supabase/schema.sql`](supabase/schema.sql), then **Run**.
   This creates all tables, constraints, indexes, RLS policies, the admin-role
   helper, subscription/usage functions, and Realtime configuration.
2. Paste the contents of [`supabase/seed.sql`](supabase/seed.sql), then **Run**.
   This inserts the Free/Unlimited plans, knowledge categories, OEMs, and demo
   articles so the app isn't empty.

Both scripts are safe to run on a fresh project and are idempotent.

## 5. Create the first admin

1. **Sign up** through the app UI (`/signup`) with the email you want to be admin.
2. In **SQL Editor**, promote that user:

   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```

3. Log out and back in. You now see the **Admin** link. Admin access is enforced
   by the database (RLS `is_admin()` policies), not just the UI.

## 6. Run locally

```bash
npm run dev
```

Opens on `http://localhost:5173`.

## 7. Build for production

```bash
npm run build      # tsc typecheck + vite production build → dist/
npm run preview    # preview the production build locally
```

## 8. Deploy

The app is a static SPA — deploy the `dist/` folder to any static host
(Netlify, Vercel, Cloudflare Pages, S3+CloudFront, etc.). Set the two `VITE_*`
env variables in your host's build settings. Because it uses client-side routing,
configure a **SPA fallback** so every path serves `index.html`:

- **Netlify**: add a `_redirects` file with `/*  /index.html  200`.
- **Vercel**: framework preset "Vite" handles this automatically.

## 9. Connect an AI provider

The AI key lives **only** in the Supabase Edge Function, never in the frontend.

```bash
# Install the Supabase CLI, then from the project root:
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function:
supabase functions deploy ask-dg-expert

# Set the provider key as a secret (example: OpenAI):
supabase secrets set OPENAI_API_KEY=sk-...
```

The function ([`supabase/functions/ask-dg-expert/index.ts`](supabase/functions/ask-dg-expert/index.ts))
calls the model with a safety-first system prompt and the DG Expert answer
structure. **Until a key is set, the app still works** — it returns a structured
placeholder answer, so nothing looks broken.

**RAG-ready:** the frontend already retrieves the top matching published articles
and passes them as `context` to the function (see `src/services/ai.ts`). To make
it a full server-side RAG loop, query `knowledge_articles` inside the function
using the service role and inject the top matches before calling the model.

## 10. Configure Realtime

Realtime is enabled in `schema.sql` (it adds `knowledge_articles`,
`notifications`, and `technical_requests` to the `supabase_realtime`
publication). No extra dashboard steps are required. The frontend subscribes in
`src/services/notifications.ts`:

- Publishing an article → users browsing Knowledge get a "New technical
  information available" banner.
- Broadcasting a notification → the bell badge updates live.

## 11. How subscriptions work

- Two plans seeded: **Free** (5 AI questions/day) and **Unlimited**.
- **Limits are data, not code** — stored on the `plans` table. Change them in the
  Admin UI or via SQL; nothing is hard-coded in the frontend.
- The daily AI limit is **enforced in the database** via the
  `consume_ai_question()` function (called before every AI answer), so it can't
  be bypassed from the client.
- Subscription status is the DB's source of truth — never `localStorage`.
- **Payments** (Stripe/Razorpay) can be added later; the `subscriptions` table has
  `provider` / `provider_ref` columns ready. For now, admins set plans under
  **Admin → Subscriptions** for testing.

## 12. How to add OEMs

**Admin → OEMs → Add OEM.** No source changes needed — OEMs are database rows.
The public OEM page and troubleshooting/knowledge filters pick them up
automatically.

## 13. How to publish knowledge

This is the core workflow:

1. A user searches/troubleshoots and finds nothing → clicks **Request Technical
   Information** (Troubleshooting page). The request lands in **Admin → Technical
   Requests**.
2. Admin researches, then **Admin → Knowledge Base → Create Knowledge Article**,
   fills in title, OEM, category, problem, causes, checks, corrective action,
   safety, references.
3. Admin clicks **Save Draft** or **Publish**.
4. On **Publish**, a broadcast notification is sent via Realtime and the article
   becomes immediately searchable — no page refresh needed.

---

## Project structure

```
src/
  components/     UI primitives, guards, article views, page header
  contexts/       AuthContext (session/profile/plan), ThemeContext
  layouts/        AppLayout (user shell), AdminLayout
  lib/            supabase client
  pages/          public, auth, app and admin/* pages
  services/       data access (knowledge, subscription, ai, questions, requests, notifications, admin)
  types/          shared TypeScript types mirroring the schema
supabase/
  schema.sql      full schema: tables, RLS, admin role, subscription + usage fns, realtime
  seed.sql        plans, categories, OEMs, demo articles
  functions/
    ask-dg-expert/  secure AI edge function (RAG-ready)
```

## Security model

- **Auth**: Supabase Auth handles passwords; a trigger creates the `profiles` row
  and a Free subscription on sign-up. One account per user (1:1 with `auth.users`);
  unique constraints prevent duplicate email/phone.
- **RLS everywhere**: every table has Row Level Security. Users can only read/write
  their own private data. Admin operations are gated by the `is_admin()`
  SECURITY DEFINER function — a non-admin cannot read other users' data or elevate
  their own role (a trigger blocks self role changes).
- **No insecure `USING (true)`** on sensitive user data.
- **Limits enforced server-side** via SQL functions, not the client.
- **AI key** stays in the Edge Function; the frontend only holds the publishable key.

---

> **Disclaimer:** DG Expert provides technical information for educational and
> troubleshooting assistance. Always follow the generator manufacturer's official
> service manual, safety procedures and applicable regulations. Work on electrical,
> fuel, mechanical and high-voltage systems should be performed by appropriately
> qualified personnel.
