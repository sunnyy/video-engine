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
  heartbeat_at timestamptz,                          -- liveness; stale = crashed worker
  cancel_requested boolean not null default false,   -- cooperative abort of a RUNNING job
  finished_at  timestamptz,
  result       jsonb,
  error        text,
  user_id      uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists jobs_claimable_idx on jobs (status, priority, run_at);

-- Idempotent adds for existing deployments.
alter table jobs add column if not exists heartbeat_at timestamptz;
alter table jobs add column if not exists progress int not null default 0;
alter table jobs add column if not exists cancel_requested boolean not null default false;

-- Atomically claim the next runnable job. `for update skip locked` makes this safe across
-- workers. Enforces a HARD concurrency guard at claim time: at most one running
-- generate_video per user (other eligible jobs are still claimed).
create or replace function claim_job() returns setof jobs
language plpgsql as $$
declare j jobs;
begin
  for j in
    select * from jobs
      where status = 'queued' and run_at <= now()
      order by priority asc, run_at asc
      for update skip locked
      limit 20
  loop
    if j.type = 'generate_video' and exists (
      select 1 from jobs r
       where r.type = 'generate_video' and r.status = 'running'
         and r.payload->>'userId' = j.payload->>'userId'
    ) then
      continue;  -- user already has one generating — leave this queued
    end if;

    update jobs
       set status = 'running', attempts = attempts + 1, claimed_at = now(), heartbeat_at = now(), updated_at = now()
     where id = j.id
     returning * into j;
    return next j;
    return;  -- claim exactly one
  end loop;
end $$;

-- Global kill switch + other runtime flags (toggle without redeploy).
create table if not exists system_flags (
  key        text primary key,
  bool_value boolean,
  updated_at timestamptz not null default now()
);

-- Server-only tables: RLS on, no public policies (service-role bypasses RLS).
alter table jobs enable row level security;
alter table system_flags enable row level security;
