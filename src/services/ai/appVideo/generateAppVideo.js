import { serverFetch } from "../../serverApi";

/**
 * planAppScript({ appUrl, ... }) → { full_script }
 * Free "review the script first" step — fetches the app listing and writes the narration only.
 */
export async function planAppScript(opts) {
  const res = await serverFetch("/api/app-video/plan", { method: "POST", body: JSON.stringify(opts) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't write the script");
  return data; // { full_script }
}

/**
 * createAppVideo({ appUrl, targetDuration, language, voiceId, visualStyle, theme, accentColor, format_ratio, script })
 * Runs the full pipeline and resolves { project } (with editor_project_id) or { incomplete, projectId }.
 */
export async function createAppVideo(opts) {
  const res = await serverFetch("/api/app-video/create", { method: "POST", body: JSON.stringify(opts) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || "Generation failed");
    if (data.code) e.code = data.code;
    throw e;
  }
  return data; // { project } | { incomplete, projectId, message }
}
