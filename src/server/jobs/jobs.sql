-- jobs.sql — generic background job queue (Postgres-backed; no Redis/BullMQ).
-- Run once in the Supabase SQL editor. Used by the API (enqueue) and the standalone
-- worker (claim/complete/fail). Deliberately generic so any future job type plugs in.

create table if not exists jobs (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,                       -- handler key, e.g. "render_timeline"
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'queued',      -- queued | running | completed | failed
  progress     int  not null default 0,             -- 0-100, handler-reported
  priority     int  not null default 0,             -- lower runs first
  attempts     int  not null default 0,
  max_attempts int  not null default 3,
  run_at       timestamptz not null default now(),  -- earliest run time (scheduling + backoff)
  claimed_at   timestamptz,
  finished_at  timestamptz,
  result       jsonb,
  error        text,
  user_id      uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists jobs_claimable_idx on jobs (status, priority, run_at);

-- Atomically claim the next runnable job. `for update skip locked` makes this safe
-- even if you later run more than one worker instance.
create or replace function claim_job() returns setof jobs
language plpgsql as $$
declare j jobs;
begin
  select * into j from jobs
    where status = 'queued' and run_at <= now()
    order by priority asc, run_at asc
    for update skip locked
    limit 1;
  if not found then return; end if;

  update jobs
     set status = 'running', attempts = attempts + 1, claimed_at = now(), updated_at = now()
   where id = j.id
   returning * into j;

  return next j;
end $$;

-- Server-only table: enable RLS with no policies so anon/authenticated clients can't
-- read or write it. The service-role key (supabaseAdmin) bypasses RLS.
alter table jobs enable row level security;
