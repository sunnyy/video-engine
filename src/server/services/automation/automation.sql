-- automation.sql — the Campaign model (replaces the single-config AutoPilot). Run once in
-- Supabase. A user has MANY campaigns; each owns its niche, schedule, style/voice/duration,
-- target accounts, privacy, brand kit, and its own topic queue + history. The scheduler,
-- generation, render and publish all key off campaign_id.
--
-- Safe at 0 users: this introduces the new automation_* tables. The old autopilot_* tables
-- are superseded — drop them with the clearly-marked block at the BOTTOM once you're ready.

-- ── Campaigns: the unit of automation (many per user) ──
create table if not exists automation_campaigns (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  name               text not null default 'Untitled campaign',
  status             text not null default 'draft',   -- draft | active | paused | stopped
  -- content
  niches             text[] not null default '{}',
  audience           text,
  tone               text,
  language           text default 'en',
  orientation        text default '9:16',
  style_id           text default 'auto',
  voice_id           text,
  target_duration    int default 40,                  -- seconds
  keywords_emphasize text[] default '{}',
  keywords_avoid     text[] default '{}',
  -- scheduling
  posts_per_day      int default 1,
  posting_times      text[] default '{}',
  ai_decide_times    boolean default true,
  last_generated_at  timestamptz,                     -- per-campaign cadence cursor
  -- publishing
  target_accounts    uuid[] default '{}',             -- references social_accounts.id (account-level)
  privacy            text default 'public',           -- public | unlisted | private
  auto_publish       boolean not null default true,   -- false = render then await approval
  brand_kit_id       uuid,                            -- nullable; per-campaign brand kit (one-vs-many TBD)
  -- caps
  daily_cap          int,
  monthly_cap        int,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists automation_campaigns_user_idx on automation_campaigns (user_id, status);
alter table automation_campaigns enable row level security;

-- ── Topic queue (now scoped to a campaign) ──
create table if not exists automation_topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  campaign_id uuid not null,
  title       text not null,
  niche       text,
  angle       text,
  keywords    text[] default '{}',
  status      text not null default 'queued',   -- queued | reserved | consumed | skipped
  created_at  timestamptz not null default now()
);
create index if not exists automation_topics_queue_idx on automation_topics (campaign_id, status, created_at);
alter table automation_topics enable row level security;

-- ── Permanent topic history per campaign (dedup + never-repeat) ──
create table if not exists automation_topic_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  campaign_id uuid,
  title       text not null,
  niche       text,
  angle       text,
  keywords    text[] default '{}',
  hook        text,
  consumed_at timestamptz not null default now()
);
create index if not exists automation_history_campaign_idx on automation_topic_history (campaign_id, consumed_at desc);
alter table automation_topic_history enable row level security;

-- Atomically reserve the next queued topic for a campaign (safe across workers).
create or replace function reserve_campaign_topic(p_campaign_id uuid) returns setof automation_topics
language plpgsql as $$
declare t automation_topics;
begin
  select * into t from automation_topics
    where campaign_id = p_campaign_id and status = 'queued'
    order by created_at asc
    for update skip locked
    limit 1;
  if not found then return; end if;
  update automation_topics set status = 'reserved' where id = t.id returning * into t;
  return next t;
end $$;

-- ── Audit log (now carries campaign_id) ──
create table if not exists automation_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  campaign_id uuid,
  action      text not null,
  entity      text,
  entity_id   text,
  status      text not null default 'ok',   -- ok | fail | retry | skip | info
  message     text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists automation_events_user_idx on automation_events (user_id, created_at desc);
create index if not exists automation_events_campaign_idx on automation_events (campaign_id, created_at desc);
create index if not exists automation_events_recent_idx on automation_events (created_at desc);
alter table automation_events enable row level security;

-- ── published_posts gains campaign_id + account_id (a publish belongs to a campaign and a
--    specific connected account). Idempotent. ──
alter table published_posts add column if not exists campaign_id uuid;
alter table published_posts add column if not exists account_id  uuid;

-- jobs: no schema change — the campaignId travels inside the job payload (jsonb).

-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️  CLEANUP — run ONLY after confirming the new model works. Drops the old
--     single-config AutoPilot tables (superseded by the automation_* tables above).
--     Destroys old test topics/history/events — fine at 0 users.
-- ─────────────────────────────────────────────────────────────────────────────
-- drop function if exists reserve_topic(uuid);
-- drop table if exists autopilot_topic_history;
-- drop table if exists autopilot_topics;
-- drop table if exists autopilot_events;
-- drop table if exists autopilot_settings;
