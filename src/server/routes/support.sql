-- support.sql — user support tickets with a threaded conversation. Run once in Supabase.
-- Tickets and messages are written server-side only (service role, via routes/support.js).
-- Users read their own via RLS; admins read everything through the service-role API.

create table if not exists support_tickets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  subject         text not null,
  category        text not null default 'other',     -- billing | technical | quality | account | other
  status          text not null default 'open',      -- open | in_progress | waiting_on_user | resolved | closed
  priority        text not null default 'normal',    -- low | normal | high
  project_id      uuid,                               -- optional: ticket about a specific project
  last_message_at timestamptz not null default now(), -- for sorting; updated on every message
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists support_tickets_user_idx   on support_tickets (user_id, last_message_at desc);
create index if not exists support_tickets_status_idx on support_tickets (status, last_message_at desc);

alter table support_tickets enable row level security;
drop policy if exists "support_tickets_select_own" on support_tickets;
create policy "support_tickets_select_own" on support_tickets
  for select using (auth.uid() = user_id);

create table if not exists support_ticket_messages (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      uuid not null references support_tickets(id) on delete cascade,
  author_id      uuid,                                -- who wrote it (user id or admin id)
  sender         text not null default 'user',        -- user | admin
  body           text not null,
  attachment_url text,                                -- optional screenshot
  created_at     timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on support_ticket_messages (ticket_id, created_at);

alter table support_ticket_messages enable row level security;
drop policy if exists "support_messages_select_own" on support_ticket_messages;
create policy "support_messages_select_own" on support_ticket_messages
  for select using (
    exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- SLA reminder bookkeeping + CSAT (idempotent; safe to re-run).
alter table support_tickets add column if not exists sla_reminded_at timestamptz; -- last overdue-digest time (throttle)
alter table support_tickets add column if not exists csat_rating int;             -- 1..5, set by user after resolve/close
alter table support_tickets add column if not exists csat_comment text;
alter table support_tickets add column if not exists csat_at timestamptz;

-- Canned replies — admin-managed reusable answers. Server-only (RLS on, no public policies).
create table if not exists support_canned_replies (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table support_canned_replies enable row level security;
