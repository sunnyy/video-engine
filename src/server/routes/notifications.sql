-- notifications.sql — per-user in-app notifications. Run once in the Supabase SQL editor.
-- Rows are inserted server-side only (service role, via notificationService.notifyUser).
-- Users read and mark-read their own via RLS; inserts are blocked for clients (no insert policy).

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  type       text not null,                       -- event key, e.g. "render_complete", "plan_renewed"
  title      text not null,
  body       text,
  link       text,                                -- in-app path to open on click, e.g. "/credits"
  icon       text,                                -- emoji/glyph for the row, e.g. "🎬"
  severity   text not null default 'info',        -- info | success | warning | error
  read_at    timestamptz,                         -- null = unread
  created_at timestamptz not null default now()
);

-- Newest-first per user, with a partial index for fast unread-count lookups.
create index if not exists notifications_user_idx        on notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

-- Users may read their own notifications.
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications
  for select using (auth.uid() = user_id);

-- Users may mark their own as read (and only their own). Inserts/deletes stay server-only.
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: this table is published so the client can subscribe to INSERT/UPDATE.
-- (No-op if already a member of the publication.)
do $$
begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;
