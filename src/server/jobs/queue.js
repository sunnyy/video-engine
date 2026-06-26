/**
 * jobs/queue.js — generic Postgres-backed job queue (no Redis/BullMQ).
 *
 * The API enqueues jobs; the standalone worker (src/server/worker.js) claims and runs
 * them. Atomic claiming is done by the `claim_job()` SQL function (see jobs.sql), which
 * also increments `attempts`, so by the time a handler runs `attempts` reflects this run.
 */
import { supabaseAdmin } from "../middleware/shared.js";

const BACKOFF_BASE_MS = 30_000; // 30s, doubled per attempt

/** Enqueue a job. `runAt` (ms epoch or ISO/Date) defers execution. Returns the row. */
export async function enqueue(type, payload = {}, { userId = null, runAt = null, maxAttempts = 3, priority = 0 } = {}) {
  const row = {
    type, payload, user_id: userId, priority, max_attempts: maxAttempts,
    ...(runAt ? { run_at: new Date(runAt).toISOString() } : {}),
  };
  const { data, error } = await supabaseAdmin.from("jobs").insert(row).select().single();
  if (error) throw new Error(`enqueue(${type}) failed: ${error.message}`);
  return data;
}

/** Atomically claim the next runnable job (status→running). Returns the job or null. */
export async function claimNext() {
  const { data, error } = await supabaseAdmin.rpc("claim_job");
  if (error) throw new Error(`claim_job failed: ${error.message}`);
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
}

/** Update a running job's progress (0-100). Also refreshes the heartbeat. Best-effort. */
export async function setProgress(id, progress) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("jobs")
    .update({ progress: pct, heartbeat_at: now, updated_at: now })
    .eq("id", id);
  if (error) console.warn(`[jobs] setProgress(${id}) failed: ${error.message}`);
}

/** Refresh a running job's heartbeat so the stale sweeper doesn't reclaim it. */
export async function heartbeat(id) {
  const now = new Date().toISOString();
  await supabaseAdmin.from("jobs").update({ heartbeat_at: now, updated_at: now }).eq("id", id).then(() => {}, () => {});
}

/**
 * Recover jobs stuck in 'running' past the heartbeat deadline (crashed/killed worker):
 * requeue if attempts remain, else mark failed. Returns how many were recovered.
 */
export async function sweepStaleJobs(staleMs = 600_000) {
  const cutoff = new Date(Date.now() - staleMs).toISOString();
  const { data, error } = await supabaseAdmin.from("jobs")
    .select("id, attempts, max_attempts").eq("status", "running").lt("heartbeat_at", cutoff);
  if (error || !data?.length) return 0;
  for (const j of data) {
    const patch = j.attempts < j.max_attempts
      ? { status: "queued", run_at: new Date().toISOString(), error: "recovered: stale heartbeat", updated_at: new Date().toISOString() }
      : { status: "failed", error: "stale heartbeat, attempts exhausted", finished_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await supabaseAdmin.from("jobs").update(patch).eq("id", j.id);
  }
  return data.length;
}

/**
 * Re-queue specific jobs left 'running' when the worker is asked to drain (Railway SIGTERM on
 * redeploy). Status-guarded (.eq("status","running")) so a job that completed during the drain
 * grace window is never resurrected. This lets a redeploy resume interrupted work in seconds
 * instead of waiting out the 10-minute stale sweeper. ONE bulk UPDATE — no polling, no per-row
 * round-trips. attempts is left as-is (claim_job increments on the next claim).
 */
export async function requeueRunning(ids) {
  if (!ids?.length) return 0;
  const now = new Date().toISOString();
  // Only rows still 'running' (a job that completed in the grace window must not be resurrected).
  const { data: rows } = await supabaseAdmin.from("jobs")
    .select("id, attempts").in("id", ids).eq("status", "running");
  if (!rows?.length) return 0;
  let n = 0;
  for (const r of rows) {
    // Decrement attempts so a deploy interruption doesn't burn the retry budget — claim_job
    // re-increments on the next claim, so a clean deploy nets zero attempts against the job.
    const { error } = await supabaseAdmin.from("jobs")
      .update({ status: "queued", run_at: now, attempts: Math.max(0, (r.attempts || 0) - 1), error: "requeued: worker draining (deploy)", updated_at: now })
      .eq("id", r.id).eq("status", "running");
    if (!error) n++;
  }
  return n;
}

/** Cancel all QUEUED jobs for a campaign (Stop). Running jobs are left to finish. Returns count. */
export async function cancelCampaignJobs(campaignId) {
  const { data } = await supabaseAdmin.from("jobs")
    .update({ status: "failed", error: "cancelled (campaign stopped)", finished_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("status", "queued").filter("payload->>campaignId", "eq", campaignId).select("id");
  return (data || []).length;
}

/**
 * Cancel one job by id. QUEUED → mark failed immediately (it never ran). RUNNING → set
 * cancel_requested so the handler aborts cooperatively (see isCancelRequested). Returns
 * { ok, mode } where mode is "removed" | "aborting".
 */
export async function cancelJob(jobId) {
  const { data: job } = await supabaseAdmin.from("jobs").select("id, status").eq("id", jobId).maybeSingle();
  if (!job) return { ok: false };
  const now = new Date().toISOString();
  if (job.status === "queued") {
    await supabaseAdmin.from("jobs").update({ status: "failed", error: "canceled by user", finished_at: now, updated_at: now }).eq("id", jobId).eq("status", "queued");
    return { ok: true, mode: "removed" };
  }
  if (job.status === "running") {
    await supabaseAdmin.from("jobs").update({ cancel_requested: true, updated_at: now }).eq("id", jobId);
    cancelCache.set(jobId, { v: true, t: Date.now() });
    return { ok: true, mode: "aborting" };
  }
  return { ok: false }; // already terminal
}

// Cooperative-cancel signal for a RUNNING job. Cached briefly so a tight loop (render's
// per-frame check) doesn't hammer the DB.
const cancelCache = new Map(); // jobId -> { v, t }
export async function isCancelRequested(jobId) {
  const c = cancelCache.get(jobId);
  if (c && Date.now() - c.t < 2500) return c.v;
  let v = false;
  try { const { data } = await supabaseAdmin.from("jobs").select("cancel_requested").eq("id", jobId).maybeSingle(); v = !!data?.cancel_requested; } catch { /* default false */ }
  cancelCache.set(jobId, { v, t: Date.now() });
  return v;
}

/** Mark a job completed with an optional result payload. */
export async function complete(id, result = null) {
  const { error } = await supabaseAdmin.from("jobs")
    .update({ status: "completed", progress: 100, result, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error(`[jobs] complete(${id}) failed: ${error.message}`);
}

/**
 * Record a failure. Re-queues with exponential backoff while attempts remain, unless the
 * error is marked `noRetry` (permanent — e.g. auth/permission), in which case it fails
 * immediately. Returns true if it will retry.
 */
export async function fail(job, err) {
  const message   = (err?.message || String(err)).slice(0, 1000);
  const willRetry = !err?.noRetry && job.attempts < job.max_attempts;
  const patch = willRetry
    ? { status: "queued", run_at: new Date(Date.now() + BACKOFF_BASE_MS * 2 ** (job.attempts - 1)).toISOString(), error: message, updated_at: new Date().toISOString() }
    : { status: "failed", error: message, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const { error } = await supabaseAdmin.from("jobs").update(patch).eq("id", job.id);
  if (error) console.error(`[jobs] fail(${job.id}) update error: ${error.message}`);
  return willRetry;
}
