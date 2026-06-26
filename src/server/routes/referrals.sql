-- referrals.sql — invite-a-friend referral program. Run once in Supabase (idempotent; safe to re-run).
-- referral_code lives on profiles (generated server-side, one per user). referrals rows are written
-- server-side only via routes/referrals.js. Users read their own rows via RLS; all writes use the service role.

-- Each user's shareable code.
alter table profiles add column if not exists referral_code text;
create unique index if not exists profiles_referral_code_idx on profiles (referral_code) where referral_code is not null;

-- One row per referred signup. Referee bonus is granted immediately on claim; the referrer reward
-- is granted later, on the referee's first purchase (anti-abuse), flipping status → 'qualified'.
create table if not exists referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_id       uuid not null,                      -- who shared the link
  referee_id        uuid not null unique,               -- the new user (one referral per signup)
  code              text not null,                      -- referral_code used at claim time
  status            text not null default 'pending',    -- pending | qualified
  referee_rewarded  boolean not null default false,     -- referee signup bonus granted
  referrer_rewarded boolean not null default false,     -- referrer reward granted (on referee's first purchase)
  created_at        timestamptz not null default now(),
  qualified_at      timestamptz                         -- when the referee first purchased
);
create index if not exists referrals_referrer_idx on referrals (referrer_id, created_at desc);

alter table referrals enable row level security;
drop policy if exists "referrals_select_involved" on referrals;
create policy "referrals_select_involved" on referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referee_id);
