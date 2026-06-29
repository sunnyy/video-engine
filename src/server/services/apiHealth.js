/**
 * apiHealth.js — a lightweight circuit-breaker / health registry for our external dependencies.
 *
 * Each external client reports success/failure per CAPABILITY. After TRIP_THRESHOLD consecutive
 * INTERNAL failures (our provider down / quota / 5xx / network — NOT bad user input), the capability
 * trips to `down`, we email the admin ONCE, and it surfaces on the admin Monitoring dashboard + the
 * public status page. A later successful call flips it back to healthy (+ a "recovered" email).
 *
 * Phase 1 = detection + alerting + status surfaces only (no blocking). Phase 2 wires enforcement
 * (fast-fail manual generation + pause automation) for `critical` capabilities.
 *
 * State lives in the `api_health` table (shared across the web + worker processes). Reads are cached
 * briefly; the happy path (a successful call on an already-healthy capability) does NO DB write.
 *
 *   create table if not exists api_health (
 *     capability text primary key, status text not null default 'healthy', fail_count int not null
 *     default 0, tripped_at timestamptz, last_error text, updated_at timestamptz not null default now());
 */
import { supabaseAdmin } from "../middleware/shared.js";
import { sendAdminAlert } from "./emailService.js";

// `critical` = no fallback; a sustained outage should halt generation (enforced in Phase 2).
// `label` is the admin/user-facing name — we NEVER expose provider names or raw errors publicly.
export const CAPABILITIES = {
  voiceover:  { label: "Voiceover",       critical: true  }, // ElevenLabs TTS
  script:     { label: "Script & design", critical: true  }, // OpenAI (GPT)
  storage:    { label: "Media storage",   critical: true  }, // Supabase storage
  ai_image:   { label: "AI images",       critical: false }, // Fal / FLUX — has fallbacks
  stock:      { label: "Stock media",     critical: false }, // Pexels / Pixabay — has fallbacks
  publishing: { label: "Publishing",      critical: false }, // YouTube — pause publishing only
};

const TRIP_THRESHOLD = 4;     // consecutive internal failures before a capability is declared down
const CACHE_TTL_MS   = 10_000;

let _cache = { at: 0, rows: null };
function invalidate() { _cache = { at: 0, rows: null }; }

async function loadAll() {
  const now = Date.now();
  if (_cache.rows && now - _cache.at < CACHE_TTL_MS) return _cache.rows;
  let rows = _cache.rows || [];
  try {
    const { data } = await supabaseAdmin.from("api_health").select("*");
    rows = data || [];
    _cache = { at: now, rows };
  } catch { /* keep last cache on a transient DB read error */ }
  return rows;
}

/** Report a SUCCESSFUL call. Near-free when the capability is already healthy (cache read, no write). */
export async function reportOk(capability) {
  if (!CAPABILITIES[capability]) return;
  try {
    const rows = await loadAll();
    const r = rows.find((x) => x.capability === capability);
    if (!r) return;                                            // never failed → no row → nothing to reset
    if (r.status === "healthy" && (r.fail_count ?? 0) === 0) return;
    const wasDown = r.status === "down";
    await supabaseAdmin.from("api_health").upsert(
      { capability, status: "healthy", fail_count: 0, last_error: null, tripped_at: null, updated_at: new Date().toISOString() },
      { onConflict: "capability" });
    invalidate();
    if (wasDown) {
      const lbl = CAPABILITIES[capability].label;
      sendAdminAlert(`✅ ${lbl} recovered`, `<p><b>${lbl}</b> is responding normally again.</p>`).catch(() => {});
      console.log(`[apiHealth] ${capability} recovered`);
    }
  } catch (e) { console.warn("[apiHealth] reportOk failed:", e.message); }
}

/** Report a FAILED call. Only `internal` failures count toward tripping. Trips + alerts once at the threshold. */
export async function reportFail(capability, { internal = true, message = "" } = {}) {
  if (!CAPABILITIES[capability] || !internal) return;
  try {
    const { data: row } = await supabaseAdmin.from("api_health")
      .select("status, fail_count").eq("capability", capability).maybeSingle();
    const nextCount   = (row?.fail_count ?? 0) + 1;
    const alreadyDown = row?.status === "down";
    const tripping    = !alreadyDown && nextCount >= TRIP_THRESHOLD;
    await supabaseAdmin.from("api_health").upsert(
      { capability, status: (tripping || alreadyDown) ? "down" : "healthy", fail_count: nextCount,
        last_error: String(message || "").slice(0, 300), updated_at: new Date().toISOString(),
        ...(tripping ? { tripped_at: new Date().toISOString() } : {}) },
      { onConflict: "capability" });
    invalidate();
    if (tripping) {
      const lbl = CAPABILITIES[capability].label;
      sendAdminAlert(`⚠️ ${lbl} appears down`,
        `<p><b>${lbl}</b> failed ${nextCount} times in a row.</p>` +
        `<p>Latest error: ${String(message || "").slice(0, 300)}</p>` +
        `<p>Anything that needs it may be affected — check the provider.</p>`).catch(() => {});
      console.warn(`[apiHealth] ${capability} TRIPPED → down (${nextCount} consecutive failures)`);
    }
  } catch (e) { console.warn("[apiHealth] reportFail failed:", e.message); }
}

/**
 * Run an external call and auto-report ok/fail. `classify(err) → boolean` decides whether a thrown
 * error is INTERNAL (counts toward tripping); defaults to treating any throw as internal.
 */
export async function track(capability, fn, classify) {
  try {
    const out = await fn();
    reportOk(capability).catch(() => {});
    return out;
  } catch (err) {
    const internal = classify ? !!classify(err) : true;
    reportFail(capability, { internal, message: err?.message }).catch(() => {});
    throw err;
  }
}

/** True if a capability is currently tripped (cached). */
export async function isDown(capability) {
  const rows = await loadAll();
  return rows.some((r) => r.capability === capability && r.status === "down");
}

/** Full health snapshot for the admin dashboard (includes internal fields). */
export async function getHealth() {
  const rows = await loadAll();
  const byId = Object.fromEntries(rows.map((r) => [r.capability, r]));
  return Object.entries(CAPABILITIES).map(([id, meta]) => {
    const r = byId[id] || {};
    return {
      capability: id, label: meta.label, critical: meta.critical,
      status: r.status || "healthy", fail_count: r.fail_count ?? 0,
      tripped_at: r.tripped_at || null, last_error: r.last_error || null, updated_at: r.updated_at || null,
    };
  });
}

/** SANITIZED snapshot for the PUBLIC status page — only operational state, never provider/error details. */
export async function getPublicStatus() {
  const health = await getHealth();
  const components = health.map((h) => ({ name: h.label, status: h.status === "down" ? "down" : "operational" }));
  const anyDown = components.some((c) => c.status === "down");
  return { status: anyDown ? "degraded" : "operational", components, updatedAt: new Date().toISOString() };
}
