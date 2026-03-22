## Context

CampaignAssist is a greenfield campaign intelligence platform. The project directory is an empty git repo. Ashley Headrick (sole user) works on Tara Durant's VA congressional campaign and needs a system that continuously monitors news, classifies coverage, and surfaces actionable intelligence — replacing manual Google Alerts and spreadsheet workflows.

Ashley owns the Supabase account and has added Eli (the developer) as an org admin. The system must be multi-tenant from day one (campaign_id on all tables) even though only one campaign exists initially.

Expected volume: ~20-25 news articles/week (~3-4/day). Polling frequency: every 30 minutes via Serper API.

## Goals / Non-Goals

**Goals:**
- Build a working MVP with News Tracker, VA Politics Briefing, and Alert System
- Ingest and AI-classify news articles automatically every 30 minutes
- Detect and track opponents discovered in articles (with user approval)
- Deliver critical alerts immediately via email and a daily digest every morning
- Architect for multi-tenancy so additional campaigns can be onboarded later
- Professional, clean dashboard with pink color palette

**Non-Goals:**
- Social media tracking (Module 2) — future
- Legislative bill tracking (Module 3) — future
- Full opposition research dossiers with voting records, donor analysis (Module 5) — future, though basic opponent tracking is in MVP
- Content generation engine (Module 6) — future
- Debate/event prep packets (Module 8) — future
- Mobile app — desktop-first dashboard
- Real-time collaborative features — single user for now
- Rapid Response automation — aspiration, not MVP

## Decisions

### 1. Next.js 14+ with App Router

**Choice:** Next.js with App Router, server components, and API routes.

**Why:** Server components allow database queries without exposing Supabase credentials client-side. API routes handle webhook endpoints and cron triggers. App Router is the modern Next.js standard. Vercel deployment is zero-config.

**Alternatives considered:**
- Plain React SPA (Vite): Would require a separate API server for background jobs and server-side logic. More infrastructure to manage.
- Remix: Strong alternative but smaller ecosystem and less Vercel integration.

### 2. Supabase for database, auth, and background jobs

**Choice:** Supabase PostgreSQL + Auth + Edge Functions for the entire backend.

**Why:** Single platform for database, auth, RLS, and scheduled functions. Ashley already has an account. Edge Functions (Deno) can run cron jobs for article ingestion without a separate server. RLS policies enforce multi-tenancy at the database level.

**Alternatives considered:**
- Separate PostgreSQL + custom auth: More flexibility but significantly more setup and maintenance.
- Firebase: Less suited for relational data and complex queries.

### 3. Single AI call per article

**Choice:** One structured Claude Sonnet API call per article that returns all classifications, sentiment, entities, and alert signals.

**Why:** At 3-4 articles/day, latency isn't a concern. A single call is simpler to implement, debug, and maintain. The structured output schema ensures consistent results. Cost is ~$0.01-0.02 per article.

**Alternatives considered:**
- Multiple specialized calls (one for sentiment, one for entities, etc.): Increases latency, cost, and complexity with no benefit at this volume.
- Local ML models: Over-engineered for 25 articles/week. Claude Sonnet's quality is dramatically better for this use case.

### 4. Serper API for news search

**Choice:** Serper API with Google News search for article discovery.

**Why:** Simple REST API, returns structured results with titles/URLs/dates, supports advanced search operators, generous free tier (2,500 queries/month). At 48 queries/day (every 30 min), free tier covers ~1.7 months; paid tier is $50/month for 50,000 queries.

**Alternatives considered:**
- Google Custom Search API: More complex setup, similar pricing, less news-specific.
- NewsAPI: Good for national news, weak for local/regional VA coverage which is critical here.
- Direct RSS feeds: Limited coverage, no search capability, would miss many sources.

### 5. Resend for email delivery

**Choice:** Resend API for both critical alert emails and daily digest delivery.

**Why:** Simple API, React Email integration for styled templates, generous free tier (100 emails/day). At 1 digest + occasional alerts, free tier is sufficient indefinitely.

**Alternatives considered:**
- SendGrid: More complex, overkill for single-recipient emails.
- AWS SES: Cheapest at scale but more setup and configuration.

