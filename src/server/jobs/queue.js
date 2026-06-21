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

/** Update a running job's progress (0-100). Best-effort; never throws. */
export async function setProgress(id, progress) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const { error } = await supabaseAdmin.from("jobs")
    .update({ progress: pct, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.warn(`[jobs] setProgress(${id}) failed: ${error.message}`);
}

/** Mark a job completed with an optional result payload. */
export async function complete(id, result = null) {
  const { error } = await supabaseAdmin.from("jobs")
    .update({ status: "completed", progress: 100, result, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error(`[jobs] complete(${id}) failed: ${error.message}`);
}

/**
 * Record a failure. Re-queues with exponential backoff while attempts remain,
 * otherwise marks the job failed. Returns true if it will retry.
 */
export async function fail(job, err) {
  const message   = (err?.message || String(err)).slice(0, 1000);
  const willRetry = job.attempts < job.max_attempts;
  const patch = willRetry
    ? { status: "queued", run_at: new Date(Date.now() + BACKOFF_BASE_MS * 2 ** (job.attempts - 1)).toISOString(), error: message, updated_at: new Date().toISOString() }
    : { status: "failed", error: message, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const { error } = await supabaseAdmin.from("jobs").update(patch).eq("id", job.id);
  if (error) console.error(`[jobs] fail(${job.id}) update error: ${error.message}`);
  return willRetry;
}
