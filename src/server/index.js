import express from "express";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import {
  supabaseAdmin, TEMP_DIR, PROJECT_ROOT,
  sendUserEmail, sendAdminAlert, userPlanExpiredEmail, userPlanExpiringEmail,
  userOnboardingNudgeEmail, userWinbackEmail,
} from "./middleware/shared.js";
import { notifyUser } from "./services/notificationService.js";
import { adminSlaDigestEmail } from "./services/emailService.js";
import { router as renderRouter }     from "./routes/render.js";
import { router as ttsRouter }        from "./routes/tts.js";
import { router as authRouter }       from "./routes/auth.js";
import { router as assetsRouter }     from "./routes/assets.js";
import { router as paymentsRouter } from "./routes/payments.js";
import { router as productAdRouter }  from "./routes/productAd.js";
import { router as posterRouter }     from "./routes/poster.js";
import { router as thumbnailRouter }  from "./routes/thumbnail.js";
import { router as outfitRouter }     from "./routes/outfit.js";
import { router as socialPostRouter } from "./routes/socialPost.js";
import { router as bannerRouter }     from "./routes/banner.js";
import { router as adminRouter }        from "./routes/admin.js";
import { router as announcementsRouter } from "./routes/announcements.js";
import { router as refundClaimsRouter } from "./routes/refundClaims.js";
import { router as supportRouter }       from "./routes/support.js";
import { router as referralsRouter }     from "./routes/referrals.js";
import { router as couponsRouter }        from "./routes/coupons.js";
import { router as helpRouter }           from "./routes/help.js";
import { router as productVideoRouter } from "./routes/productVideo.js";
import { router as productVideoSceneRouter } from "./routes/productVideoScene.js";
import { router as typographyVideoRouter } from "./routes/typographyVideo.js";
import { router as saasVideoRouter }      from "./routes/saasVideo.js";
import { router as socialVideoRouter }     from "./routes/socialVideo.js";
import { router as promptVideoRouter }      from "./routes/promptVideo.js";
import { router as talkingHeadRouter }      from "./routes/talkingHead.js";
import { router as videoClippingRouter }    from "./routes/videoClipping.js";
import { router as brandKitRouter }         from "./routes/brandKit.js";
import { router as socialRouter }           from "./routes/social.js";
import { router as automationRouter }       from "./routes/automation.js";
import { router as flagsRouter }            from "./routes/flags.js";
import { router as monitoringRouter }       from "./routes/monitoring.js";
import { router as statusRouter }            from "./routes/status.js";
import { router as devLabRouter }            from "./routes/devLab.js";
import { router as devSnapshotRouter }       from "./routes/devSnapshot.js";
import { installLogGate } from "../core/utils/logger.js";
import { instrumentOpenAI } from "./services/apiHealth.js";
import { openai } from "./middleware/shared.js";

// Gate all process-narration logs by level (quiet in production, verbose locally or
// with VERBOSE_LOGS=1). warn/error always print. Must run before any request handling.
installLogGate();

// Instrument the shared OpenAI client once so every GPT call reports "script" API health.
instrumentOpenAI(openai);

console.log("Server starting...", new Date().toISOString());

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by"); // don't advertise Express

// ── CORS: allow only our own origins for browser cross-origin calls. Server-to-server
// requests (Razorpay/Supabase webhooks, OAuth redirects) send no Origin header → allowed.
// Override the list with ALLOWED_ORIGINS (comma-separated) without a code change.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://vidquence.com,https://www.vidquence.com,https://app.vidquence.com,http://localhost:5173,http://localhost:5000")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
}));

// ── Baseline security headers (dependency-free). CSP is intentionally omitted here — the app
// loads many external origins (Razorpay, PostHog, Supabase, Google Fonts, stock CDNs, video),
// so a Content-Security-Policy needs careful per-source allowlisting and is a separate task.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Permissions-Policy", "geolocation=(), browsing-topics=()");
  next();
});

