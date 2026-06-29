/**
 * incompleteProject.js
 * src/services/ai/shared/incompleteProject.js
 *
 * Shared persistence for a generation that failed at the (required) voiceover stage. Instead of a
 * silent video, we save the project with status='incomplete' so the user can FINISH it later for
 * free once the outage clears. `resume` is a service-specific blob the service's own /finish route
 * replays (its plan + inputs). The placeholder timeline keeps the NOT-NULL column happy; nothing
 * renders it. The true failure cause is kept in raw_ai_json for support, but NEVER shown to the user.
 *
 * Requires the `projects.status` column:  alter table public.projects add column if not exists status text;
 */
import { supabaseAdmin } from "../../../server/middleware/shared.js";

export async function saveIncompleteProject({
  userId, source, name, orientation = "9:16",
  canvas = { width: 1080, height: 1920 },
  ve, resume, existingProjectId = null,
}) {
  const placeholder = { layers: [], format: { width: canvas.width, height: canvas.height }, meta: { source, incomplete: true } };
  const raw = {
    incomplete: { stage: "voiceover", cause: ve?.cause ?? null, retryable: ve?.retryable ?? true, internal: ve?.internal ?? true, message: ve?.message ?? null },
    resume: resume ?? null,
  };

  if (existingProjectId) {
    const { error } = await supabaseAdmin.from("projects")
      .update({ status: "incomplete", raw_ai_json: raw, safe_project_json: placeholder, name, updated_at: new Date().toISOString() })
      .eq("id", existingProjectId).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return existingProjectId;
  }

  const { data: row, error } = await supabaseAdmin.from("projects")
    .insert({
      user_id: userId, name, status: "incomplete",
      safe_project_json: placeholder, orientation, mode: "timeline",
      source, editor_version: "timeline", raw_ai_json: raw,
    })
    .select("id").single();
  if (error) throw new Error(error.message);
  return row?.id ?? null;
}
