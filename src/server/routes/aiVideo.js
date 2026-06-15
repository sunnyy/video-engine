import express from "express";
import { requireAuth } from "../middleware/shared.js";
import { runAiVideo, runAiVideoDemo } from "../../services/ai/aiVideo/pipelineOrchestrator.js";

export const router = express.Router();

// POST /ai-video/generate
// With a topic → full AI build (director → GPT-5.4 scenes → motion). Without one →
// the hand-authored motion demo. No credits charged yet — this is the prototype.
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { topic, productName = "AI Video" } = req.body ?? {};
    const result = topic?.trim()
      ? await runAiVideo({ userId: req.user.id, topic: topic.trim() })
      : await runAiVideoDemo({ userId: req.user.id, productName });
    res.json(result);
  } catch (e) {
    console.error("[ai-video/generate]", e);
    res.status(500).json({ error: e.message });
  }
});
