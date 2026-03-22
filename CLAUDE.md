# CampaignAssist

Campaign Marketing OS for political campaigns.

## Project Overview

CampaignAssist is an AI-powered campaign intelligence platform built for Ashley Headrick, who works on Tara Durant's Virginia congressional campaign. It continuously ingests news articles, classifies them, and surfaces actionable intelligence.

**Product Owner / Daily User:** Ashley Headrick
**Builder:** Eli Kimche
**Candidate:** Tara Durant (VA congressional race)

## MVP Modules

1. **News Media Tracker** — 3-bin sorting (candidate/opponent/general race), AI sentiment classification, rolling AI summaries
2. **VA Politics Briefing** — AI-curated political landscape briefing derived from news articles
3. **Alert System** — Critical alerts via immediate email, daily digest every morning
4. **Opponent Detection** — AI detects opponents/supporters in articles, user approves before full tracking begins

## Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS, shadcn/ui v4 (base-nova)
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **AI:** Claude Sonnet API (single structured call per article)
- **Search:** Serper API (news search, polling every 30 min)
- **Email:** Resend (alerts + daily digests)
- **Deployment:** Vercel (frontend), Supabase Cloud (backend)
- **Auth:** Supabase Auth with email/password

## Architecture Decisions

- Multi-tenant from day one — all tables use `campaign_id` FK
- Single AI call per article handles: bin classification, sentiment, themes, VA politics relevance, alert tier, entity detection
- Opponents are first-class entities with an approval workflow
- Article-entity junction table (one article can reference multiple people)
- VA Politics module derives from the same news articles (no separate data source)
- ~20-25 articles/week expected volume
- Professional UI with pink color palette

## Infrastructure

- Supabase project is under Ashley's account; Eli is added as org admin
- Supabase handles: database, auth, row-level security, edge functions (cron jobs)
- Vercel handles: Next.js frontend deployment

## Future Modules (designed, not yet built)

- Social Media Tracker (Twitter/X, Facebook, Instagram)
- Legislative Briefing (VA General Assembly)
- Full Opposition Research Dossier
- Content Engine (social content, newsletters, rapid response)
- Debate and Event Prep

## Full Spec

The complete 8-module product specification is at `~/Desktop/CampaignAssist_Full_Spec.docx`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Dashboard layout + pages
│   │   ├── news/              # News Tracker (3-bin tabs + article table)
│   │   ├── va-politics/       # VA Politics briefing
│   │   ├── alerts/            # Alert management
│   │   ├── opponents/         # Opponent tracking + detection queue
│   │   └── settings/          # Campaign configuration
│   ├── api/scan/              # Manual scan trigger
│   ├── api/briefing/          # Manual briefing refresh
│   └── auth/callback/         # Supabase auth callback
├── components/                # Shared UI components
├── hooks/                     # Custom hooks (useCampaign)
├── lib/                       # Core libraries
│   ├── supabase/              # Client, server, middleware
│   ├── ai-analysis.ts         # Claude Sonnet analysis
│   ├── ingestion.ts           # Full ingestion pipeline
│   ├── scraper.ts             # Article scraping
│   ├── serper.ts              # News search API
│   └── resend.ts              # Email delivery
└── types/                     # TypeScript types
supabase/
└── functions/                 # Edge Functions (Deno)
    ├── ingest-articles/       # Cron: every 30 min
    └── generate-digest/       # Cron: daily digest
```

## Key Files

- `src/lib/supabase/migrations/001_initial_schema.sql` — Full database schema + RLS
- `src/lib/supabase/migrations/002_seed_data.sql` — Tara Durant campaign seed data
- `.env.local.example` — Required environment variables

## Status

- [x] Project setup and scaffolding (Next.js 16, shadcn/ui, pink palette)
- [x] Supabase schema and RLS (10 tables, all with campaign_id, full RLS)
- [x] News ingestion pipeline (Serper + scraper + deduplication)
- [x] AI analysis pipeline (Claude Sonnet, single call, retry logic)
- [x] Dashboard UI (sidebar, header, all 5 pages)
- [x] Alert system (tiered alerts, email, acknowledge flow)
- [x] Daily digest (Edge Function, styled email template)
- [x] VA Politics briefing (AI-generated, hot issues, "So What")
- [x] Opponent management (detection queue, approval, manual add)
- [ ] **Deployment** — Supabase project setup, env vars, Vercel deploy
- [ ] **Seed data** — Run migrations, create Ashley's account, associate with campaign
