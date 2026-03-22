## 1. Author Extraction (Pipeline Improvement)

- [x] 1.1 Add `extractAuthor()` function to `src/lib/scraper.ts` with multi-strategy extraction: meta tags, JSON-LD, byline CSS classes, text pattern matching
- [x] 1.2 Update `ScrapedArticle` interface to include `author: string | null`
- [x] 1.3 Update `scrapeArticle()` to call `extractAuthor()` and return author in result
- [x] 1.4 Update ingestion pipeline in `src/lib/ingestion.ts` to store extracted author in article `reporter` field
- [x] 1.5 Test author extraction against 5+ real news article URLs to verify coverage

## 2. News Tracker Card Layout

- [x] 2.1 Create `BinCard` component in `src/components/` — displays bin name, article count, narrative trend with directional arrow, selected/unselected visual states
- [x] 2.2 Refactor `src/app/(dashboard)/news/page.tsx` to replace shadcn Tabs with three BinCard components in a horizontal flex row
- [x] 2.3 Wire card click to set active bin and populate summary + article table below
- [x] 2.4 Add responsive stacking (vertical on mobile < 768px)
- [x] 2.5 Style selected card with pink palette border/shadow, unselected cards with subtle styling

## 3. Alert Aggregation

- [x] 3.1 Create `alert_articles` junction table migration (id, alert_id, article_id, created_at) with RLS policies
- [x] 3.2 Add `AlertArticle` type to `src/types/database.ts`
- [x] 3.3 Modify alert creation in ingestion pipeline: fetch recent alerts (7 days), pass to AI for grouping decision
- [x] 3.4 Expand AI prompt in `src/lib/ai-analysis.ts` to accept recent alerts context and return `existing_alert_id` or `null`
- [x] 3.5 Update ingestion pipeline to insert into `alert_articles` junction table (for both new and grouped alerts)
- [x] 3.6 Backfill existing alerts: create `alert_articles` rows for current alerts that have `article_id` set
- [x] 3.7 Update `src/app/(dashboard)/alerts/page.tsx` — add click-to-expand on alerts showing linked articles list
- [x] 3.8 Fetch alert articles via junction table join, display headline, outlet, date, sentiment badge, source link

## 4. Candidate Hits (Tara/GOP Hits)

- [x] 4.1 Create `candidate_hits` table migration (id, campaign_id, article_id, source_name, comment_summary, context, created_at) with RLS policies
- [x] 4.2 Add `CandidateHit` type to `src/types/database.ts`
- [x] 4.3 Add `candidate_hits` array to `AIAnalysisResult` interface in `src/lib/ai-analysis.ts`
- [x] 4.4 Expand the `ANALYSIS_PROMPT` to include candidate hit detection — extract specific negative comments about candidate or VA GOP, with source name, summary, and context
- [x] 4.5 Update ingestion pipeline to insert detected hits into `candidate_hits` table after AI analysis
- [x] 4.6 Add "Tara/GOP Hits" tab to `src/app/(dashboard)/opponents/page.tsx`
- [x] 4.7 Build hits table component: columns for source name, date, comment summary, article link, sorted by date descending
- [x] 4.8 Add empty state for when no hits have been detected

## 5. NewsConnector Module

- [x] 5.1 Create database migrations for `article_stars` (id, campaign_id, article_id, starred_at), `tags` (id, campaign_id, name, color, created_at), `article_tags` (id, article_id, tag_id, created_at), `article_notes` (id, campaign_id, article_id, content, created_at, updated_at) — all with RLS policies
- [x] 5.2 Add `ArticleStar`, `Tag`, `ArticleTag`, `ArticleNote` types to `src/types/database.ts`
- [x] 5.3 Add star toggle button to article rows in `src/app/(dashboard)/news/page.tsx`
- [x] 5.4 Create `src/app/(dashboard)/news-connector/page.tsx` — starred articles table with headline, author, outlet, date, sentiment, themes, tags
- [x] 5.5 Build tag autocomplete input component: searches existing tags, offers "Create tag: [name]" for new tags
- [x] 5.6 Build tag management on article detail: add/remove tags via autocomplete
- [x] 5.7 Build notes section on article detail: chronological list with timestamps, add note form, edit existing notes
- [x] 5.8 Add tag filter dropdown on NewsConnector page
- [x] 5.9 Add "NewsConnector" link to sidebar navigation
- [x] 5.10 Add empty state for no starred articles

## 6. ContentMap Module

- [x] 6.1 Create database migrations for `content_ideas` (id, campaign_id, category, title, content, format, source_article_ids, generated_at), `newsletter_outlines` (id, campaign_id, outline_html, source_article_ids, generated_at, period_start, period_end), `hit_responses` (id, campaign_id, hit_id, response_text, tone, generated_at) — all with RLS policies
- [x] 6.2 Add `ContentIdea`, `NewsletterOutline`, `HitResponse` types to `src/types/database.ts`
- [x] 6.3 Create `src/app/(dashboard)/content-map/page.tsx` with three-tab layout: Social & Video Ideas, Newsletter, Hit Responses
- [x] 6.4 Build AI function for social/video idea generation: takes last 3 days of articles, returns structured ideas with title, description, format, source references
- [x] 6.5 Build Social & Video Ideas tab UI: display generated ideas with format badges and source article links, "Refresh Ideas" button
- [x] 6.6 Build AI function for newsletter outline generation: takes last 24h of articles, returns structured newsletter draft for supporters
- [x] 6.7 Create newsletter outline Edge Function or extend existing digest cron to also generate newsletter outline daily at 7am EST
- [x] 6.8 Build Newsletter tab UI: display latest outline with timestamp, date selector for historical outlines
- [x] 6.9 Build AI function for hit response generation: takes a candidate_hit record, returns messaging strategy and suggested rebuttal
- [x] 6.10 Build Hit Responses tab UI: list hits with "Generate Response" buttons, display generated responses, option to regenerate
- [x] 6.11 Add "ContentMap" link to sidebar navigation

## 7. Navigation and Polish

- [x] 7.1 Update sidebar component to include NewsConnector and ContentMap navigation items with appropriate icons
- [x] 7.2 Add light pink shadow glow to all buttons globally — extend shadcn/ui Button base styles or add to `globals.css` (e.g., `box-shadow: 0 0 12px rgba(236, 72, 153, 0.3)`)
- [x] 7.3 Verify all new pages follow existing pink color palette and shadcn/ui patterns
- [x] 7.4 Add loading skeletons for all new data-fetching views (cards, alerts expansion, NewsConnector, ContentMap)
- [x] 7.5 Test end-to-end: ingest article → author extracted → hits detected → star article → tag → note → generate content
