## Why

Ashley Headrick works on Tara Durant's Virginia congressional campaign and currently relies on fragmented manual workflows — Google Alerts, spreadsheets, and ad-hoc research — to track news coverage, monitor opponents, and stay aware of political developments. There is no single system that ingests, analyzes, and surfaces actionable campaign intelligence. CampaignAssist replaces this with a persistent, AI-powered intelligence layer that continuously monitors news, classifies coverage, detects opponents, and alerts on critical developments.

## What Changes

This is a greenfield build. The following capabilities are introduced:

- **News ingestion pipeline**: Polls Serper API every 30 minutes for news articles related to the campaign. Scrapes full article text, stores in Supabase.
- **AI analysis pipeline**: Each article is processed by Claude Sonnet in a single structured call that returns: bin classification (candidate/opponent/general race), sentiment, key themes, VA politics relevance, alert tier, and detected entities (opponents/supporters).
- **Three-bin news tracker**: Articles sorted into Candidate (Tara Durant), Opponents, and General Race bins. Each bin has a rolling AI-generated summary with narrative trend indicator.
- **Opponent detection and tracking**: AI detects opponents and supporters mentioned in articles. User approves detected opponents before they become tracked entities with their own search terms and article bins.
- **VA Politics briefing**: AI-curated political landscape briefing derived from the same news articles, including hot-button issues ranking and strategic implications.
- **Alert system**: Critical alerts delivered via immediate email. High/standard alerts included in daily digest.
- **Daily digest email**: Morning email with overnight summary, new articles per bin, alerts, and top intelligence.
- **Authentication**: Email/password auth via Supabase Auth. Single user (Ashley) for now, multi-tenant architecture for future.
- **Dashboard UI**: Professional React dashboard with pink color palette for browsing all intelligence.

## Capabilities

### New Capabilities
- `news-ingestion`: Serper API polling, article scraping, and storage pipeline
- `ai-analysis`: Single-call Claude Sonnet analysis per article (classification, sentiment, entities, alerts)
- `news-tracker`: Three-bin article display with rolling AI summaries and sentiment tags
- `opponent-management`: Opponent detection from articles, approval workflow, and per-opponent tracking
- `va-politics-briefing`: AI-generated political landscape briefing derived from news articles
- `alert-system`: Tiered alerts with immediate email for critical items and daily digest
- `auth-and-multitenancy`: Supabase Auth, campaign-scoped data, RLS policies
- `dashboard-ui`: Next.js dashboard with navigation, article tables, briefing views, alert management

### Modified Capabilities
(None — greenfield project)

## Impact

- **New codebase**: Next.js 14+ app with App Router, Tailwind CSS, shadcn/ui
- **New database**: Supabase PostgreSQL with tables for campaigns, articles, opponents, alerts, briefings, digests; RLS on all tables
- **External API dependencies**: Serper API (news search), Claude Sonnet API (AI analysis), Resend (email delivery)
- **Infrastructure**: Supabase Cloud (Ashley's account) for backend, Vercel for frontend deployment
- **Recurring costs**: Serper API (~48 searches/day), Claude API (~$0.50/week at current volume), Resend (free tier sufficient)
