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
import { claimNext, complete, fail } from "./jobs/queue.js";
import { getHandler, registeredTypes } from "./jobs/registry.js";

const MAX_CONCURRENT = Math.max(1, parseInt(process.env.WORKER_CONCURRENCY || "1", 10));
const POLL_MS        = Math.max(500, parseInt(process.env.WORKER_POLL_MS || "3000", 10));

let active  = 0;
let running = true;

async function runJob(job) {
  active++;
  try {
    const handler = getHandler(job.type);
    if (!handler) throw new Error(`no handler registered for job type "${job.type}"`);
    const result = await handler(job.payload ?? {}, job);
    await complete(job.id, result ?? null);
    console.log(`[worker] done ${job.type} (${job.id})`);
  } catch (err) {
    const retry = await fail(job, err);
    console.warn(`[worker] ${retry ? "retry" : "FAILED"} ${job.type} (${job.id}): ${err.message}`);
  } finally {
    active--;
  }
}

// Claim as many jobs as free concurrency allows, then idle until the next poll.
async function drain() {
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
    await drain();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

// Graceful shutdown — Railway sends SIGTERM on redeploy. Stop claiming, let active
// jobs finish (in-flight rows stay 'running'; a stuck one can be requeued by a sweeper).
function shutdown(sig) {
  if (!running) return;
  console.log(`[worker] ${sig} — draining ${active} active job(s)…`);
  running = false;
  const start = Date.now();
  const wait = setInterval(() => {
    if (active === 0 || Date.now() - start > 25_000) {
      clearInterval(wait);
      console.log("[worker] exit");
      process.exit(0);
    }
  }, 500);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

loop().catch((e) => { console.error("[worker] fatal:", e); process.exit(1); });
