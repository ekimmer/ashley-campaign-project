# Search Relevance Fix — Design Spec

## Problem

The news ingestion pipeline captures irrelevant articles (Kevin Durant skincare ads, obituaries, sports news) because:
1. Search terms like "Durant VA" are too generic — Serper returns non-political results
2. The AI analysis pipeline has no mechanism to reject irrelevant articles — every Serper result gets inserted

## Solution

Three changes, zero new API calls, zero schema changes.

### 1. Tighter Search Queries

Update the campaign's `search_config` in the database.

**Before:**
```
"Tara Durant", "Durant VA", "Durant Congress", "Durant campaign", "Durant Virginia"
```

**After:**
```
"Tara Durant", "Tara Durant Congress", "Tara Durant Virginia", "Durant congressional race", "Representative Durant Virginia"
```

Every "Durant" term now includes a political qualifier to prevent Serper from returning non-political results.

### 2. AI Relevance Gate

Add a `politically_relevant` boolean field to the existing AI analysis response. This piggybacks on the single Claude call that already runs for every article — no additional API cost.

**Prompt addition:**
> Before classifying, determine if this article is about politics, government, elections, or policy. If the article is about sports, entertainment, obituaries, business/marketing, or any non-political topic, set `politically_relevant` to false.

**Ingestion pipeline change:**
After `analyzeArticle()` returns, check `analysis.politically_relevant`. If `false`, skip the article — no database insert, no entity detection, no alerts.

**Files changed:**
- `src/lib/ai-analysis.ts` — Add `politically_relevant` to `AIAnalysisResult` interface and `ANALYSIS_PROMPT`
- `src/lib/ingestion.ts` — Add relevance check after AI analysis, before insertion

### 3. Hard Delete Existing Junk

One-time SQL cleanup targeting articles that contain Kevin Durant, CeraVe, or obituary content. Cascade-delete related rows from: `alert_articles`, `article_entities`, `detected_entities`, `candidate_hits`, `alerts` (where the alert only references a deleted article).

## Implementation Order

1. Hard delete existing junk (SQL)
2. Update search_config (SQL)
3. Add `politically_relevant` to AI prompt and interface
4. Add relevance gate in ingestion pipeline
