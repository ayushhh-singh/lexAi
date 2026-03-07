# Nyay Sahayak - AI Legal Assistant for Indian Lawyers

## Architecture
- Monorepo: packages/client (Vite+React), packages/server (Express), packages/shared
- Client: React + TypeScript + Tailwind + React Router v6 + Zustand
- Server: Express.js + TypeScript + Supabase + Anthropic SDK + OpenAI SDK
- Shared: @nyay/shared for types, Zod schemas, constants
- DB: Supabase PostgreSQL + pgvector, Mumbai region
- AI: Claude Sonnet 4.5 (chat + Skills), OpenAI (embeddings)
- Deploy: Vercel (client) + Railway (server)

## Rules
- ALL types in packages/shared - NEVER duplicate between client/server
- Client NEVER queries Supabase for data - only auth. All data via Express API
- NEVER import between client and server - only from @nyay/shared
- Chat streaming: SSE from Express, fetch+ReadableStream on client
- Document generation: Claude API Skills (server-side, skills.service.ts)
- Feature flags in @nyay/shared/constants/feature-flags.ts
- Follow design-system skill for ALL UI components
- Fonts: DM Sans + Source Serif 4 + JetBrains Mono (Google Fonts)

## Commands
npm run dev (both) | npm run dev:client | npm run dev:server
npx supabase start | npx tsx packages/server/scripts/seed-knowledge-base.ts
