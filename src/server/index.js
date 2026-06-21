import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import {
  supabaseAdmin, TEMP_DIR, PROJECT_ROOT,
  sendUserEmail, userPlanExpiredEmail, userPlanExpiringEmail,
} from "./middleware/shared.js";
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
import { router as refundClaimsRouter } from "./routes/refundClaims.js";
import { router as productVideoRouter } from "./routes/productVideo.js";
import { router as productVideoSceneRouter } from "./routes/productVideoScene.js";
import { router as typographyVideoRouter } from "./routes/typographyVideo.js";
import { router as saasVideoRouter }      from "./routes/saasVideo.js";
import { router as socialVideoRouter }     from "./routes/socialVideo.js";
import { router as promptVideoRouter }      from "./routes/promptVideo.js";

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
app.use(cors());

app.use(express.json({ limit: "100mb" }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Generation limit reached, please wait before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", (req, res, next) => {
  // Exempt render status polling — it's a long-running endpoint and has no security risk
  if (req.path.startsWith("/render/status/")) return next();
  return generalLimiter(req, res, next);
});
app.use("/api/generate", generationLimiter);
app.use("/api/image-generation/generate", generationLimiter);
app.use("/api/poster/generate", generationLimiter);
app.use("/api/thumbnail/generate", generationLimiter);
app.use("/api/outfit/generate", generationLimiter);
app.use("/api/social-post/generate", generationLimiter);
app.use("/api/banner/generate", generationLimiter);
app.use("/api/product-ad/generate", generationLimiter);
app.use("/api/tts/generate", generationLimiter);
app.use("/api/webhooks", authLimiter);

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
app.use("/api/promo-video",       generationLimiter, saasVideoRouter);
app.use("/api/product-video",    generationLimiter, productVideoRouter);
app.use("/api/product-video",    generationLimiter, productVideoSceneRouter);
app.use("/api/typography-video", generationLimiter, typographyVideoRouter);
app.use("/api/social-video",    generationLimiter, socialVideoRouter);
app.use("/api/ai-video",    generationLimiter, promptVideoRouter);
app.use("/api/render",       renderRouter);
app.use("/api/product-ad",   productAdRouter);
app.use("/api/poster",       posterRouter);
app.use("/api/thumbnail",    thumbnailRouter);
app.use("/api/outfit",       outfitRouter);
app.use("/api/social-post",  socialPostRouter);
app.use("/api/banner",       bannerRouter);
app.use("/api/admin",        adminRouter);
app.use("/api",              ttsRouter);
app.use("/api",              authRouter);
app.use("/api",              assetsRouter);
app.use("/api",              paymentsRouter);
app.use("/api",              refundClaimsRouter);

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
        await supabaseAdmin.from("subscriptions").update({ expiry_warned_at: new Date().toISOString() }).eq("id", sub.id);
      }
    }
    if (expiring?.length) console.log(`[expiry] Sent expiry warnings for ${expiring.length} subscriptions`);
  } catch (err) {
    console.error("[expiry] checkPlanExpiry failed:", err.message);
  }
}

setInterval(checkPlanExpiry, 24 * 60 * 60 * 1000);

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
