/**
 * worker.js — standalone background worker. Run as a SEPARATE Railway service with
 * start command `npm run worker` (NOT the same service as the API). It owns all heavy,
 * long-running work — video generation, rendering, publishing — so the API process is
 * never blocked. Postgres-backed queue (jobs table); concurrency is controlled here.
 *
 * Env:
 *   WORKER_CONCURRENCY  max jobs running at once (default 1 — renders are heavy)
 *   WORKER_POLL_MS      idle poll interval in ms (default 3000)
 */
import "./middleware/shared.js";        // initialises env + supabaseAdmin
import "./jobs/handlers.js";            // side-effect: registers all job handlers
import { claimNext, complete, fail, sweepStaleJobs, requeueRunning } from "./jobs/queue.js";
import { isKillSwitchOn, touchWorkerHeartbeat } from "./jobs/flags.js";
import { getHandler, registeredTypes } from "./jobs/registry.js";
import { tick as schedulerTick } from "./services/automation/scheduler.js";
import { checkOAuthHealth } from "./services/social/health.js";
import { notifyUser } from "./services/notificationService.js";

// User-facing copy for a job that has permanently failed (retries exhausted). Deliberately
// vague — never narrate pipeline internals or surface raw errors.
const FAILURE_COPY = {
  render_timeline: { icon: "⚠️", title: "Your video render didn't finish", body: "Something went wrong — please try again.", link: "/projects" },
  publish_post:    { icon: "⚠️", title: "Publishing didn't go through", body: "We couldn't publish your video — please try again.", link: "/automation" },
  generate_video:  { icon: "⚠️", title: "Automation couldn't make your video", body: "Generation didn't complete — we'll try again on the next run.", link: "/automation" },
};

function notifyJobFailed(job, err) {
  const userId = job?.payload?.userId;
  if (!userId) return;
  // The quota/credit pause path already sent its own "Campaign paused" notification.
  if ((err?.message || "").startsWith("Campaign paused")) return;
  const copy = FAILURE_COPY[job.type];
  if (copy) notifyUser(userId, { type: `${job.type}_failed`, severity: "error", ...copy });
}

const MAX_CONCURRENT = Math.max(1, parseInt(process.env.WORKER_CONCURRENCY || "1", 10));
const POLL_MS        = Math.max(500, parseInt(process.env.WORKER_POLL_MS || "3000", 10));
const SCHEDULER_MS   = Math.max(30_000, parseInt(process.env.SCHEDULER_TICK_MS || "60000", 10));
const STALE_MS       = Math.max(120_000, parseInt(process.env.WORKER_STALE_MS || "600000", 10));
const SWEEP_MS       = 60_000;
const OAUTH_HEALTH_MS = Math.max(600_000, parseInt(process.env.OAUTH_HEALTH_MS || "21600000", 10)); // 6h

let active  = 0;
let running = true;
// id → type of jobs currently in flight, so a SIGTERM drain can re-queue the safe-to-resume ones.
const activeJobs = new Map();

// Job types that are SAFE to auto-requeue when the worker is drained mid-flight (idempotent or
// cheap to redo). render_timeline is keyed by renderId=jobId so a re-run upserts the same output.
// publish_post is intentionally EXCLUDED — re-running could double-upload to YouTube; it's left to
// the 10-min stale sweeper instead. Override via DRAIN_REQUEUE_TYPES (comma-separated).
const DRAIN_REQUEUE_TYPES = new Set(
  (process.env.DRAIN_REQUEUE_TYPES || "render_timeline").split(",").map((s) => s.trim()).filter(Boolean),
);

