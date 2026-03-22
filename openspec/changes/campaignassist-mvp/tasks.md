## 1. Project Scaffolding and Configuration

- [x] 1.1 Initialize Next.js 14+ project with App Router, TypeScript, and Tailwind CSS
- [x] 1.2 Install and configure shadcn/ui with pink color palette (CSS variables in globals.css)
- [x] 1.3 Set up Supabase client library (@supabase/supabase-js, @supabase/ssr) and environment variables
- [x] 1.4 Create project directory structure: app/(auth), app/(dashboard), lib/, components/, types/
- [x] 1.5 Set up Resend SDK and email utility configuration
- [x] 1.6 Set up Anthropic SDK (Claude) client configuration
- [x] 1.7 Set up Serper API client configuration

## 2. Supabase Database Schema and RLS

- [x] 2.1 Create `campaigns` table with all fields from design (name, candidate_name, district, search_config, alert_email, digest_time)
- [x] 2.2 Create `user_campaigns` junction table (user_id, campaign_id, role)
- [x] 2.3 Create `articles` table with all classification fields, indexes on campaign_id + bin and campaign_id + url
- [x] 2.4 Create `article_entities` junction table (article_id, opponent_id, entity_name, entity_role, entity_type, sentiment_toward)
- [x] 2.5 Create `opponents` table (campaign_id, name, party, search_terms, status, source)
- [x] 2.6 Create `detected_entities` table (campaign_id, article_id, name, role, context, confidence, resolved, opponent_id)
- [x] 2.7 Create `bin_summaries` table (campaign_id, bin, summary_text, narrative_trend, article_count, period dates)
- [x] 2.8 Create `va_politics_briefings` table (campaign_id, briefing_text, hot_issues, so_what, period dates)
- [x] 2.9 Create `alerts` table (campaign_id, article_id, tier, title, description, acknowledged)
- [x] 2.10 Create `digests` table (campaign_id, content_html, sent_at)
- [x] 2.11 Write RLS policies for all tables scoped to user's campaigns via user_campaigns
- [x] 2.12 Create seed migration: Tara Durant campaign record, Ashley's user-campaign association, initial search_config

## 3. Authentication

- [x] 3.1 Build login page with email/password form (Supabase Auth)
- [x] 3.2 Implement auth middleware for protected routes (redirect unauthenticated users to login)
- [x] 3.3 Implement session persistence and logout functionality
- [x] 3.4 Create auth context/hook for accessing current user and campaign in client components

## 4. Dashboard Layout and Navigation

- [x] 4.1 Build sidebar navigation component with links: News Tracker, VA Politics, Alerts, Opponents, Settings
- [x] 4.2 Build header component with CampaignAssist branding, campaign name display, and user menu (settings, logout)
- [x] 4.3 Build dashboard layout wrapper with sidebar + header + main content area
- [x] 4.4 Implement active navigation indicator and unacknowledged alert count badge on Alerts nav item
- [x] 4.5 Implement critical alert banner at top of main content area (shows when unacknowledged critical alerts exist)

## 5. News Ingestion Pipeline

- [x] 5.1 Build Serper API search function: accepts search terms, returns structured article results
- [x] 5.2 Build article scraper function: fetches URL, extracts article text, handles paywall detection
- [x] 5.3 Build deduplication logic: check article URL against existing articles for the campaign
- [x] 5.4 Build ingestion orchestrator: polls Serper for each bin's search terms (candidate, each opponent, general race), deduplicates, scrapes, and stores raw articles
- [x] 5.5 Create Supabase Edge Function for scheduled ingestion (cron every 30 minutes)
- [x] 5.6 Create Next.js API route for manual "Scan Now" trigger

## 6. AI Analysis Pipeline

