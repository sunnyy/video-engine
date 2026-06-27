import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import {
  sendAdminAlert, sendUserEmail,
  adminNewUserEmail, adminUserDeletedEmail, adminCreditsTopupEmail,
  adminNewSaleEmail, adminPlanRenewalEmail, adminPlanUpgradeEmail,
  userWelcomeEmail, userCreditsPurchasedEmail, userLowCreditsEmail,
  userAccountDeletedEmail, userPlanUpgradeEmail, userPlanRenewalEmail,
  userPaymentFailedEmail, userPlanExpiringEmail, userPlanExpiredEmail,
  userRenderCompleteEmail, userOnboardingNudgeEmail, userWinbackEmail,
} from "../services/emailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../../..");
export const TEMP_DIR     = path.join(PROJECT_ROOT, "src/server/temp");
export const PUBLIC_DIR   = path.join(PROJECT_ROOT, "public");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const authCache = new Map(); // token -> { user, expiresAt }
const AUTH_CACHE_TTL = 60_000; // 60 seconds

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of authCache.entries()) {
    if (val.expiresAt <= now) authCache.delete(key);
  }
}, 5 * 60_000);

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const now = Date.now();
  const cached = authCache.get(token);
  if (cached && cached.expiresAt > now) {
    req.user = cached.user;
    return next();
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });

  authCache.set(token, { user, expiresAt: now + AUTH_CACHE_TTL });
  req.user = user;
  next();
}

export async function requireAdmin(req, res, next) {
  // Re-fetch via admin API to get the authoritative app_metadata
  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });
  const meta = user.app_metadata ?? {};
  const role = meta.role;
  if (role !== "admin") return res.status(403).json({ error: "Forbidden" });
  req.adminUser = user;
  next();
}

export async function deductCredits(userId, amount, action, description, projectId = null) {
  const { data: newBalance } = await supabaseAdmin.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount:  amount,
  });

  if (newBalance === null) return { success: false, error: "Insufficient credits" };

  await supabaseAdmin
    .from("credit_transactions")
    .insert({
      user_id:      userId,
      amount:       -amount,
      type:         "deduction",
      action,
      description,
      project_id:   projectId || null,
      balance_after: newBalance,
    });

  // Low-credits warning: fire once when balance crosses below 20
  if (newBalance < 20 && newBalance + amount >= 20) {
    supabaseAdmin.auth.admin.getUserById(userId).then(async ({ data: { user } }) => {
      if (user?.email) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const { subject, html } = userLowCreditsEmail(name, newBalance);
        sendUserEmail(user.email, subject, html);
        // Lazy import avoids a circular dependency (notificationService imports this file).
        const { notifyUser } = await import("../services/notificationService.js");
        notifyUser(userId, { type: "low_credits", icon: "⚠️", severity: "warning", link: "/credits",
          title: "Your credits are running low", body: `${newBalance} credits remaining — top up to keep creating` });
      }
    }).catch(() => {});
  }

  return { success: true, balance: newBalance };
}

export async function addCredits(userId, amount, type, action, description, paymentId = null) {
  const { data: credits } = await supabaseAdmin
    .from("user_credits")
    .select("balance, lifetime_credits")
    .eq("user_id", userId)
    .single();

  const current  = credits?.balance          ?? 0;
  const lifetime = credits?.lifetime_credits ?? 0;
  const newBalance  = current  + amount;
  const newLifetime = lifetime + amount;

  const { error: upsertErr } = await supabaseAdmin
    .from("user_credits")
    .upsert({ user_id: userId, balance: newBalance, lifetime_credits: newLifetime, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (upsertErr) throw new Error(`addCredits upsert failed: ${upsertErr.message}`);

  const { error: txErr } = await supabaseAdmin
    .from("credit_transactions")
    .insert({
      user_id:      userId,
      amount,
      type,
      action,
      description,
      payment_id:   paymentId,
      balance_after: newBalance,
    });
  if (txErr) throw new Error(`addCredits transaction insert failed: ${txErr.message}`);

  return { success: true, balance: newBalance };
}

/**
 * safeMessage(err) — a user-safe version of an error for client-facing responses (SSE/JSON).
 * Our own intentional messages pass through; anything that looks like a raw internal/library error
 * (PostgREST/Postgres, a vendor name, a network/system code, a file path, or a stack trace) is
 * replaced with a generic line so we never leak the DB, schema, vendors, or server paths.
 */
const _INTERNAL_ERR = [
  /coerce the result/i,
  /\bPGRST\d+/i,
  /violates .* constraint|duplicate key|permission denied|relation .* does not exist|column .* does not exist|null value in column/i,
  /\b(openai|anthropic|elevenlabs|razorpay|supabase|postgrest|puppeteer|ffmpeg|fal\.ai|pixabay|pexels|whisper|nano banana|pixverse)\b/i,
  /\b(ENOENT|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ECONNRESET|getaddrinfo|socket hang up)\b/i,
  /\n\s+at\s/,
  /([A-Za-z]:\\|\/(app|home|usr|src|var|node_modules)\/)/,
];
export function safeMessage(err, fallback = "Something went wrong. Please try again.") {
  const msg = typeof err === "string" ? err : (err?.message || "");
  if (!msg) return fallback;
  if (msg.length > 200) return fallback;
  if (_INTERNAL_ERR.some((re) => re.test(msg))) return fallback;
  return msg;
}

export const upload = multer({ dest: TEMP_DIR });
export const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
// Sample uploads can be short videos, which are legitimately larger than images.
export const uploadSample = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

export { uuidv4 };
export {
  sendAdminAlert, sendUserEmail,
  adminNewUserEmail, adminUserDeletedEmail, adminCreditsTopupEmail,
  adminNewSaleEmail, adminPlanRenewalEmail, adminPlanUpgradeEmail,
  userWelcomeEmail, userCreditsPurchasedEmail, userLowCreditsEmail,
  userAccountDeletedEmail, userPlanUpgradeEmail, userPlanRenewalEmail,
  userPaymentFailedEmail, userPlanExpiringEmail, userPlanExpiredEmail,
  userRenderCompleteEmail, userOnboardingNudgeEmail, userWinbackEmail,
};
