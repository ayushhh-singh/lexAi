# Nyay Sahayak — AI Legal Assistant for Indian Lawyers

AI-powered legal assistant for Indian lawyers. Research case law, draft court documents, analyze legal files, manage cases, and track deadlines — all powered by Claude and built for Indian courts.

---

## Local Setup (Step by Step)

### Prerequisites

- **Node.js 18+** — check: `node -v`
- **npm 9+** — check: `npm -v`
- **Docker Desktop** — download from [docker.com](https://www.docker.com/products/docker-desktop/)

### Step 1 — Clone and Install

```bash
git clone <repo-url>
cd nyay-sahayak
npm install
```

### Step 2 — Open Docker Desktop

Open Docker Desktop from your Applications folder (Mac) or Start Menu (Windows). Wait until the whale icon shows "Docker Desktop is running".

Verify:
```bash
docker info | head -3
```

### Step 3 — Start Supabase

```bash
npx supabase start
```

First run takes 2-3 minutes (downloads Docker images). When done it prints:

```
Studio:       http://127.0.0.1:54323
Mailpit:      http://127.0.0.1:54324
Project URL:  http://127.0.0.1:54321
Publishable:  sb_publishable_xxxxx
Secret:       sb_secret_xxxxx
```

This automatically runs all migrations and creates the storage bucket.

### Step 4 — Set Up Environment Variables

```bash
cp packages/server/.env.example packages/server/.env
cp packages/client/.env.example packages/client/.env
```

Edit **`packages/server/.env`**:
```env
PORT=3001
CLIENT_URL=http://localhost:5173
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<Secret key from Step 3>
ANTHROPIC_API_KEY=<your Anthropic API key>
OPENAI_API_KEY=<your OpenAI API key>
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
BETA_MODE=false
SHOW_PRICING=true
ENFORCE_CREDITS=false
```

Edit **`packages/client/.env`**:
```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<Publishable key from Step 3>
VITE_SHOW_PRICING=true
VITE_BETA_MODE=false
VITE_ENFORCE_CREDITS=false
VITE_SHOW_UPGRADE_PROMPTS=true
```

> **Note:** The default local Supabase keys are the same every time. If you haven't changed them, the `.env` files already have the correct values.

### Step 5 — Build Shared Package

```bash
npm run build:shared
```

This must run before client or server can start (they import from `@nyay/shared`).

### Step 6 — Seed the Knowledge Base

This populates the database with Indian legal content for RAG search.

**Option A — Quick seed (3 acts, ~14 sections, faster):**
```bash
cd packages/server
npx tsx scripts/seed-sample-acts.ts
cd ../..
```

**Option B — Full seed (16 acts, comprehensive):**
```bash
cd packages/server
npx tsx scripts/generate-bare-acts.ts    # Generate act text files via GPT
npx tsx scripts/seed-knowledge-base.ts   # Chunk, embed, store in DB
cd ../..
```

Both options require your OpenAI API key (for embeddings). Option B also generates text files using GPT-4o-mini.

### Step 7 — Start the App

```bash
npm run dev
```

This starts both servers concurrently:
- **App:** http://localhost:5173
- **API:** http://localhost:3001
- **DB Studio:** http://127.0.0.1:54323
- **Emails:** http://127.0.0.1:54324

### Step 8 — Create Your Account

1. Go to http://localhost:5173/signup
2. Fill in all fields (name, email, phone, password, bar council ID, practice areas, city, state)
3. Submit the form
4. Open http://127.0.0.1:54324 (Mailpit/Inbucket) — find the confirmation email
5. Click the confirm link in the email
6. Complete the onboarding flow
7. You're in!

> **Password vs OTP:** If you sign up via `/signup`, you can login with email+password. If you sign in via OTP, you must always use OTP (no password is set).

---

## Daily Development

After the first setup, your daily workflow is:

```bash
# 1. Open Docker Desktop (wait for it to start)
# 2. Start Supabase
npx supabase start

# 3. Start the app
npm run dev
```

Stop everything:
```bash
# Ctrl+C to stop dev servers
npx supabase stop
```

---

## Commands Reference

| Command | Where to run | What it does |
|---------|-------------|-------------|
| `npm install` | root | Install all dependencies |
| `npm run build:shared` | root | Build shared package (run after changes to `packages/shared/`) |
| `npm run dev` | root | Start client (5173) + server (3001) |
| `npm run dev:client` | root | Start client only |
| `npm run dev:server` | root | Start server only |
| `npx supabase start` | root | Start local Supabase (needs Docker) |
| `npx supabase stop` | root | Stop local Supabase |
| `npx supabase status` | root | Show URLs, keys, ports |
| `npx supabase db reset` | root | Wipe DB + re-run all migrations + seed |
| `npx tsx scripts/seed-sample-acts.ts` | `packages/server` | Quick seed (3 acts, dev) |
| `npx tsx scripts/generate-bare-acts.ts` | `packages/server` | Generate all 16 act text files via GPT |
| `npx tsx scripts/seed-knowledge-base.ts` | `packages/server` | Full seed (16 acts, prod) |
| `npx tsx scripts/upload-skills.ts upload --all` | `packages/server` | Upload Claude Skills |
| `npx tsx scripts/upload-skills.ts list` | `packages/server` | List uploaded skills |

---

## Real Email Setup (Optional)

By default, emails go to **Mailpit** at http://127.0.0.1:54324. To send real emails:

Set these env vars **before** running `npx supabase start`:

```bash
# Gmail example (use App Password from myaccount.google.com > Security > App Passwords)
export SMTP_HOST=smtp.gmail.com
export SMTP_USER=your@gmail.com
export SMTP_PASS=your_app_password
export SMTP_ADMIN_EMAIL=your@gmail.com

# Restart Supabase to pick up SMTP
npx supabase stop && npx supabase start
```

Other providers: Resend (`smtp.resend.com`), Brevo (`smtp-relay.brevo.com`).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite, Zustand, React Router v6 |
| Backend | Express.js, TypeScript |
| Database | Supabase (PostgreSQL + pgvector) |
| AI Chat | Claude Sonnet 4.5 (Anthropic SDK), streaming via SSE |
| Embeddings | OpenAI `text-embedding-3-small` |
| Document Gen | Claude Skills API + `code_execution` |
| Payments | Razorpay |
| Fonts | DM Sans, Source Serif 4, JetBrains Mono |
| Deploy | Vercel (client) + Railway (server) + Supabase Cloud |

---

## Project Structure

```
nyay-sahayak/
├── packages/
│   ├── client/                 # React frontend (Vite)
│   │   ├── src/pages/          # Route pages
│   │   ├── src/components/     # UI components
│   │   ├── src/stores/         # Zustand stores
│   │   └── src/lib/            # API client, Supabase, i18n
│   │
│   ├── server/                 # Express API backend
│   │   ├── src/routes/         # API route handlers
│   │   ├── src/services/       # AI, RAG, payments, templates
│   │   ├── src/middleware/     # Auth, credits, errors
│   │   ├── scripts/            # Seed, skills upload
│   │   └── data/bare-acts/     # Legal text files (generated)
│   │
│   └── shared/                 # @nyay/shared — types, schemas, constants
│
├── supabase/
│   ├── config.toml             # Local Supabase config
│   ├── migrations/             # 8 SQL migration files
│   └── seed.sql                # Storage bucket setup
│
└── CLAUDE.md                   # AI coding instructions
```

---

## Feature Flags

| Flag | Effect when `true` | Effect when `false` |
|------|-------------------|-------------------|
| `BETA_MODE` | Beta banner, hides billing history | Full production UI |
| `SHOW_PRICING` | Shows pricing cards | Hides pricing |
| `ENFORCE_CREDITS` | Blocks at 0 credits (402 error) | Allows unlimited usage |
| `SHOW_UPGRADE_PROMPTS` | Shows upgrade nudges | Hidden |

**Recommended per environment:**

| Environment | BETA_MODE | SHOW_PRICING | ENFORCE_CREDITS | SHOW_UPGRADE_PROMPTS |
|-------------|-----------|-------------|----------------|---------------------|
| Local dev | false | true | false | true |
| Beta | true | false | false | false |
| Production | false | true | true | true |

Set these in **both** server `.env` and client `.env` (with `VITE_` prefix for client).

---

## Database Migrations

Run automatically with `npx supabase start`. To re-run: `npx supabase db reset`.

| # | Migration | Creates |
|---|-----------|---------|
| 1 | `initial_schema` | profiles, case_matters, legal_documents, conversations, messages, legal_chunks |
| 2 | `deduct_credits_rpc` | `deduct_credits()` RPC function |
| 3 | `add_profile_onboarding_fields` | onboarding_completed, city, state columns |
| 4 | `rag_search_functions` | `match_chunks_semantic()`, `match_chunks_keyword()`, research_cache |
| 5 | `add_case_notes` | case_notes table |
| 6 | `add_deadline_notifications` | deadline_notifications table |
| 7 | `add_document_analyses` | document_analyses table |
| 8 | `add_subscriptions_and_billing` | subscriptions, billing_history, beta_usage_analytics, feedback |

---

## API Endpoints

All prefixed with `/api`. Auth endpoints require `Authorization: Bearer <jwt>`.

| Method | Path | Credits | Description |
|--------|------|---------|-------------|
| GET | `/health` | — | Health check |
| GET | `/auth/profile` | — | Get profile |
| PATCH | `/auth/profile` | — | Update profile |
| POST | `/chat/conversations` | — | Create conversation |
| GET | `/chat/conversations` | — | List conversations |
| GET | `/chat/conversations/:id/messages` | — | Get messages |
| DELETE | `/chat/conversations/:id` | — | Delete conversation |
| POST | `/chat/stream` | 1 | SSE streaming chat |
| POST | `/research/search` | 1 | RAG search |
| POST | `/research/explain` | 2 | RAG + explanation |
| POST | `/research/cases` | 1 | Case law search |
| GET | `/research/acts` | — | Browse acts |
| POST | `/documents/generate` | 15 | Generate document (SSE) |
| POST | `/documents/analyze` | 5 | Upload + AI analysis |
| GET | `/documents` | — | List documents |
| GET | `/documents/:id/download` | — | Download file |
| DELETE | `/documents/:id` | — | Delete document |
| POST | `/cases` | — | Create case |
| GET | `/cases` | — | List cases |
| GET | `/cases/:id` | — | Case detail |
| PUT | `/cases/:id` | — | Update case |
| POST | `/cases/:id/deadlines` | — | Add deadline |
| POST | `/cases/:id/notes` | — | Add note |
| POST | `/limitation/calculate` | — | Calculate limitation |
| GET | `/limitation/categories` | — | List categories |
| GET | `/payments/plans` | — | List plans |
| GET | `/payments/subscription` | — | Current subscription |
| POST | `/payments/subscribe` | — | Create subscription |
| POST | `/payments/cancel` | — | Cancel subscription |
| GET | `/payments/usage` | — | Usage summary |
| POST | `/payments/feedback` | — | Submit feedback |

---

## Credit System

| Action | Cost |
|--------|------|
| Chat message | 1 |
| Research search | 1 |
| Research explain | 2 |
| Analysis report | 3 |
| Document analysis | 5 |
| Document generation | 15 |

| Tier | Credits/Month | Price |
|------|---------------|-------|
| Free | 500 | ₹0 |
| Starter | 2,000 | ₹499/mo |
| Professional | 10,000 | ₹1,499/mo |

---

## Beta Deployment

### Architecture

```
Client (Vercel) → Server (Railway) → Database (Supabase Cloud)
```

### Step 1 — Supabase Cloud

1. Go to https://supabase.com → New Project
2. **Region:** Mumbai (ap-south-1)
3. Wait for project creation (~2 min)
4. Go to **SQL Editor** → run each migration file in order:
   ```
   supabase/migrations/20240101000000_initial_schema.sql
   supabase/migrations/20240102000000_deduct_credits_rpc.sql
   supabase/migrations/20240103000000_add_profile_onboarding_fields.sql
   supabase/migrations/20240104000000_rag_search_functions.sql
   supabase/migrations/20240105000000_add_case_notes.sql
   supabase/migrations/20240106000000_add_deadline_notifications.sql
   supabase/migrations/20240107000000_add_document_analyses.sql
   supabase/migrations/20240108000000_add_subscriptions_and_billing.sql
   ```
5. Run `supabase/seed.sql` in SQL Editor
6. **Or** use CLI instead of SQL Editor:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   # Then run seed.sql manually in SQL Editor
   ```
7. Go to **Settings → API** — copy Project URL, anon key, service_role key
8. Go to **Authentication → URL Configuration**:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: add `https://your-app.vercel.app/**`

### Step 2 — Railway (Server)

1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select your repo
3. Click on the service → **Settings**:
   - Root Directory: `packages/server`
   - Build Command: `npm run build`
   - Start Command: `node dist/index.js`
4. Go to **Variables** tab, add:
   ```
   NODE_ENV=production
   PORT=3001
   CLIENT_URL=https://your-app.vercel.app
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-proj-...
   RAZORPAY_KEY_ID=
   RAZORPAY_KEY_SECRET=
   BETA_MODE=true
   SHOW_PRICING=false
   ENFORCE_CREDITS=false
   ```
5. Go to **Settings → Networking → Generate Domain**
6. Copy the Railway URL (e.g., `https://nyay-sahayak.up.railway.app`)

### Step 3 — Vercel (Client)

1. Go to https://vercel.com → Add New → Import your repo
2. Configure:
   - Root Directory: `packages/client`
   - Framework: Vite
3. Add Environment Variables:
   ```
   VITE_API_URL=https://nyay-sahayak.up.railway.app/api
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_SHOW_PRICING=false
   VITE_BETA_MODE=true
   VITE_ENFORCE_CREDITS=false
   VITE_SHOW_UPGRADE_PROMPTS=false
   ```
4. Deploy
5. Copy Vercel URL → go back to Railway and update `CLIENT_URL`
6. Go back to Supabase and update Site URL + Redirect URLs

### Step 4 — Seed Cloud Database

From your local machine:

```bash
cd packages/server

SUPABASE_URL=https://xxxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
OPENAI_API_KEY=sk-proj-... \
npx tsx scripts/generate-bare-acts.ts

SUPABASE_URL=https://xxxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
OPENAI_API_KEY=sk-proj-... \
npx tsx scripts/seed-knowledge-base.ts
```

### Step 5 — Verify

1. Open your Vercel URL
2. Sign up → confirm email (Supabase Cloud sends real emails)
3. Test: Chat, Research, Documents, Cases, Limitation Calculator
4. Pricing cards should be hidden (SHOW_PRICING=false)

---

## Going from Beta → Production

Update env vars on Railway + Vercel, then redeploy:

**Railway:**
```
BETA_MODE=false
SHOW_PRICING=true
ENFORCE_CREDITS=true
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Vercel:**
```
VITE_SHOW_PRICING=true
VITE_BETA_MODE=false
VITE_ENFORCE_CREDITS=true
VITE_SHOW_UPGRADE_PROMPTS=true
```

Railway auto-deploys on env change. Vercel needs a manual redeploy from dashboard.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Supabase won't start | Open Docker Desktop first, then `npx supabase stop && npx supabase start` |
| `@nyay/shared` import errors | Run `npm run build:shared` |
| Can't login with password | Password only works if you used `/signup`. OTP accounts must use OTP. |
| 401 on all requests after DB reset | Clear browser `localStorage`, sign up again |
| OTP not arriving (local) | Check Mailpit at http://127.0.0.1:54324 |
| Knowledge base empty | `cd packages/server && npx tsx scripts/seed-sample-acts.ts` |
| Pricing cards hidden | Set `SHOW_PRICING=true` + `VITE_SHOW_PRICING=true`, restart |
| Port 3001/5173 in use | `lsof -ti:3001 \| xargs kill -9` |
| Anthropic 402 error | Add credits at https://console.anthropic.com/settings/billing |
| OpenAI quota error | Add credits at https://platform.openai.com/account/billing |
| indiacode.nic.in scraper fails | Use `npx tsx scripts/generate-bare-acts.ts` instead (generates via GPT) |

---

## License

Private — all rights reserved.
