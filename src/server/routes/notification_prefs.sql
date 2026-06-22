-- notification_prefs.sql — per-user notification channel preferences. Run once in Supabase.
-- prefs shape: { "<category>": { "in_app": bool, "email": bool } }. A missing category or
-- channel defaults to ON (opt-out model). Locked categories (billing, announcements) are
-- ignored here and always deliver. Users read/write only their own row via RLS.

create table if not exists notification_prefs (
  user_id    uuid primary key,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table notification_prefs enable row level security;

drop policy if exists "notif_prefs_select_own" on notification_prefs;
create policy "notif_prefs_select_own" on notification_prefs
  for select using (auth.uid() = user_id);

drop policy if exists "notif_prefs_insert_own" on notification_prefs;
create policy "notif_prefs_insert_own" on notification_prefs
  for insert with check (auth.uid() = user_id);

drop policy if exists "notif_prefs_update_own" on notification_prefs;
create policy "notif_prefs_update_own" on notification_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
