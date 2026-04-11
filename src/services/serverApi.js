/**
 * serverApi.js
 * src/services/serverApi.js
 *
 * Authenticated fetch wrapper for all calls to the local Express server.
 * Automatically attaches the Supabase JWT so every endpoint can verify
 * the caller is a signed-in user.
 */

import { supabase } from "../lib/supabase";

export const SERVER = "http://localhost:5000";

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Drop-in replacement for fetch() for Express server calls.
 * Adds Authorization: Bearer <token> automatically.
 * Handles both JSON and FormData bodies (doesn't set Content-Type for FormData).
 * On 402 NO_CREDITS: fires the onInsufficientCredits callback if set.
 */
export async function serverFetch(path, options = {}) {
  const token = await getAuthToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${SERVER}${path}`, { ...options, headers });

  if (res.status === 402) {
    const body = await res.clone().json().catch(() => ({}));
    if (body.code === "NO_CREDITS") {
      onInsufficientCredits();
      // Return the response so callers can still inspect res.ok (which will be false)
    }
  }

  return res;
}

/* ── Insufficient credits handler ─────────────────────────────────────────── */
// Register a global handler (set by the app root on mount).
// Default: console warning only. Replace with a toast + redirect in App.jsx.
let _onInsufficientCredits = () =>
  console.warn("[credits] Insufficient credits — no handler registered.");

export function setInsufficientCreditsHandler(fn) {
  _onInsufficientCredits = fn;
}

function onInsufficientCredits() {
  _onInsufficientCredits();
}
