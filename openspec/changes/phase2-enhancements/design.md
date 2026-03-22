## Context

CampaignAssist MVP is live in production with a working news ingestion pipeline (Serper → scrape → Claude AI → Supabase), three-bin news tracker, alerts, opponent detection, VA politics briefing, and daily digest email. The system processes ~20-25 articles/week for Tara Durant's VA congressional campaign.

Ashley has used the MVP and provided specific feedback: the bin navigation feels clunky (tabs should be dashboard cards), alerts lack article context, reporter names are frequently missing, and there's no way to track negative attacks against the candidate. She also needs two new modules — a research workspace (NewsConnector) and an AI content generation layer (ContentMap).

### Current Architecture
- **Frontend**: Next.js 16 App Router + shadcn/ui + Tailwind CSS (pink palette)
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **AI**: Single Claude Sonnet call per article returning structured JSON (bin, sentiment, themes, entities, alerts)
- **Ingestion**: Serper API → scrape → AI analysis → store (cron every 30 min, 7am-8pm EST)
- **Email**: Resend for critical alerts + daily digest via Edge Function cron

### Key Constraints
- All tables must use `campaign_id` FK (multi-tenant)
- RLS policies scope all data to user's campaigns via `user_campaigns` junction
- AI costs should stay low (~$0.50/week) — avoid adding many new per-article API calls
- Single AI call per article architecture should be preserved where possible

## Goals / Non-Goals

**Goals:**
- Improve News Tracker UX with dashboard card layout showing at-a-glance stats per bin
- Add article context to alerts with AI-driven aggregation of related alerts
- Reliably extract author/byline information from scraped articles
- Detect and surface negative comments directed at candidate/party (Tara/GOP Hits)
- Provide a research workspace for saving, tagging, and annotating important articles (NewsConnector)
- Generate actionable campaign content from news intelligence (ContentMap)

**Non-Goals:**
- Social media ingestion (Module 2 — backburner)
- Legislative bill tracking (Module 3 — backburner)
- Full opposition research dossiers (Module 5 — backburner)
- Debate/event prep materials (Module 8 — backburner)
- Reporter contact lookup / email finding (explicitly dropped from NewsConnector)
- Changing the ingestion frequency or data sources
- Redesigning the overall dashboard layout/navigation (only News Tracker bin area changes)

## Decisions

### 1. Expand existing AI prompt rather than add new per-article calls

**Decision**: Add `candidate_hits` to the existing `analyzeArticle()` structured output rather than making a second AI call per article.

**Rationale**: The current single-call architecture keeps costs low and latency manageable. Adding hit detection to the same prompt is natural — the AI already reads the full article text and classifies sentiment/entities. Extracting specific negative comments is an incremental addition to the same analysis.

**Alternative considered**: Separate hit-detection call per article. Rejected because it doubles per-article API costs and latency with no significant accuracy benefit — the AI already has full context in the existing call.

**Change to prompt**: Add a `candidate_hits` array to the JSON schema:
```json
"candidate_hits": [
  {
    "source_name": "Person or org making the statement",
    "comment_summary": "1-2 sentence summary of the negative comment",
    "context": "Direct quote or paraphrase from article"
  }
]
```

Detection criteria: Any statement that is tonally negative toward the candidate (Tara Durant) or the Virginia GOP in the context of the congressional race, made by any political figure, Democrat affiliate, opponent, or individual.

### 2. AI-driven alert aggregation via recent-alert context window

**Decision**: When a new article generates an alert, pass the last 7 days of existing alert titles/descriptions to the AI and ask it to either assign the article to an existing alert or create a new one.

**Rationale**: Theme/entity matching heuristics are brittle — two alerts about "education policy attacks" might use different key_themes. The AI understands semantic similarity and can make nuanced grouping decisions.

**Implementation**: Add a new field to the alert creation step in the ingestion pipeline:
1. Fetch recent alerts (last 7 days) for the campaign
2. Include them in the AI prompt as context: "Existing alerts: [{id, title, description}, ...]"
3. AI returns either `existing_alert_id` (to group under) or `null` (create new alert)

**Data model change**: Add `alert_articles` junction table so one alert can reference multiple articles. Keep existing `article_id` on alerts for backwards compatibility but make it nullable — the junction table becomes the source of truth.

**Alternative considered**: Manual grouping by user. Rejected because Ashley wants automated intelligence, not more manual work.

### 3. Author extraction in scraper with multi-strategy approach

**Decision**: Add an `extractAuthor()` function to `scraper.ts` that tries multiple extraction strategies in priority order.

**Strategies** (in order):
1. `<meta name="author" content="...">` or `<meta property="article:author" content="...">`
2. JSON-LD `@type: "NewsArticle"` → `author.name`
3. Byline CSS classes: `.byline`, `.author`, `.writer`, `[rel="author"]`
4. Text pattern: `/[Bb]y\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/` near article start
5. Serper API result metadata (if available in search results)

