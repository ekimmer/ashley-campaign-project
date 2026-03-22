-- CampaignAssist Initial Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- CAMPAIGNS
-- ============================================
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  candidate_name text not null,
  district text not null,
  search_config jsonb not null default '{}'::jsonb,
  alert_email text not null,
  digest_time time not null default '07:00:00',
  created_at timestamptz not null default now()
);

-- ============================================
-- USER_CAMPAIGNS (junction table)
-- ============================================
create table public.user_campaigns (
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'viewer')),
  primary key (user_id, campaign_id)
);

-- ============================================
-- OPPONENTS
-- ============================================
create table public.opponents (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  party text,
  office_sought text,
  search_terms text[] not null default '{}',
  bio text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  source text not null default 'manual' check (source in ('detected', 'manual')),
  created_at timestamptz not null default now()
);

create index idx_opponents_campaign on public.opponents(campaign_id);

-- ============================================
-- ARTICLES
-- ============================================
create table public.articles (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  bin text not null check (bin in ('candidate', 'opponent', 'general_race')),
  headline text not null,
  url text not null,
  reporter text,
  outlet text not null,
  date_published date,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative', 'mixed')),
  reach text check (reach in ('national', 'regional', 'local', 'niche')),
  key_themes text[] not null default '{}',
  full_text text,
  ai_summary text,
  paywall_status text not null default 'open' check (paywall_status in ('open', 'bypassed', 'unavailable')),
  va_politics_relevant boolean not null default false,
  va_politics_topics text[] not null default '{}',
  alert_tier text not null default 'none' check (alert_tier in ('critical', 'high', 'standard', 'none')),
  alert_reason text,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_articles_campaign_bin on public.articles(campaign_id, bin);
create unique index idx_articles_campaign_url on public.articles(campaign_id, url);

-- ============================================
-- ARTICLE_ENTITIES (junction table)
-- ============================================
create table public.article_entities (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references public.articles(id) on delete cascade,
  opponent_id uuid references public.opponents(id) on delete set null,
  entity_name text not null,
  entity_role text not null check (entity_role in ('subject', 'mentioned', 'quoted')),
  entity_type text not null check (entity_type in ('opponent', 'supporter', 'neutral', 'other')),
  sentiment_toward text not null default 'neutral' check (sentiment_toward in ('positive', 'neutral', 'negative', 'mixed'))
);

create index idx_article_entities_article on public.article_entities(article_id);
create index idx_article_entities_opponent on public.article_entities(opponent_id);

-- ============================================
-- DETECTED_ENTITIES
-- ============================================
create table public.detected_entities (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  name text not null,
  role text not null check (role in ('opponent', 'supporter', 'neutral')),
  context text not null,
  confidence float not null default 0.0,
  resolved boolean not null default false,
  opponent_id uuid references public.opponents(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_detected_entities_campaign on public.detected_entities(campaign_id);
create index idx_detected_entities_unresolved on public.detected_entities(campaign_id) where resolved = false;

-- ============================================
-- BIN_SUMMARIES
-- ============================================
create table public.bin_summaries (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  bin text not null check (bin in ('candidate', 'opponent', 'general_race')),
  summary_text text not null,
  narrative_trend text not null default 'stable' check (narrative_trend in ('increasing', 'stable', 'declining')),
  article_count int not null default 0,
  generated_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null
);

create index idx_bin_summaries_campaign_bin on public.bin_summaries(campaign_id, bin);

-- ============================================
-- VA_POLITICS_BRIEFINGS
-- ============================================
create table public.va_politics_briefings (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  briefing_text text not null,
  hot_issues jsonb not null default '[]'::jsonb,
  so_what text not null,
  generated_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null
);

create index idx_va_briefings_campaign on public.va_politics_briefings(campaign_id);

-- ============================================
-- ALERTS
-- ============================================
create table public.alerts (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  article_id uuid references public.articles(id) on delete set null,
  tier text not null check (tier in ('critical', 'high', 'standard')),
  title text not null,
  description text not null,
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_alerts_campaign on public.alerts(campaign_id);
create index idx_alerts_unacknowledged on public.alerts(campaign_id) where acknowledged = false;

-- ============================================
-- DIGESTS
-- ============================================
create table public.digests (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  content_html text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_digests_campaign on public.digests(campaign_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table public.campaigns enable row level security;
alter table public.user_campaigns enable row level security;
alter table public.articles enable row level security;
alter table public.article_entities enable row level security;
alter table public.opponents enable row level security;
alter table public.detected_entities enable row level security;
alter table public.bin_summaries enable row level security;
alter table public.va_politics_briefings enable row level security;
alter table public.alerts enable row level security;
alter table public.digests enable row level security;

-- Helper function: get campaign IDs for current user
create or replace function public.get_user_campaign_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select campaign_id from public.user_campaigns where user_id = auth.uid();
$$;

-- CAMPAIGNS: users can view campaigns they belong to
create policy "Users can view their campaigns"
  on public.campaigns for select
  using (id in (select public.get_user_campaign_ids()));

-- USER_CAMPAIGNS: users can view their own associations
create policy "Users can view their campaign associations"
  on public.user_campaigns for select
  using (user_id = auth.uid());

-- ARTICLES: users can view/insert/update articles for their campaigns
create policy "Users can view articles for their campaigns"
  on public.articles for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert articles for their campaigns"
  on public.articles for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

-- ARTICLE_ENTITIES: access through article's campaign
create policy "Users can view article entities for their campaigns"
  on public.article_entities for select
  using (article_id in (
    select id from public.articles where campaign_id in (select public.get_user_campaign_ids())
  ));

create policy "Users can insert article entities for their campaigns"
  on public.article_entities for insert
  with check (article_id in (
    select id from public.articles where campaign_id in (select public.get_user_campaign_ids())
  ));

-- OPPONENTS: users can manage opponents for their campaigns
create policy "Users can view opponents for their campaigns"
  on public.opponents for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert opponents for their campaigns"
  on public.opponents for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can update opponents for their campaigns"
  on public.opponents for update
  using (campaign_id in (select public.get_user_campaign_ids()));

-- DETECTED_ENTITIES: users can manage detected entities for their campaigns
create policy "Users can view detected entities for their campaigns"
  on public.detected_entities for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert detected entities for their campaigns"
  on public.detected_entities for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can update detected entities for their campaigns"
  on public.detected_entities for update
  using (campaign_id in (select public.get_user_campaign_ids()));

-- BIN_SUMMARIES: users can view/insert summaries for their campaigns
create policy "Users can view bin summaries for their campaigns"
  on public.bin_summaries for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert bin summaries for their campaigns"
  on public.bin_summaries for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

-- VA_POLITICS_BRIEFINGS: users can view/insert briefings for their campaigns
create policy "Users can view VA politics briefings for their campaigns"
  on public.va_politics_briefings for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert VA politics briefings for their campaigns"
  on public.va_politics_briefings for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

-- ALERTS: users can view/update alerts for their campaigns
create policy "Users can view alerts for their campaigns"
  on public.alerts for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert alerts for their campaigns"
  on public.alerts for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can update alerts for their campaigns"
  on public.alerts for update
  using (campaign_id in (select public.get_user_campaign_ids()));

-- DIGESTS: users can view digests for their campaigns
create policy "Users can view digests for their campaigns"
  on public.digests for select
  using (campaign_id in (select public.get_user_campaign_ids()));

create policy "Users can insert digests for their campaigns"
  on public.digests for insert
  with check (campaign_id in (select public.get_user_campaign_ids()));

-- CAMPAIGNS: owners/admins can update their campaigns
create policy "Admins can update their campaigns"
  on public.campaigns for update
  using (id in (
    select campaign_id from public.user_campaigns
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));
