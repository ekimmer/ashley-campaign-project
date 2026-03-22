-- CampaignAssist Seed Data
-- Run this AFTER creating Ashley's user account via Supabase Auth
-- Replace 'ASHLEY_USER_ID' with Ashley's actual auth.users.id

-- Create the Tara Durant campaign
insert into public.campaigns (id, name, candidate_name, district, search_config, alert_email, digest_time)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Tara Durant for Virginia',
  'Tara Durant',
  'Virginia Congressional District',
  '{
    "candidate_terms": [
      "Tara Durant",
      "Durant VA",
      "Durant Congress",
      "Durant campaign",
      "Durant Virginia"
    ],
    "general_race_terms": [
      "VA congressional race",
      "Virginia congressional election",
      "Virginia Congress 2026"
    ]
  }'::jsonb,
  'ASHLEY_EMAIL_HERE',
  '07:00:00'
);

-- Associate Ashley with the campaign as owner
-- IMPORTANT: Replace ASHLEY_USER_ID with the actual UUID from auth.users
-- You can find this in the Supabase Dashboard > Authentication > Users
-- insert into public.user_campaigns (user_id, campaign_id, role)
-- values ('ASHLEY_USER_ID', 'a0000000-0000-0000-0000-000000000001', 'owner');
