import express from "express";
import { requireAuth, deductCredits, addCredits } from "../middleware/shared.js";
import { runSaasPipeline } from "../../services/ai/saasVideo/pipelineOrchestrator.js";

export const router = express.Router();

const SAAS_VIDEO_CREDITS = { 1: 50, 3: 120, 4: 160, 5: 200 };
function saasCredits(sceneCount) {
  if (sceneCount === "auto") return 120;
  return SAAS_VIDEO_CREDITS[parseInt(sceneCount, 10)] ?? 120;
}

router.post("/generate", requireAuth, async (req, res) => {
  const userId = req.user.id;
  let creditAmount = 0;

  const {
    url, productName = "", description = "", tone = "professional", goal = "promo",
    sceneCount = "auto", language = "en", voiceId = null,
    includeCaptions = false, customScript = null,
  } = req.body;

  if (!url?.trim() && !description?.trim()) {
    return res.status(400).json({ error: "Provide a product URL or a description" });
  }

  // SSE setup (same pattern as social video)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const credits = saasCredits(sceneCount);
    const deduction = await deductCredits(userId, credits, "saas_video", `SaaS Video generation (${sceneCount} scenes)`, null);
    if (!deduction.success) {
      send({ error: "Insufficient credits", code: "NO_CREDITS" });
      return res.end();
    }
    creditAmount = credits;

    const result = await runSaasPipeline(
      {
        url: url?.trim() || null, userId,
        productName: productName?.trim() || "",
        description: description?.trim() || "",
        tone, goal, sceneCount, language,
        voiceId: voiceId ?? null,
        includeCaptions: !!includeCaptions,
        customScript: customScript?.trim() || null,
      },
      ({ step }) => send({ step }),
    );

    send({ done: true, projectId: result.projectId, projectName: result.projectName, sceneCount: result.sceneCount });
    res.end();
  } catch (err) {
    if (creditAmount > 0) {
      addCredits(userId, creditAmount, "refund", "ai_failure_refund", "Refund: SaaS video failed").catch(() => {});
    }
    console.error("[saas-video/generate]", err);
    send({ error: err.message });
    res.end();
  }
});
