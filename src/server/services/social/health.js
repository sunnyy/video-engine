/**
 * social/health.js — proactive OAuth health monitor. Runs periodically in the worker.
 * For every connected account it: refreshes tokens that are close to expiry, validates
 * the refresh path still works, and — the moment an account first goes bad — flips its
 * status to 'error' and emails the user to reconnect (so publishing never silently dies).
 *
 * It only emails on the connected→error TRANSITION, so a broken account isn't re-spammed
 * every cycle. Re-connecting (saveAccount sets status back to 'connected') re-arms it.
 */
import { supabaseAdmin, sendUserEmail } from "../../middleware/shared.js";
import { notifyUser } from "../notificationService.js";
import { encrypt, decrypt } from "./crypto.js";
import { getAdapter } from "./adapters/index.js";
import { getAppCredentials } from "./appCredentials.js";
import { logEvent } from "../automation/events.js";

const REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // refresh anything expiring within 24h

async function notifyBroken(userId, platform, reason) {
  try {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (user?.email) {
      await sendUserEmail(user.email, `Reconnect your ${platform} account`,
        `<p>Your <b>${platform}</b> connection stopped working, so Automation can no longer publish to it.</p>
         <p>Open Vidquence and reconnect ${platform} to resume automatic posting.</p>`);
    }
  } catch (_) {}
  notifyUser(userId, { type: "social_disconnected", icon: "🔌", severity: "error", link: "/connections",
    title: `Reconnect your ${platform} account`, body: `Your ${platform} connection stopped working — reconnect to resume posting.` });
}

/** Mark an account broken (once) and notify — no-op if it was already in error. */
async function markBroken(acct, reason) {
  if (acct.status === "error") return false; // already flagged → don't re-notify
  await supabaseAdmin.from("social_accounts").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", acct.id);
  await notifyBroken(acct.user_id, acct.platform, reason);
  logEvent({ userId: acct.user_id, action: "oauth_health", entity: "account", entityId: acct.id, status: "fail", message: reason, meta: { platform: acct.platform } });
  return true;
}

/**
 * One health pass over all accounts. Returns a summary {checked, refreshed, broken}.
 * Best-effort per account — one bad account never aborts the sweep.
 */
export async function checkOAuthHealth() {
  const { data: accounts, error } = await supabaseAdmin.from("social_accounts").select("*");
  if (error || !accounts?.length) return { checked: 0, refreshed: 0, broken: 0 };

  let refreshed = 0, broken = 0;
  for (const acct of accounts) {
    try {
      const expiresAt = acct.expires_at ? new Date(acct.expires_at).getTime() : 0;
      const expiringSoon = expiresAt - Date.now() < REFRESH_WINDOW_MS;
      if (!expiringSoon && acct.status === "connected") continue; // healthy, not due

      const refreshToken = decrypt(acct.refresh_token);
      if (!refreshToken) { if (await markBroken(acct, "no refresh token")) broken++; continue; }

      const creds = await getAppCredentials(acct.user_id, acct.platform);
      const fresh = await getAdapter(acct.platform).refresh(refreshToken, creds);
      await supabaseAdmin.from("social_accounts").update({
        access_token: encrypt(fresh.access_token), expires_at: fresh.expires_at,
        status: "connected", updated_at: new Date().toISOString(),
      }).eq("id", acct.id);
      refreshed++;
      if (acct.status === "error") logEvent({ userId: acct.user_id, action: "oauth_health", entity: "account", entityId: acct.id, status: "ok", message: "recovered", meta: { platform: acct.platform } });
    } catch (e) {
      if (await markBroken(acct, e.message)) broken++;
    }
  }
  return { checked: accounts.length, refreshed, broken };
}
