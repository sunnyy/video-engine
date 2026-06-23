/**
 * reviewScriptPref.js — user preference for the script-review gate.
 *
 * When OFF (default), the script-led video services (AI Video, Social, Typography) generate
 * directly on one click — matching the "prompt → finished video in minutes" promise. When ON,
 * the generated script is shown in ScriptConfirmModal for review/edit before producing.
 * Persisted in localStorage so the choice sticks across services and sessions.
 */
const KEY = "vq:reviewScriptFirst";

export function getReviewScriptFirst() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setReviewScriptFirst(value) {
  try { localStorage.setItem(KEY, value ? "1" : "0"); } catch {}
}
