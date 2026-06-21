/**
 * logger.js
 * src/core/utils/logger.js
 *
 * Shared, env-gated SERVER logging. Verbose process narration (console.log / .info /
 * .debug) only prints when enabled; warnings and errors ALWAYS print so production
 * failures stay visible. Server-side only (reads process.env) — do not import in the
 * client bundle.
 *
 * Why a global gate instead of editing ~400 call sites: installLogGate() routes the
 * native console.log/info/debug through the active level, so every existing narration
 * line across all services goes quiet in production with zero per-file churn — and any
 * future console.log is covered automatically too.
 *
 * Level resolution (highest priority first):
 *   VERBOSE_LOGS=1 / true      → full narration (debug)
 *   LOG_LEVEL=<level>          → explicit: silent | error | warn | info | debug
 *   production (Railway / NODE_ENV=production) → warn  (process narration silenced)
 *   otherwise (local dev)      → debug (full narration, same as today)
 *
 * To watch the full pipeline on a deployed instance, set VERBOSE_LOGS=1 (or
 * LOG_LEVEL=debug) on the host and restart; to go fully silent set LOG_LEVEL=silent.
 */

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

function resolveLevel() {
  const env = process.env;
  if (env.VERBOSE_LOGS === "1" || env.VERBOSE_LOGS === "true") return LEVELS.debug;
  const explicit = (env.LOG_LEVEL || "").toLowerCase();
  if (explicit && explicit in LEVELS) return LEVELS[explicit];
  const isProd = env.NODE_ENV === "production"
    || !!env.RAILWAY_ENVIRONMENT || !!env.RAILWAY_ENVIRONMENT_NAME
    || !!env.RAILWAY_PROJECT_ID  || !!env.RAILWAY_SERVICE_ID;
  return isProd ? LEVELS.warn : LEVELS.debug;
}

export const LOG_LEVEL = resolveLevel();
const levelName = Object.keys(LEVELS).find((k) => LEVELS[k] === LOG_LEVEL) ?? "info";

// Keep references to the real console methods so the gate can't recurse into itself.
const nativeLog   = console.log.bind(console);
const nativeInfo  = console.info.bind(console);
const nativeDebug = console.debug.bind(console);
const nativeWarn  = console.warn.bind(console);
const nativeError = console.error.bind(console);

// Explicit logger API (use in new code; identical gating to the global console gate).
export const debug = (...a) => { if (LOG_LEVEL >= LEVELS.debug) nativeLog(...a); };
export const info  = (...a) => { if (LOG_LEVEL >= LEVELS.info)  nativeLog(...a); };
export const log   = info;
export const warn  = (...a) => { if (LOG_LEVEL >= LEVELS.warn)  nativeWarn(...a); };
export const error = (...a) => { if (LOG_LEVEL >= LEVELS.error) nativeError(...a); };

let installed = false;

/** Route the global console through the active level. Call once, as early as possible. */
export function installLogGate() {
  if (installed) return;
  installed = true;
  console.log   = (...a) => { if (LOG_LEVEL >= LEVELS.info)  nativeLog(...a); };
  console.info  = (...a) => { if (LOG_LEVEL >= LEVELS.info)  nativeInfo(...a); };
  console.debug = (...a) => { if (LOG_LEVEL >= LEVELS.debug) nativeDebug(...a); };
  console.warn  = (...a) => { if (LOG_LEVEL >= LEVELS.warn)  nativeWarn(...a); };
  console.error = (...a) => { if (LOG_LEVEL >= LEVELS.error) nativeError(...a); };
  // Always announce the active level (via the real method) so it's visible even when quiet.
  nativeWarn(`[logger] level=${levelName}${LOG_LEVEL < LEVELS.info ? " — process narration silenced (set VERBOSE_LOGS=1 to enable)" : ""}`);
}
