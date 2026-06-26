/**
 * referralService.js — client wrappers for the referral API (serverFetch handles auth).
 * Used by the Invite & Earn page, the admin referrals view, and the post-signup claim in App.jsx.
 */
import { serverFetch } from "../serverApi";

async function json(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

const REF_KEY = "vq_ref"; // referral code captured from ?ref= and held across the OAuth round-trip

/** Capture ?ref=CODE from the current URL into localStorage (call early on public pages). */
export function captureRefFromUrl() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) localStorage.setItem(REF_KEY, code.trim().toUpperCase());
  } catch { /* ignore */ }
}

/** Claim a stored referral code after sign-in. No-ops if none stored; clears it after attempting. */
export async function claimStoredReferral() {
  let code;
  try { code = localStorage.getItem(REF_KEY); } catch { code = null; }
  if (!code) return null;
  try {
    return await json(await serverFetch("/api/referrals/claim", { method: "POST", body: JSON.stringify({ code }) }));
  } catch {
    return null;
  } finally {
    try { localStorage.removeItem(REF_KEY); } catch { /* ignore */ }
  }
}

/* ── User ── */
export async function getMyReferrals() {
  return json(await serverFetch("/api/referrals/me"));
}

/* ── Admin ── */
export async function adminListReferrals() {
  return json(await serverFetch("/api/admin/referrals"));
}
