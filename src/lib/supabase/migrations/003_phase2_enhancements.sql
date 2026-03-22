-- Phase 2 Enhancements Migration
-- Run this in the Supabase SQL Editor
-- Adds: alert_articles, candidate_hits, article_stars, tags, article_tags, article_notes,
--        content_ideas, newsletter_outlines, hit_responses

-- ============================================
-- ALERT_ARTICLES (junction table for alert aggregation)
-- ============================================
create table public.alert_articles (
  id uuid primary key default uuid_generate_v4(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_alert_articles_alert on public.alert_articles(alert_id);
create index idx_alert_articles_article on public.alert_articles(article_id);
create unique index idx_alert_articles_unique on public.alert_articles(alert_id, article_id);

-- ============================================
-- CANDIDATE_HITS (negative comments about candidate/party)
-- ============================================
create table public.candidate_hits (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  source_name text not null,
  comment_summary text not null,
  context text not null,
  created_at timestamptz not null default now()
);

create index idx_candidate_hits_campaign on public.candidate_hits(campaign_id);
create index idx_candidate_hits_article on public.candidate_hits(article_id);

-- ============================================
-- ARTICLE_STARS (starred articles for NewsConnector)
-- ============================================
create table public.article_stars (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  starred_at timestamptz not null default now()
);

create unique index idx_article_stars_unique on public.article_stars(campaign_id, article_id);

-- ============================================
-- TAGS (global managed tag pool per campaign)
-- ============================================
create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create index idx_tags_campaign on public.tags(campaign_id);
create unique index idx_tags_campaign_name on public.tags(campaign_id, name);

-- ============================================
-- ARTICLE_TAGS (junction: articles <-> tags)
-- ============================================
create table public.article_tags (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index idx_article_tags_unique on public.article_tags(article_id, tag_id);

-- ============================================
-- ARTICLE_NOTES (chronological notes per article)
-- ============================================
create table public.article_notes (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_article_notes_article on public.article_notes(article_id);

-- ============================================
-- CONTENT_IDEAS (AI-generated social/video ideas)
-- ============================================
create table public.content_ideas (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  category text not null check (category in ('social', 'video', 'interview')),
  title text not null,
  content text not null,
  format text not null,
  source_article_ids uuid[] not null default '{}',
  generated_at timestamptz not null default now()
);

create index idx_content_ideas_campaign on public.content_ideas(campaign_id);

-- ============================================
-- NEWSLETTER_OUTLINES (daily AI-generated newsletter)
-- ============================================
create table public.newsletter_outlines (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  outline_html text not null,
  source_article_ids uuid[] not null default '{}',
  generated_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null
);

create index idx_newsletter_outlines_campaign on public.newsletter_outlines(campaign_id);

-- ============================================
-- HIT_RESPONSES (AI-generated responses to hits)
-- ============================================
create table public.hit_responses (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  hit_id uuid not null references public.candidate_hits(id) on delete cascade,
  response_text text not null,
  tone text,
  generated_at timestamptz not null default now()
);

create index idx_hit_responses_campaign on public.hit_responses(campaign_id);
create index idx_hit_responses_hit on public.hit_responses(hit_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all new tables
alter table public.alert_articles enable row level security;
alter table public.candidate_hits enable row level security;
alter table public.article_stars enable row level security;
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_notes enable row level security;
alter table public.content_ideas enable row level security;
alter table public.newsletter_outlines enable row level security;
alter table public.hit_responses enable row level security;

-- ALERT_ARTICLES: access through alert's campaign
create policy "Users can view alert articles for their campaigns"
  on public.alert_articles for select
  using (alert_id in (
    select id from public.alerts where campaign_id in (select public.get_user_campaign_ids())
  ));

create policy "Users can insert alert articles for their campaigns"
  on public.alert_articles for insert
  with check (alert_id in (
    select id from public.alerts where campaign_id in (select public.get_user_campaign_ids())
  ));

-- CANDIDATE_HITS: scoped to campaign
create policy "Users can view candidate hits for their campaigns"
  on public.candidate_hits for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert candidate hits for their campaigns"
  on public.candidate_hits for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

-- ARTICLE_STARS: scoped to campaign
create policy "Users can view article stars for their campaigns"
  on public.article_stars for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert article stars for their campaigns"
  on public.article_stars for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can delete article stars for their campaigns"
  on public.article_stars for delete
  using (campaign_id in (select public.get_user_campaign_ids()));

-- TAGS: scoped to campaign
create policy "Users can view tags for their campaigns"
  on public.tags for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert tags for their campaigns"
  on public.tags for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can update tags for their campaigns"
  on public.tags for update
  using (campaign_id in (select public.get_user_campaign_ids()));

-- ARTICLE_TAGS: access through article's campaign
create policy "Users can view article tags for their campaigns"
  on public.article_tags for select
  using (article_id in (
    select id from public.articles where campaign_id in (select public.get_user_campaign_ids())
  ));

create policy "Users can insert article tags for their campaigns"
  on public.article_tags for insert
  with check (article_id in (
    select id from public.articles where campaign_id in (select public.get_user_campaign_ids())
  ));

create policy "Users can delete article tags for their campaigns"
  on public.article_tags for delete
  using (article_id in (
    select id from public.articles where campaign_id in (select public.get_user_campaign_ids())
  ));

-- ARTICLE_NOTES: scoped to campaign
create policy "Users can view article notes for their campaigns"
  on public.article_notes for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert article notes for their campaigns"
  on public.article_notes for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can update article notes for their campaigns"
  on public.article_notes for update
  using (campaign_id in (select public.get_user_campaign_ids()));

-- CONTENT_IDEAS: scoped to campaign
create policy "Users can view content ideas for their campaigns"
  on public.content_ideas for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert content ideas for their campaigns"
  on public.content_ideas for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

-- NEWSLETTER_OUTLINES: scoped to campaign
create policy "Users can view newsletter outlines for their campaigns"
  on public.newsletter_outlines for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert newsletter outlines for their campaigns"
  on public.newsletter_outlines for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

-- HIT_RESPONSES: scoped to campaign
create policy "Users can view hit responses for their campaigns"
  on public.hit_responses for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert hit responses for their campaigns"
  on public.hit_responses for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

-- ============================================
-- BACKFILL: Create alert_articles rows for existing alerts
-- ============================================
insert into public.alert_articles (alert_id, article_id, created_at)
select id, article_id, created_at
from public.alerts
where article_id is not null
on conflict do nothing;
