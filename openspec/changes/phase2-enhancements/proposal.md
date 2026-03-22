## Why

Ashley Headrick has been using the CampaignAssist MVP in production and identified concrete gaps between what's built and what her daily workflow demands. The current UI layout makes bin navigation clunky, alerts lack article context, reporter names are frequently missing, and there's no way to track negative attacks against the candidate. Beyond fixes, she needs two new modules — a research workspace for organizing important articles (NewsConnector) and an AI content generation layer (ContentMap) that turns intelligence into actionable campaign outputs. These changes transform CampaignAssist from a monitoring tool into an operational campaign platform.

## What Changes

### Existing Module Improvements
- **News Tracker layout overhaul**: Replace tab-based bin navigation with three large clickable dashboard cards at the top of the page (showing article count + narrative trend). Clicking a card populates the summary and article table below.
- **Alert article drill-down with aggregation**: Alerts expand on click to show linked articles. New AI-driven aggregation groups related alerts — when a new alert-worthy article arrives, the AI checks if it belongs to an existing recent alert topic and bins it accordingly.
- **Generalized author extraction**: Enhance the article scraper to extract author/byline from meta tags, JSON-LD structured data, byline CSS patterns, and attribution sections — not just explicitly labeled "reporter" fields.

### New Feature: Tara/GOP Hits
- **Comment-level negative hit detection**: Expand the AI analysis prompt to extract specific negative comments/statements directed at Tara Durant or the Virginia GOP from within articles. New "Tara/GOP Hits" tab on the Opponents page with table: source name, date, comment summary, article link.

### New Module: NewsConnector
- **Star-to-save workflow**: Add star button to each article in News Tracker. Starred articles appear in the NewsConnector module.
- **Global tag system**: Campaign-wide managed tag pool with autocomplete. Tags are reusable across articles.
- **Article notes**: Chronological free-text notes per starred article, timestamped and editable.

### New Module: ContentMap
- **Social & video ideas**: AI-generated social media post and video concepts based on current news cycle, optimized for impact and virality.
- **Daily newsletter outline**: Cron-generated daily newsletter outline for supporters, derived from recent news coverage.
- **Hit response generation**: AI-generated responses to negative hits from the Tara/GOP Hits system (depends on hit detection being built first).

## Capabilities

### New Capabilities
- `news-tracker-cards`: Dashboard card layout for bin navigation with at-a-glance stats (replaces tab interface)
- `alert-aggregation`: AI-driven alert grouping and article drill-down on the alerts page
- `author-extraction`: Generalized author/byline extraction in the scraping pipeline
- `candidate-hits`: Comment-level negative hit detection and tracking (Tara/GOP Hits tab)
- `news-connector`: Star articles, global tag system, and per-article notes workspace
- `content-map`: AI-generated social ideas, daily newsletter outline, and hit response content

### Modified Capabilities
(None — all changes are additive. Existing news-tracker and alert-system behavior is preserved, with new UI/features layered on top.)

## Impact

- **Database**: New tables for `candidate_hits`, `article_stars`, `article_tags`, `tags`, `article_notes`, `content_map_items`, `newsletter_outlines`
- **AI pipeline**: Expanded Claude Sonnet prompt to extract comment-level hits and alert aggregation decisions. New AI calls for ContentMap generation.
- **Scraper**: Enhanced author extraction logic in `src/lib/scraper.ts`
- **UI**: New dashboard card component, alert expansion component, NewsConnector page, ContentMap page, Opponents tab addition
- **Cron jobs**: New daily cron for newsletter outline generation (alongside existing digest cron)
- **API costs**: Modest increase — hit detection is part of existing per-article call; ContentMap adds ~1-2 AI calls/day for newsletter and social ideas
