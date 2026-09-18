# DG Expert — Easy Setup Guide

Follow these steps top to bottom to go from a fresh clone to a fully working app
with admin access.

---

## Step 0 — Prerequisites (one time)

- **Node.js 20 or newer** — check with `node -v`. Install from https://nodejs.org if missing.
- A free **Supabase account** — https://supabase.com

The project lives at `DG-Expert/` and dependencies are already installed.
On a fresh machine, run `npm install` inside the folder first.

---

## Step 1 — Create a Supabase project

1. Go to https://supabase.com → sign in → **New project**.
2. Name it `dg-expert`, set a database password (save it), pick a nearby region, click **Create**.
3. Wait ~2 minutes for it to provision.

---

## Step 2 — Get your two API keys

1. In your project: **Project Settings** (gear icon) → **API**.
2. Copy:
   - **Project URL** — e.g. `https://abcdefgh.supabase.co`
   - **Publishable / anon key** — the long public key (prefer `sb_publishable_...`; the `anon` JWT also works).
3. ⚠️ **Never** use the `service_role` key in the app — it bypasses all security.

---

## Step 3 — Configure `.env`

Open `DG-Expert/.env` and set both values (publishable key is already filled in;
just add the URL):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_wuc8Dcv8xcJjCdH3ARvAkg_ix_M8HD7
```

Save the file. It is git-ignored, so secrets never get committed.

---

## Step 4 — Create the database (run the SQL)

1. In Supabase: **SQL Editor** → **New query**.
2. Open `DG-Expert/supabase/schema.sql`, copy **everything**, paste, click **Run**.
   Builds all 14 tables, RLS security policies, admin-role logic, and daily-limit functions.
3. **New query** again → open `DG-Expert/supabase/seed.sql`, copy all, paste, **Run**.
   Loads the Free/Unlimited plans, 10 OEMs, categories, and 7 demo articles.

---

## Step 5 — Run the app

```bash
cd DG-Expert
npm run dev
```

Open http://localhost:5173

---

## Step 6 — Create your account

1. Click **Get Started** → **Create account**.
2. Fill in first name, last name, email, phone, password (8+ chars) → **Create account**.
3. You're logged in as a Free user and land on `/dashboard`.

> If Supabase has **Confirm email** ON (default), confirm via the email link before
> logging in. To skip for testing: Supabase → **Authentication → Providers → Email**
> → turn OFF "Confirm email".

---

## Step 7 — Make yourself an admin

1. Supabase → **SQL Editor** → **New query**.
2. Run (use your signup email):

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

3. **Log out and back in** in the app. The **Admin** link (`/admin`) now appears.
   Admin access is enforced by the database (RLS), not just the UI.

---

## Step 8 (optional) — Turn on the AI assistant

The app works without this — the assistant returns a structured placeholder until a
key is set. To connect a real AI provider:

```bash
npm i -g supabase                                # one time
supabase login
supabase link --project-ref YOUR_PROJECT_REF     # ref is in your project URL
supabase functions deploy ask-dg-expert
supabase secrets set OPENAI_API_KEY=sk-...        # stays server-side only
```

The AI key lives **only** in the Edge Function, never in the browser.

---

## Quick verification checklist

- [ ] Landing page loads at `localhost:5173`
- [ ] Sign up → redirected to `/dashboard` with "Welcome back"
- [ ] **Knowledge** page shows 7 demo articles
- [ ] **OEMs** page shows 10 brands
- [ ] After Step 7: **Admin → Knowledge Base → Create Knowledge Article → Publish** makes it appear live for users

Steps 0–7 give a fully working app (auth, dashboard, knowledge, OEMs, troubleshooting,
admin publishing, realtime). Step 8 adds the live AI.