app.use(express.json({ limit: "100mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────
// Philosophy: limits exist to stop ONE actor's abuse (scripts / many tabs), NOT to throttle a
// paying user moving across our many services. So we key by USER when signed in (shared IPs and
// heavy multi-service sessions never collide), keep cheap calls on a very generous cap, and put
// only a generous-but-bounded cap on heavy paid jobs (which already self-limit via time + credits).
const WINDOW_MS = 15 * 60 * 1000;

// Per signed-in user (hash of the bearer token) when present, else per IP (IPv6-safe).
function clientKey(req) {
  const m = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (m) return "u:" + crypto.createHash("sha256").update(m[1]).digest("hex").slice(0, 24);
  return "ip:" + ipKeyGenerator(req.ip);
}
const makeLimiter = (max, message) => rateLimit({
  windowMs: WINDOW_MS, max, keyGenerator: clientKey,
  message: { error: message }, standardHeaders: true, legacyHeaders: false,
});

// Cheap, high-frequency calls: editor save/load, asset & voice lists, social connect, plan/analyze,
// status. A legit heavy session bursts many of these — keep it roomy.
const generalLimiter = makeLimiter(1000, "Too many requests, please slow down for a moment.");
// Heavy paid generation/render. Each costs credits and takes time, so a human can't realistically
// hit this from one tab — it only catches multi-tab/scripted bursts.
const generationLimiter = makeLimiter(40, "You're starting jobs very fast — please wait a moment before the next one.");
// Unauthenticated / brute-force surface (webhooks): strict, per IP (default IP key).
const authLimiter = rateLimit({
  windowMs: WINDOW_MS, max: 40,
  message: { error: "Too many attempts, please try again later." },
  standardHeaders: true, legacyHeaders: false,
});

// Heavy, expensive endpoints (paid generation + Remotion render). Missing one here just means it
// falls under the generous general limiter — not a failure — so this is the protective layer on the
// KNOWN-expensive routes, not an exhaustive classifier.
const HEAVY_PATHS = [
  /\/generate[\w-]*(\/|$)/,                   // /generate AND hyphenated paid generators
                                             // (generate-clip / -tts / -image(s) / -base-image / -scenes / -concepts / -zone-assets / -layout-*)
  /\/produce(\/|$)/,                          // social / typography produce
  /\/plan(\/|$)/,                             // free-but-paid review step (GPT) — bound the per-user burst
  /^\/render\/timeline(\/|$)/,                // editor export (Remotion)
  /^\/promo-video\/(create|transcribe-th)(\/|$)/,
  /^\/promo-video\/[^/]+\/render(\/|$)/,      // saas project render
];
const isHeavyPath = (p) => HEAVY_PATHS.some((re) => re.test(p));

app.use("/api", (req, res, next) => {
  const p = req.path; // mount-relative (e.g. "/ai-video/generate", "/render/status/…")
  // High-frequency read-only polling — never limited.
  if (p.startsWith("/render/status/")) return next();
  if (p.startsWith("/automation/")) return next();
  if (p === "/monitoring/metrics") return next();
  // Unauthenticated webhook surface — strict per-IP.
  if (p.startsWith("/webhooks/")) return authLimiter(req, res, next);
  // Heavy paid jobs — bounded per-user.
  if (isHeavyPath(p)) return generationLimiter(req, res, next);
  // Everything else — generous per-user.
  return generalLimiter(req, res, next);
});

app.use("/renders", express.static(TEMP_DIR));

/* ── Temp directory cleanup ── */
const MAX_TEMP_AGE_MS = 24 * 60 * 60 * 1000;

function cleanTempDir() {
  if (!fs.existsSync(TEMP_DIR)) return;
  const now = Date.now();
  const files = fs.readdirSync(TEMP_DIR);
  let deleted = 0;
  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile() && now - stat.mtimeMs > MAX_TEMP_AGE_MS) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    } catch { /* file already gone */ }
  }
  if (deleted > 0) console.log(`[temp cleanup] Deleted ${deleted} files older than 24h`);
}

cleanTempDir();
setInterval(cleanTempDir, 6 * 60 * 60 * 1000);

/* ── Route mounts ── */
// Rate limiting for these is handled centrally by the /api dispatcher above (heavy paths →
// per-user generationLimiter), so the routers mount plainly here.
app.use("/api/promo-video",      saasVideoRouter);
app.use("/api/product-video",    productVideoRouter);
app.use("/api/product-video",    productVideoSceneRouter);
app.use("/api/typography-video", typographyVideoRouter);
app.use("/api/social-video",     socialVideoRouter);
app.use("/api/ai-video",         promptVideoRouter);
app.use("/api/talking-head",     talkingHeadRouter);
app.use("/api/video-clipping",   videoClippingRouter);
app.use("/api/render",       renderRouter);
app.use("/api/brand-kit",    brandKitRouter);
app.use("/api/social",       socialRouter);
app.use("/api/automation",   automationRouter);
app.use("/api/flags",        flagsRouter);
app.use("/api/monitoring",   monitoringRouter);
app.use("/api/status",       statusRouter); // PUBLIC system status (no auth) — sanitized component states
app.use("/api/product-ad",   productAdRouter);
app.use("/api/poster",       posterRouter);
app.use("/api/thumbnail",    thumbnailRouter);
app.use("/api/outfit",       outfitRouter);
app.use("/api/social-post",  socialPostRouter);
app.use("/api/banner",       bannerRouter);
app.use("/api/admin",        adminRouter);
app.use("/api/admin",        announcementsRouter);
app.use("/api/dev",          devSnapshotRouter); // local-dev project snapshot (fetch + preview frames); BEFORE the auth'd lab router
app.use("/api/dev",          devLabRouter); // private AI Video step-through lab (admin only)
app.use("/api",              ttsRouter);
app.use("/api",              authRouter);
app.use("/api",              assetsRouter);
app.use("/api",              paymentsRouter);
app.use("/api",              refundClaimsRouter);
app.use("/api",              supportRouter);
app.use("/api",              referralsRouter);
app.use("/api",              couponsRouter);
app.use("/api",              helpRouter);

