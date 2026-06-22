-- announcements.sql — admin broadcast campaigns. Run once in the Supabase SQL editor.
-- An announcement is the campaign record (one row); a broadcast_announcement job fans it
-- out into per-user `notifications` rows (each tagged with announcement_id). Server-only:
-- RLS on with no public policies — only the service role reads/writes (admin goes via API).

create table if not exists announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text,
  link         text,                                  -- optional in-app CTA path, e.g. "/credits"
  category     text not null default 'news',          -- news | promo | maintenance | warning | tip
  icon         text,                                  -- derived from category at create time
  severity     text not null default 'info',          -- info | success | warning | error
  audience     jsonb not null default '{}'::jsonb,    -- { type:'all'|'users'|'segment', userIds?, segment? }
  status       text not null default 'draft',         -- draft | scheduled | sending | sent | failed
  scheduled_at timestamptz,                            -- when set in the future, the job is deferred
  sent_count   int  not null default 0,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists announcements_created_idx on announcements (created_at desc);

alter table announcements enable row level security;

-- Link each fanned-out notification back to its campaign (grouping / future retract / stats).
alter table notifications add column if not exists announcement_id uuid;
create index if not exists notifications_announcement_idx on notifications (announcement_id);
