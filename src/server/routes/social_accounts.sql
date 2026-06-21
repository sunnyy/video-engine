-- social_accounts.sql — connected social platforms per user (OAuth). Run once in Supabase.
-- Multi-platform from day one; tokens are stored ENCRYPTED (AES-256-GCM) by the server.

create table if not exists social_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  platform            text not null,            -- youtube | tiktok | instagram | linkedin | x
  platform_account_id text,                     -- channel/account id on the platform
  display_name        text,                     -- channel/handle name for the UI
  access_token        text,                     -- encrypted
  refresh_token       text,                     -- encrypted
  expires_at          timestamptz,
  scopes              text,
  status              text not null default 'connected',  -- connected | revoked | error
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, platform)
);

-- Server-only (service role). RLS on, no public policies — tokens never reach the client.
alter table social_accounts enable row level security;
