-- brandKit.sql — per-user brand kit (Phase 1: 6 fields). Run once in Supabase SQL editor.
-- One kit per user for now (unique user_id); extend to multiple channels later if needed.

create table if not exists brand_kits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique,
  logo_url        text,
  channel_name    text,
  cta_text        text,
  website         text,
  primary_color   text,
  secondary_color text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Read/written server-side via the service role (routes/brandKit.js). RLS on, no public
-- policies, so anon/authenticated clients can't touch it directly.
alter table brand_kits enable row level security;