async function runJob(job) {
  active++;
  activeJobs.set(job.id, job.type);
  try {
    const handler = getHandler(job.type);
    if (!handler) throw new Error(`no handler registered for job type "${job.type}"`);
    const result = await handler(job.payload ?? {}, job);
    await complete(job.id, result ?? null);
    console.log(`[worker] done ${job.type} (${job.id})`);
  } catch (err) {
    const retry = await fail(job, err);
    console.warn(`[worker] ${retry ? "retry" : "FAILED"} ${job.type} (${job.id}): ${err.message}`);
    if (!retry) notifyJobFailed(job, err);
  } finally {
    active--;
    activeJobs.delete(job.id);
  }
}

// Claim as many jobs as free concurrency allows, then idle until the next poll.
async function drain() {
  // Global kill switch: stop claiming new jobs; in-flight jobs finish gracefully.
  if (await isKillSwitchOn().catch(() => false)) return;
  while (running && active < MAX_CONCURRENT) {
    let job;
    try { job = await claimNext(); }
    catch (e) { console.error("[worker] claim error:", e.message); break; }
    if (!job) break;
    runJob(job); // intentionally not awaited — `active` caps concurrency
  }
}

async function loop() {
  console.log(`[worker] started — concurrency=${MAX_CONCURRENT}, poll=${POLL_MS}ms, handlers=[${registeredTypes().join(", ") || "none yet"}]`);
  while (running) {
    await touchWorkerHeartbeat();  // liveness signal for the monitoring dashboard
    await drain();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

// AutoPilot scheduler — enqueues generate_video for due users (the producer side).
const schedulerTimer = setInterval(() => {
  if (running) schedulerTick().catch((e) => console.error("[scheduler] tick error:", e.message));
}, SCHEDULER_MS);
schedulerTimer.unref?.();

// Stale-job sweeper — recover jobs left 'running' by a crashed/restarted worker.
const sweepTimer = setInterval(() => {
  if (running) sweepStaleJobs(STALE_MS).then((n) => { if (n) console.warn(`[worker] recovered ${n} stale job(s)`); }).catch(() => {});
}, SWEEP_MS);
sweepTimer.unref?.();

// OAuth health monitor — refresh expiring tokens, flag/notify broken accounts.
const runOAuthHealth = () => {
  if (!running) return;
  checkOAuthHealth()
    .then((s) => { if (s.refreshed || s.broken) console.log(`[oauth-health] checked=${s.checked} refreshed=${s.refreshed} broken=${s.broken}`); })
    .catch((e) => console.warn("[oauth-health] error:", e.message));
};
const oauthTimer = setInterval(runOAuthHealth, OAUTH_HEALTH_MS);
oauthTimer.unref?.();
setTimeout(runOAuthHealth, 30_000); // first pass shortly after boot

// Graceful shutdown — Railway sends SIGTERM on redeploy. Stop claiming, then immediately
// re-queue the drain-safe in-flight jobs so the NEXT container resumes them in seconds instead
// of waiting out the 10-min stale sweeper (this is what left a Publish render stuck at 80% after
// a deploy). Non-drain-safe jobs (e.g. publish_post) are left to finish or to the sweeper.
async function shutdown(sig) {
  if (!running) return;
  running = false;
  console.log(`[worker] ${sig} — draining ${active} active job(s)…`);

  const resumeIds = [...activeJobs].filter(([, type]) => DRAIN_REQUEUE_TYPES.has(type)).map(([id]) => id);
  if (resumeIds.length) {
    try {
      const n = await requeueRunning(resumeIds);
      if (n) console.log(`[worker] re-queued ${n} interrupted job(s) for fast resume on next deploy`);
    } catch (e) { console.warn("[worker] drain requeue failed:", e.message); }
  }

  const start = Date.now();
  const wait = setInterval(() => {
    if (active === 0 || Date.now() - start > 25_000) {
      clearInterval(wait);
      console.log("[worker] exit");
      process.exit(0);
    }
  }, 500);
}
process.on("SIGTERM", () => { shutdown("SIGTERM"); });
process.on("SIGINT",  () => { shutdown("SIGINT"); });

loop().catch((e) => { console.error("[worker] fatal:", e); process.exit(1); });
