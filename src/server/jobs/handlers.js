/**
 * jobs/handlers.js — registers every job-type handler. Imported once by the worker
 * on startup (side-effect import). Add new handlers here as phases land:
 *
 *   import { registerHandler } from "./registry.js";
 *   registerHandler("render_timeline", renderTimelineJob);   // Phase: render-as-a-service
 *   registerHandler("autopilot_generate", autopilotGenerateJob);
 *   registerHandler("publish_post", publishPostJob);
 *
 * Keeping registration in one place means the worker stays generic and reusable.
 */

// (no handlers yet — render/generate/publish handlers register here in later phases)