/* ── Serve built frontend — must come after all API routes ── */
app.use(express.static(path.join(PROJECT_ROOT, "dist")));
app.use((_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, "dist", "index.html"));
});

/* ── Daily plan expiry check ── */
async function checkPlanExpiry() {
  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const { data: expired } = await supabaseAdmin
      .from("subscriptions")
      .select("id, user_id, plans(name)")
      .eq("status", "active")
      .lt("current_period_end", now.toISOString());

    for (const sub of expired || []) {
      await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
      if (user?.email) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const { data: credRow } = await supabaseAdmin.from("user_credits").select("balance").eq("user_id", sub.user_id).maybeSingle();
        const { subject, html } = userPlanExpiredEmail(name, sub.plans?.name || "your", credRow?.balance ?? null);
        sendUserEmail(user.email, subject, html);
        notifyUser(sub.user_id, { type: "plan_expired", icon: "⏰", severity: "error", link: "/credits",
          title: `Your ${sub.plans?.name || "plan"} has expired`, body: "Resubscribe to keep premium features — your credits never expire." });
      }
    }
    if (expired?.length) console.log(`[expiry] Marked ${expired.length} subscriptions as expired`);

    const { data: expiring } = await supabaseAdmin
      .from("subscriptions")
      .select("id, user_id, current_period_end, plans(name)")
      .eq("status", "active")
      .gte("current_period_end", in2Days.toISOString())
      .lt("current_period_end", in3Days.toISOString())
      .is("expiry_warned_at", null);

    for (const sub of expiring || []) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
      if (user?.email) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const expiryDate = new Date(sub.current_period_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const { data: credRow } = await supabaseAdmin.from("user_credits").select("balance").eq("user_id", sub.user_id).maybeSingle();
        const { subject, html } = userPlanExpiringEmail(name, sub.plans?.name || "your", expiryDate, credRow?.balance ?? null);
        sendUserEmail(user.email, subject, html);
        notifyUser(sub.user_id, { type: "plan_expiring", icon: "⏳", severity: "warning", link: "/credits",
          title: `Your ${sub.plans?.name || "plan"} expires soon`, body: `Expires ${expiryDate} — renew to keep access.` });
        await supabaseAdmin.from("subscriptions").update({ expiry_warned_at: new Date().toISOString() }).eq("id", sub.id);
      }
    }
    if (expiring?.length) console.log(`[expiry] Sent expiry warnings for ${expiring.length} subscriptions`);
  } catch (err) {
    console.error("[expiry] checkPlanExpiry failed:", err.message);
  }
}

setInterval(checkPlanExpiry, 24 * 60 * 60 * 1000);

// Support SLA: email the admin a digest of tickets past their response target (by priority).
// Only counts tickets where it's the admin's turn (open/in_progress). Throttled per ticket
// via sla_reminded_at (12h) so the same ticket isn't re-emailed every sweep.
const SUPPORT_SLA_HOURS = { high: 4, normal: 24, low: 72 };
async function checkSupportSla() {
  try {
    const now = Date.now();
    const { data: tickets } = await supabaseAdmin
      .from("support_tickets")
      .select("id, subject, user_id, priority, last_message_at, sla_reminded_at")
      .in("status", ["open", "in_progress"]);
    const overdue = (tickets || []).filter((t) => {
      const dueMs = new Date(t.last_message_at).getTime() + (SUPPORT_SLA_HOURS[t.priority] ?? 24) * 3600_000;
      if (now < dueMs) return false;
      if (t.sla_reminded_at && now - new Date(t.sla_reminded_at).getTime() < 12 * 3600_000) return false;
      return true;
    });
    if (!overdue.length) return;

    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailById = {}; for (const u of users || []) emailById[u.id] = u.email;
    const rows = overdue.map((t) => ({
      subject: t.subject, user_email: emailById[t.user_id] || "—",
      hoursOverdue: Math.floor((now - (new Date(t.last_message_at).getTime() + (SUPPORT_SLA_HOURS[t.priority] ?? 24) * 3600_000)) / 3600_000),
    }));
    const mail = adminSlaDigestEmail({ tickets: rows });
    sendAdminAlert(mail.subject, mail.html);
    await supabaseAdmin.from("support_tickets").update({ sla_reminded_at: new Date().toISOString() }).in("id", overdue.map((t) => t.id));
    console.log(`[support-sla] reminded admin of ${overdue.length} overdue ticket(s)`);
  } catch (err) {
    console.error("[support-sla] failed:", err.message);
  }
}
setInterval(checkSupportSla, 60 * 60 * 1000);   // hourly
setTimeout(checkSupportSla, 45_000);            // shortly after boot