### 6. shadcn/ui component library

**Choice:** Tailwind CSS + shadcn/ui for the UI layer.

**Why:** High-quality, accessible components. The DataTable component (built on TanStack Table) is ideal for the article tracker views. Fully customizable — can implement the pink color palette by modifying CSS variables. No runtime dependency, components are copied into the project.

**Alternatives considered:**
- Material UI: Heavier, harder to customize the visual identity away from Google's design language.
- Chakra UI: Good but less flexible for custom theming.
- Custom components: Too much work for an MVP.

### 7. Article-entity junction table for multi-person references

**Choice:** Separate `article_entities` junction table rather than a simple `opponent_id` FK on articles.

**Why:** News articles routinely mention multiple candidates. A race preview might reference Durant, two opponents, and endorsers. The junction table allows accurate representation without duplicating article records. Each entity reference carries its own sentiment and role (subject/mentioned/quoted).

**Alternatives considered:**
- Single opponent_id on articles: Loses information when articles mention multiple people.
- JSONB array on articles: Harder to query and join.

### 8. Opponent approval workflow

**Choice:** AI detects entities → stored in `detected_entities` → user reviews and approves → opponent created with auto-generated search terms → tracked in their own bin.

**Why:** Prevents the system from auto-tracking every name mentioned in passing. The user maintains control over who becomes a tracked opponent. Once approved, opponents become first-class entities with the same pipeline as the candidate.

### 9. Database schema — multi-tenant from day one

**Choice:** Every table carries a `campaign_id` FK. RLS policies restrict all queries to the user's campaign(s). A `user_campaigns` junction table maps users to campaigns.

**Why:** Adding multi-tenancy later would require touching every query and table. Building it in now costs minimal effort (one extra column + RLS policy per table) and avoids a painful migration when the second campaign is onboarded.

## Data Flow Architecture

```
Cron (every 30 min)
    │
    ▼
Supabase Edge Function: "ingest-articles"
    │
    ├── 1. Query Serper API with campaign search terms
    │      (separate queries per bin: candidate, each opponent, general race)
    │
    ├── 2. Deduplicate against existing articles (by URL)
    │
    ├── 3. For each new article:
    │      a. Scrape full text (fetch URL, extract article content)
    │      b. Call Claude Sonnet with structured output schema
    │      c. Insert article + classifications into DB
    │      d. Insert detected entities into detected_entities table
    │      e. If alert_tier = "critical", trigger immediate email via Resend
    │
    └── 4. If new articles were added to any bin:
           Regenerate bin_summaries for affected bins

Cron (daily, configurable time)
    │
    ▼
Supabase Edge Function: "generate-digest"
    │
    ├── 1. Query articles from last 24 hours
    ├── 2. Query alerts from last 24 hours
    ├── 3. Generate VA Politics briefing (Claude call on political articles)
    ├── 4. Compose digest email (React Email template)
    └── 5. Send via Resend to Ashley's email
```

## Database Schema

