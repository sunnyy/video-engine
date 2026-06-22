-- security_hardening.sql — resolves Supabase Security Advisor warnings on DB functions.
-- Safe to run once in the Supabase SQL editor. These functions are ONLY called server-side
-- via the service role (no client .rpc exists), so locking out anon/authenticated changes
-- nothing for the app — we re-grant service_role so server calls keep working.

-- 1) Pin search_path (clears "Function Search Path Mutable"). No behavior change: the
--    functions reference public tables, and public stays on the path.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('deduct_credits','add_credits','reserve_topic','claim_job',
                         'reserve_campaign_topic','initialize_user_credits','rls_auto_enable')
  loop
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $$;

-- 2) Lock down execution (clears "Public/Signed-In Users Can Execute SECURITY DEFINER").
--    Revoke from everyone, then re-grant service_role only. Trigger functions still fire
--    normally (triggers run regardless of caller EXECUTE grants).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('deduct_credits','add_credits','reserve_topic','claim_job',
                         'reserve_campaign_topic','initialize_user_credits','rls_auto_enable')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant  execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- 3) posters RLS — the table is accessed ONLY server-side via the service role (see
--    routes/poster.js: inserts/deletes go through supabaseAdmin; no client query exists).
--    The always-true policy therefore serves no purpose. Drop any always-true policy on
--    posters; RLS stays enabled so browser clients get nothing (service role bypasses RLS).
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'posters'
      and (qual = 'true' or with_check = 'true')
  loop
    execute format('drop policy %I on public.posters', r.policyname);
  end loop;
end $$;