// Lifecycle re-engagement emails (triggered, in-house). Two nudges, deduped via lifecycle_email_log
// and gated by the user's "tips" notification preference (so they're opt-out):
//   • onboarding_nudge — signed up 2–14 days ago, still hasn't created a project (sent once).
//   • winback — activated, but inactive 14–45 days; sent once per inactivity episode (re-arms when
//     they become active again, since their last activity then moves past the last-sent marker).
const DAY_MS = 24 * 60 * 60 * 1000;
async function checkLifecycleEmails() {
  try {
    const now = Date.now();
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (!users?.length) return;

    // Last activity (latest project update) + which users have any project.
    const { data: projs } = await supabaseAdmin.from("projects").select("user_id, updated_at");
    const lastActivity = {}; const hasProject = new Set();
    for (const p of projs || []) {
      hasProject.add(p.user_id);
      const t = new Date(p.updated_at).getTime();
      if (!lastActivity[p.user_id] || t > lastActivity[p.user_id]) lastActivity[p.user_id] = t;
    }

    // Already-sent log (dedupe).
    const { data: logs } = await supabaseAdmin.from("lifecycle_email_log").select("user_id, type, sent_at");
    const sentAt = {}; for (const l of logs || []) sentAt[`${l.user_id}|${l.type}`] = new Date(l.sent_at).getTime();

    const fire = async (u, type, notif, buildEmail) => {
      const name = u.user_metadata?.full_name || u.user_metadata?.name || "";
      const tpl = buildEmail(name);
      await notifyUser(u.id, { ...notif, email: { to: u.email, subject: tpl.subject, html: tpl.html } });
      await supabaseAdmin.from("lifecycle_email_log").upsert(
        { user_id: u.id, type, sent_at: new Date().toISOString() }, { onConflict: "user_id,type" });
    };

    let nudges = 0, winbacks = 0;
    for (const u of users) {
      if (!u.email) continue;
      const created = u.created_at ? new Date(u.created_at).getTime() : 0;
      const ageDays = created ? (now - created) / DAY_MS : 0;

      // Onboarding nudge — hasn't created anything yet.
      if (!hasProject.has(u.id) && ageDays >= 2 && ageDays <= 14 && !sentAt[`${u.id}|onboarding_nudge`]) {
        await fire(u, "onboarding_nudge", {
          type: "onboarding_nudge", icon: "🎬", severity: "info", link: "/dashboard",
          title: "Ready to make your first video?", body: "Your free credits are waiting — it takes about two minutes.",
        }, userOnboardingNudgeEmail);
        nudges++;
        continue;
      }

      // Win-back — activated but gone quiet for 14–45 days, once per episode.
      const la = lastActivity[u.id];
      if (la) {
        const inactiveDays = (now - la) / DAY_MS;
        const nudgedThisEpisode = (sentAt[`${u.id}|winback`] || 0) > la;
        if (inactiveDays >= 14 && inactiveDays <= 45 && !nudgedThisEpisode) {
          await fire(u, "winback", {
            type: "winback", icon: "👋", severity: "info", link: "/dashboard",
            title: "We saved your spot", body: "Your projects and credits are right where you left them.",
          }, userWinbackEmail);
          winbacks++;
        }
      }
    }
    if (nudges || winbacks) console.log(`[lifecycle] sent ${nudges} onboarding nudge(s), ${winbacks} win-back(s)`);
  } catch (err) {
    console.error("[lifecycle] failed:", err.message);
  }
}
setInterval(checkLifecycleEmails, 24 * 60 * 60 * 1000);  // daily
setTimeout(checkLifecycleEmails, 90_000);                // shortly after boot

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
