-- published_posts.sql — record of every publish attempt per platform. Run once in Supabase.
-- A publish row is created/updated by the publish_post job (separate from rendering).

create table if not exists published_posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,
  platform         text not null,
  platform_post_id text,                              -- e.g. YouTube video id
  video_url        text not null,                     -- the rendered MP4 it published
  status           text not null default 'queued',    -- queued | running | published | failed
  error            text,
  meta             jsonb,                             -- minimal debug (http status, privacy, publishAt)
  published_at     timestamptz,
  scheduled_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists published_posts_user_idx on published_posts (user_id, created_at desc);

alter table published_posts enable row level security;
