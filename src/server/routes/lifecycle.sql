-- lifecycle.sql — dedupe log for triggered lifecycle emails (onboarding nudge, win-back).
-- Run once in Supabase (idempotent). Written server-side only by the daily cron in index.js;
-- RLS stays on with no policies (never read from the client).

create table if not exists lifecycle_email_log (
  user_id  uuid not null,
  type     text not null,                       -- onboarding_nudge | winback
  sent_at  timestamptz not null default now(),  -- last time this type was sent to this user
  primary key (user_id, type)
);

alter table lifecycle_email_log enable row level security;