```
campaigns
├── id (uuid, PK)
├── name (text)
├── candidate_name (text)
├── district (text)
├── search_config (jsonb)         ← search terms per bin
├── alert_email (text)            ← where to send alerts
├── digest_time (time)            ← when to send daily digest
├── created_at (timestamptz)

users (Supabase Auth — managed table)

user_campaigns
├── user_id (uuid, FK → auth.users)
├── campaign_id (uuid, FK → campaigns)
├── role (text: 'owner' | 'admin' | 'viewer')
├── PRIMARY KEY (user_id, campaign_id)

articles
├── id (uuid, PK)
├── campaign_id (uuid, FK)
├── bin (text: 'candidate' | 'opponent' | 'general_race')
├── headline (text)
├── url (text, unique per campaign)
├── reporter (text, nullable)
├── outlet (text)
├── date_published (date)
├── sentiment (text: 'positive' | 'neutral' | 'negative' | 'mixed')
├── reach (text: 'national' | 'regional' | 'local' | 'niche')
├── key_themes (text[])
├── full_text (text)
├── ai_summary (text)
├── paywall_status (text: 'open' | 'bypassed' | 'unavailable')
├── va_politics_relevant (boolean)
├── va_politics_topics (text[])
├── alert_tier (text: 'critical' | 'high' | 'standard' | 'none')
├── alert_reason (text, nullable)
├── ingested_at (timestamptz)
├── created_at (timestamptz)

article_entities
├── id (uuid, PK)
├── article_id (uuid, FK)
├── opponent_id (uuid, FK, nullable)
├── entity_name (text)
├── entity_role (text: 'subject' | 'mentioned' | 'quoted')
├── entity_type (text: 'opponent' | 'supporter' | 'neutral' | 'other')
├── sentiment_toward (text: 'positive' | 'neutral' | 'negative' | 'mixed')

opponents
├── id (uuid, PK)
├── campaign_id (uuid, FK)
├── name (text)
├── party (text, nullable)
├── office_sought (text, nullable)
├── search_terms (text[])
├── bio (text, nullable)
├── status (text: 'active' | 'inactive')
├── source (text: 'detected' | 'manual')
├── created_at (timestamptz)

detected_entities
├── id (uuid, PK)
├── campaign_id (uuid, FK)
├── article_id (uuid, FK)
├── name (text)
├── role (text: 'opponent' | 'supporter' | 'neutral')
├── context (text)
├── confidence (float)
├── resolved (boolean, default false)
├── opponent_id (uuid, FK, nullable)
├── created_at (timestamptz)

bin_summaries
├── id (uuid, PK)
├── campaign_id (uuid, FK)
├── bin (text)
├── summary_text (text)
├── narrative_trend (text: 'increasing' | 'stable' | 'declining')
├── article_count (int)
├── generated_at (timestamptz)
├── period_start (date)
├── period_end (date)

va_politics_briefings
├── id (uuid, PK)
├── campaign_id (uuid, FK)
├── briefing_text (text)
├── hot_issues (jsonb)
├── so_what (text)
├── generated_at (timestamptz)
├── period_start (date)
├── period_end (date)

alerts
├── id (uuid, PK)
├── campaign_id (uuid, FK)
├── article_id (uuid, FK, nullable)
├── tier (text: 'critical' | 'high' | 'standard')
├── title (text)
├── description (text)
├── acknowledged (boolean, default false)
├── acknowledged_at (timestamptz, nullable)
├── created_at (timestamptz)

digests
├── id (uuid, PK)
├── campaign_id (uuid, FK)
├── content_html (text)
├── sent_at (timestamptz)
├── created_at (timestamptz)
```

## Risks / Trade-offs

**[Serper API coverage gaps]** → Serper may not surface hyperlocal VA news sources. **Mitigation:** Review early results and supplement with direct RSS feeds from known VA outlets (Virginia Mercury, Richmond Times-Dispatch) if needed.

**[Article scraping reliability]** → Full-text scraping will fail on some sites (paywalls, JS-rendered content, anti-bot measures). **Mitigation:** Log articles with metadata even when full text unavailable. Mark as "paywall – content unavailable." The AI can still classify based on headline and available metadata.

**[Claude API latency in Edge Functions]** → Supabase Edge Functions have a 150-second timeout. A single Claude call should complete in 5-15 seconds, but processing multiple articles sequentially could approach limits. **Mitigation:** Process articles individually (one Edge Function invocation per article) rather than batching. At 3-4 new articles per ingestion cycle, this is manageable.

**[Single point of failure on AI classification]** → If Claude API is down, no articles get classified. **Mitigation:** Store raw articles immediately on ingest; queue AI classification for retry. Articles still appear in the tracker with "pending classification" status.

**[Email deliverability]** → Alert and digest emails could end up in spam. **Mitigation:** Use Resend with a verified domain. Keep email volume low (1 digest + rare alerts). Ask Ashley to whitelist the sender address.

**[Multi-tenant architecture overhead for single user]** → Slight additional complexity in every query. **Mitigation:** The overhead is one extra WHERE clause. RLS handles this transparently. The cost now is trivial compared to the migration cost later.
