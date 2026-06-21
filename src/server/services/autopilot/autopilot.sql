-- autopilot.sql — AutoPilot settings + topic queue + topic history. Run once in Supabase.
-- The topic queue is self-contained: it knows nothing about rendering/publishing/jobs.

-- Per-user AutoPilot configuration (the scheduler phase uses the rest of these fields).
create table if not exists autopilot_settings (
  user_id            uuid primary key,
  enabled            boolean not null default false,
  auto_publish       boolean not null default true,   -- false = render then wait for manual approval
  niches             text[] not null default '{}',
  audience           text,
  tone               text,
  language           text default 'en',
  orientation        text default '9:16',
  style_id           text default 'auto',
  voice_id           text,
  posts_per_day      int default 1,
  posting_times      text[] default '{}',
  ai_decide_times    boolean default true,
  platforms          text[] default '{}',
  keywords_emphasize text[] default '{}',
  keywords_avoid     text[] default '{}',
  brand_kit_id       uuid,
  last_generated_at  timestamptz,            -- scheduler uses this to space posts
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table autopilot_settings enable row level security;

-- The live topic queue.
create table if not exists autopilot_topics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  title      text not null,
  niche      text,
  angle      text,
  keywords   text[] default '{}',
  status     text not null default 'queued',   -- queued | reserved | consumed | skipped
  created_at timestamptz not null default now()
);
create index if not exists autopilot_topics_queue_idx on autopilot_topics (user_id, status, created_at);
alter table autopilot_topics enable row level security;

-- Permanent memory of consumed topics (dedup + never-repeat).
create table if not exists autopilot_topic_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  title       text not null,
  niche       text,
  angle       text,
  keywords    text[] default '{}',
  hook        text,
  consumed_at timestamptz not null default now()
);
create index if not exists autopilot_history_user_idx on autopilot_topic_history (user_id, consumed_at desc);
alter table autopilot_topic_history enable row level security;

-- Atomically reserve the next queued topic (safe if multiple workers run).
create or replace function reserve_topic(p_user_id uuid) returns setof autopilot_topics
language plpgsql as $$
declare t autopilot_topics;
begin
  select * into t from autopilot_topics
    where user_id = p_user_id and status = 'queued'
    order by created_at asc
    for update skip locked
    limit 1;
  if not found then return; end if;
  update autopilot_topics set status = 'reserved' where id = t.id returning * into t;
  return next t;
end $$;