**Return**: Updated `ScrapedArticle` interface adds `author: string | null`.

**Alternative considered**: Using AI to extract author from article text. Rejected because it would require either adding to the per-article AI call (which may not have the HTML structure) or a separate call. Regex/DOM strategies are free and fast.

### 4. NewsConnector as starred articles with tags and notes

**Decision**: Add a `starred` boolean to the articles table (or a separate `article_stars` table), plus a `tags` table and `article_tags` junction table for the global tag pool, and an `article_notes` table for chronological notes.

**Data model**:
- `article_stars`: `(id, campaign_id, article_id, starred_at)` — junction for stars
- `tags`: `(id, campaign_id, name, color, created_at)` — global managed pool
- `article_tags`: `(id, article_id, tag_id, created_at)` — junction
- `article_notes`: `(id, campaign_id, article_id, content, created_at, updated_at)` — chronological free text

**Tag UX**: Autocomplete input that searches existing tags. Typing a new name offers "Create tag: [name]" option. Tags are campaign-scoped.

**Alternative considered**: Using the existing `key_themes` array for tagging. Rejected because themes are AI-generated and read-only — tags are user-defined and operational.

### 5. ContentMap as three-category AI generation module

**Decision**: ContentMap has three tabs, each powered by different AI generation patterns:

| Category | Input | AI Call Pattern | Schedule |
|----------|-------|-----------------|----------|
| Social & Video Ideas | Recent articles (last 3 days) | On-demand when page loaded | Manual refresh |
| Newsletter Outline | Recent articles (last 24h) | Daily cron (alongside digest) | 7am EST |
| Hit Responses | `candidate_hits` records | On-demand per hit | Manual trigger |

**Data model**:
- `content_ideas`: `(id, campaign_id, category, title, content, source_article_ids, generated_at)` — stores generated social/video ideas
- `newsletter_outlines`: `(id, campaign_id, outline_html, source_article_ids, generated_at, period_start, period_end)` — daily newsletter outlines
- `hit_responses`: `(id, campaign_id, hit_id, response_text, tone, generated_at)` — AI responses to hits

**Newsletter cron**: Add to existing `generate-digest` Edge Function or create a new `generate-newsletter-outline` function. The newsletter outline is a separate product from the digest email — the digest goes to Ashley, the newsletter outline is content for supporters.

**Alternative considered**: Single "generate all content" cron. Rejected because social ideas benefit from on-demand freshness while newsletter needs the predictability of a daily schedule.

### 6. News Tracker card layout

**Decision**: Replace shadcn `Tabs` component with three custom `BinCard` components in a horizontal flex row. Each card shows: bin name, article count, narrative trend indicator (arrow + label). Clicking a card sets the active bin and renders the summary + article table below.

**Visuals**: Selected card gets a prominent border/shadow in the pink palette. Unselected cards are subtle. Cards are responsive — stack vertically on mobile.

**Alternative considered**: Keep tabs but restyle. Rejected because Ashley specifically wants "large clickable cards," which is a different interaction pattern — cards convey at-a-glance information that tabs don't.

### 7. Light pink shadow glow on all buttons

**Decision**: All interactive buttons across the app (existing and new) SHALL have a light pink box-shadow glow. This applies globally — not just to new components.

**Implementation**: Add a custom Tailwind utility or extend the shadcn/ui Button component's base styles with a pink `box-shadow` (e.g., `box-shadow: 0 0 12px rgba(236, 72, 153, 0.3)`). Apply via `globals.css` or the Button component's default variant so it covers all existing and new buttons without per-component changes.

**Rationale**: Reinforces the pink brand palette and gives buttons a polished, distinctive feel across the entire app.

## Risks / Trade-offs

**[AI prompt expansion may reduce accuracy]** → Adding hit detection to an already complex prompt could degrade quality on existing fields. **Mitigation**: Test the expanded prompt against a sample of existing articles and verify bin/sentiment/entity accuracy is preserved. Keep the additions minimal and well-structured.

**[Alert aggregation may over-group]** → AI might group unrelated alerts together if topics are superficially similar. **Mitigation**: Only aggregate within a 7-day window. Include alert tier in grouping context so critical alerts aren't absorbed into standard ones. Allow users to manually ungroup if needed (future enhancement).

**[Author extraction is best-effort]** → Many news sites don't expose author info in parseable ways. **Mitigation**: Accept null as a valid result. The field is already nullable in the database. The multi-strategy approach maximizes coverage without false positives.

**[ContentMap AI costs]** → Newsletter outline cron adds ~1 Claude call/day. Social ideas add calls on-demand. **Mitigation**: Use reasonable token limits. At current volume (~4 articles/day), costs remain well under $1/week total.

**[Newsletter outline vs digest confusion]** → Two daily automated outputs could confuse Ashley. **Mitigation**: Clear labeling in UI — digest is "your morning briefing" (private), newsletter outline is "content for supporters" (public-facing draft).