- [x] 6.1 Define Claude structured output schema (bin, sentiment, reach, key_themes, ai_summary, va_politics_relevant, va_politics_topics, alert_tier, alert_reason, detected entities)
- [x] 6.2 Build AI analysis function: sends article to Claude Sonnet, parses structured response, updates article record
- [x] 6.3 Implement retry logic with exponential backoff (3 retries) for Claude API failures
- [x] 6.4 Build entity extraction handler: inserts detected entities from AI response into detected_entities table
- [x] 6.5 Build alert creation handler: creates alert records for articles with alert_tier critical/high/standard
- [x] 6.6 Integrate AI analysis into ingestion pipeline: analyze each new article after scraping

## 7. Bin Summaries and VA Politics Briefing

- [x] 7.1 Build bin summary generation function: queries recent articles for a bin, sends to Claude, produces 200-300 word summary with narrative trend
- [x] 7.2 Build VA Politics briefing generation function: queries VA-politics-relevant articles, sends to Claude, produces briefing with hot issues and "So What" section
- [x] 7.3 Trigger bin summary regeneration when new articles are added to a bin
- [x] 7.4 Create Supabase Edge Function for daily briefing regeneration (runs with digest cron)
- [x] 7.5 Create API route for manual briefing refresh ("Refresh Briefing" button)

## 8. News Tracker UI

- [x] 8.1 Build three-bin tab interface (Candidate, Opponents, General Race)
- [x] 8.2 Build article data table with columns: Headline (linked), Reporter, Outlet, Date, Sentiment (color-coded), Reach, Key Themes, Paywall Status
- [x] 8.3 Implement table sorting (by any column) and filtering (by sentiment, date range)
- [x] 8.4 Build rolling AI summary display above each bin's table (summary text, last updated, narrative trend indicator)
- [x] 8.5 Build article detail view (modal or panel): AI summary, key themes, detected entities, full text
- [x] 8.6 Implement "Scan Now" button in header with loading state and result notification

## 9. Opponent Management UI

- [x] 9.1 Build detected entities review queue: list of pending entities with name, role, source article, context, confidence, and Approve/Dismiss actions
- [x] 9.2 Implement entity deduplication display: group same-name entities, show article count
- [x] 9.3 Build "Add Opponent" form (manual creation with name and optional details)
- [x] 9.4 Build opponent list view: name, party, status, source, article count, date added
- [x] 9.5 Build opponent edit form: edit search terms, deactivate/reactivate
- [x] 9.6 Build opponent detail view: filtered article table showing articles associated with that opponent

## 10. VA Politics UI

- [x] 10.1 Build VA Politics page with latest briefing display (briefing text, generation timestamp, "So What" section)
- [x] 10.2 Build hot-button issues ranked list display (issue name, summary, partisan lean, district relevance)
- [x] 10.3 Implement "Refresh Briefing" button with loading state
- [x] 10.4 Build empty state for when no briefing data exists yet

## 11. Alert System UI

- [x] 11.1 Build alerts list page: alerts sorted by date, color-coded tier indicators (red/amber/green)
- [x] 11.2 Implement acknowledge alert action (mark as acknowledged with timestamp)
- [x] 11.3 Implement filter alerts by tier
- [x] 11.4 Build unacknowledged alert count badge (used in sidebar nav)

## 12. Email Delivery

- [x] 12.1 Build critical alert email template (React Email): headline, outlet, sentiment, alert reason, dashboard link
- [x] 12.2 Build daily digest email template (React Email): overnight summary, article counts per bin, alerts, VA politics highlights
- [x] 12.3 Implement critical alert email sending (triggered immediately on critical alert creation)
- [x] 12.4 Build digest generation function: compose digest content from last 24h of data
- [x] 12.5 Create Supabase Edge Function for daily digest cron (configurable time)

## 13. Settings Page

- [x] 13.1 Build settings page with campaign configuration form: campaign name, candidate name, search terms, alert email, digest time
- [x] 13.2 Implement settings save with validation and success/error feedback

## 14. Loading States, Empty States, and Polish

- [x] 14.1 Add loading spinners/skeletons for all data-fetching views
- [x] 14.2 Add empty states with helpful messages for all sections (no articles, no alerts, no opponents, no briefing)
- [x] 14.3 Responsive layout: collapsible sidebar on smaller screens
- [x] 14.4 Final visual polish: consistent pink palette, typography, spacing
