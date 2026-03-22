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

## Phase 2 Modules (built)

6. **NewsConnector** — Star articles from News Tracker, custom tagging with global managed pool, chronological free-text notes per article
7. **ContentMap** — AI-generated social/video ideas, daily cron newsletter outline for supporters, AI hit responses to negative attacks
8. **Tara/GOP Hits** — Comment-level negative hit detection in AI pipeline, hits tab on Opponents page

## Phase 2 Improvements (built)

- News Tracker dashboard cards (replaced tabs with clickable stat cards)
- Alert aggregation (AI groups related alerts, click-to-expand showing linked articles)
- Author extraction (multi-strategy: meta tags, JSON-LD, byline CSS, text patterns)
- Pink button glow (all buttons have light pink shadow)

## Future Modules (backburner, not yet built)

- Social Media Tracker (Twitter/X, Facebook, Instagram ingestion)
- Legislative Briefing (VA General Assembly)
- Full Opposition Research Dossier
- Debate and Event Prep

## Full Spec

The complete 8-module product specification is at `~/Desktop/CampaignAssist_Full_Spec.docx`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Dashboard layout + pages
│   │   ├── news/              # News Tracker (dashboard cards + article table)
│   │   ├── va-politics/       # VA Politics briefing
│   │   ├── alerts/            # Alert management (expandable, aggregated)
│   │   ├── opponents/         # Opponent tracking + Tara/GOP Hits tab
│   │   ├── news-connector/    # NewsConnector (starred articles, tags, notes)
│   │   ├── content-map/       # ContentMap (social ideas, newsletter, hit responses)
│   │   └── settings/          # Campaign configuration
│   ├── api/scan/              # Manual scan trigger
│   ├── api/briefing/          # Manual briefing refresh
│   ├── api/content/           # ContentMap AI generation
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
    ├── generate-digest/       # Cron: daily digest
    └── generate-newsletter/   # Cron: daily newsletter outline
```

## Key Files

- `src/lib/supabase/migrations/001_initial_schema.sql` — Full database schema + RLS
- `src/lib/supabase/migrations/002_seed_data.sql` — Tara Durant campaign seed data
- `src/lib/supabase/migrations/003_phase2_enhancements.sql` — Phase 2 tables (alert_articles, candidate_hits, article_stars, tags, article_tags, article_notes, content_ideas, newsletter_outlines, hit_responses)
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
- [x] **Deployment** — Supabase project setup, env vars, Vercel deploy
- [x] **Seed data** — Migrations applied, Ashley's account linked as owner, campaign seeded
- [x] **Cron jobs** — Ingestion every 30 min (7am-8pm EST), daily digest at 7am EST
- [x] **Production** — Live at https://ashley-project-seven.vercel.app

### Phase 2

- [x] News Tracker dashboard cards (replaced tab navigation with clickable stat cards)
- [x] Alert aggregation (AI-driven grouping, click-to-expand article list)
- [x] Author extraction (multi-strategy scraper: meta, JSON-LD, byline, text patterns)
- [x] Tara/GOP Hits (comment-level negative hit detection in AI pipeline, Opponents tab)
- [x] NewsConnector (star articles, global tag pool, chronological notes)
- [x] ContentMap (social/video ideas, daily newsletter outline, AI hit responses)
- [x] Pink button glow (global light pink shadow on all buttons)
- [ ] **Deploy Phase 2** — Run migration 003, deploy Edge Function, push to Vercel
