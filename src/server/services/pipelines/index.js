/**
 * services/pipelines/index.js — the service-pipeline registry that makes automation MULTI-SERVICE.
 *
 * A campaign's `service` key maps to a generate step here. The generate_video job handler
 * dispatches through this registry instead of hard-calling one pipeline, so adding a new
 * automatable service is "register a pipeline" — the render → publish → status tail is already
 * generic and needs no changes.
 *
 * Each entry:
 *   - label:     human name (logs / future UI)
 *   - creditKey: key into CREDIT_COSTS for per-service cost
 *   - run({ campaign, topic, userId, onStep }) → { projectId, publish }
 *       Produces a saved project (projects row with meta.source) and optional publish copy
 *       { title, description, hashtags }. `onStep` is a sync heartbeat/cancel callback.
 *
 * To add a service: registerPipeline("my_service", { label, creditKey, run }), then allow it in
 * the campaign UI. Nothing in the queue/render/publish layer needs to change.
 */
import { runPromptPipeline } from "../../../services/ai/promptVideo/pipelineOrchestrator.js";
import { creditsForDuration } from "../../../core/utils/creditCosts.js";

const DEFAULT_DURATION = 40; // short-form default (seconds)

const pipelines = Object.create(null);

export function registerPipeline(key, def) {
  if (pipelines[key]) console.warn(`[pipelines] "${key}" is being overwritten`);
  pipelines[key] = { key, ...def };
}
export function getPipeline(key) { return pipelines[key] || null; }
export function registeredPipelines() { return Object.keys(pipelines); }

// ── AI Video (Prompt-to-Video) — the first automatable service ──
registerPipeline("ai_video", {
  label: "AI Video",
  creditKey: "ai_video",
  // Duration-aware cost: a 60s campaign video costs more than a 15s one (more beats = more COGS).
  cost: (campaign) => creditsForDuration(campaign.target_duration || DEFAULT_DURATION),
  async run({ campaign, topic, userId, onStep }) {
    const result = await runPromptPipeline({
      prompt: topic.title,
      userId,
      styleId: campaign.style_id || "auto",
      targetDuration: campaign.target_duration || DEFAULT_DURATION,
      language: campaign.language || "en",
      voiceId: campaign.voice_id || null,
      orientation: campaign.orientation || "9:16",
      plan: null,
    }, onStep);
    return { projectId: result.projectId, publish: result.publish || null };
  },
});
