-- BYO OAuth app credentials: each user connects YouTube (and future platforms) through
-- their OWN cloud project, so uploads run on their own API quota. The client_secret is
-- stored encrypted by the app (AES-256-GCM); this table is only ever read/written by the
-- server via the service role, so no client-facing RLS policies are granted.

create table if not exists public.social_app_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  platform      text not null,
  client_id     text not null,
  client_secret text not null,            -- encrypted blob (iv:tag:data), never plaintext
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, platform)
);

-- Server-only access (service role bypasses RLS). Enabling RLS with no policies blocks all
-- direct client access to these secrets.
alter table public.social_app_credentials enable row level security;
