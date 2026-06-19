-- ============================================================================
-- RLS HARDENING — run in the Supabase SQL editor (project: video-engine)
-- ============================================================================
-- Security Advisor flagged 5 errors across 3 tables:
--   • assets_library  — "Policy Exists RLS Disabled" + "RLS Disabled in Public"
--   • sfx_tracks      — "Policy Exists RLS Disabled" + "RLS Disabled in Public"
--   • deleted_users   — "RLS Disabled in Public"
--
-- assets_library & sfx_tracks ALREADY HAVE POLICIES — they're just not being
-- enforced because RLS is off. So the fix for those is simply ENABLE RLS (do
-- NOT create new policies — that would coexist with the existing ones).
-- deleted_users has no policies, so we enable RLS and lock it to the backend.
--
-- SAFE FOR THE BACKEND: the Express server uses the SERVICE_ROLE key, which
-- BYPASSES RLS, so server pipelines / auth / renders are unaffected.
-- ============================================================================


-- ── 1. assets_library — enable RLS (its existing policies start enforcing) ───
alter table public.assets_library enable row level security;

-- ── 2. sfx_tracks — enable RLS (its existing policies start enforcing) ───────
alter table public.sfx_tracks enable row level security;

-- ── 3. deleted_users — BACKEND ONLY (sensitive PII), no policies → fully lock ─
-- Only the server (service_role) reads/writes this; the frontend never should.
alter table public.deleted_users enable row level security;
revoke all on public.deleted_users from anon, authenticated;
grant  all on public.deleted_users to   service_role;
-- No policy = zero anon/authenticated access. service_role bypasses RLS.


-- ── 3b. sfx_tracks — admin-only WRITE (so the admin SFX page keeps working) ──
-- The catalog already has a public-read policy; this adds writes for admins only
-- (app_metadata.role = 'admin' JWT claim, matching src/App.jsx). Tighter than
-- music_tracks, which currently lets ANY authenticated user write — tighten that
-- later the same way if you want.
create policy "Admin write sfx_tracks" on public.sfx_tracks
  for all to authenticated
  using      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


-- ── 4. INSPECT the existing policies on the two catalogs ─────────────────────
-- Run this AFTER step 1-2 and sanity-check the catalogs allow public SELECT but
-- not public writes. If a policy is too permissive (e.g. allows INSERT/DELETE to
-- anon/authenticated), tighten it.
select tablename, policyname, cmd, roles, qual, with_check
from   pg_policies
where  schemaname = 'public'
and    tablename in ('assets_library', 'sfx_tracks');


-- ── 6. (OPTIONAL) Tighten music_tracks writes to admin-only ─────────────────
-- Its current single "Authenticated write music_tracks" policy is FOR ALL, so
-- it governs reads too — dropping it alone would break the music picker for
-- normal users. So we replace it with: public read + admin-only write
-- (same shape as sfx_tracks). Admin uploads keep working via the admin claim.
drop policy "Authenticated write music_tracks" on public.music_tracks;

create policy "Public read music_tracks" on public.music_tracks
  for select to anon, authenticated using (true);

create policy "Admin write music_tracks" on public.music_tracks
  for all to authenticated
  using      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


-- ── 5. VERIFY nothing in public is still unrestricted ───────────────────────
select c.relname as table_name, c.relrowsecurity as rls_enabled
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
order  by c.relname;
-- Expect: 0 rows.
