import { serverFetch } from "../../serverApi";

/**
 * generateSaasVideo(payload, onProgress)
 * Faceless one-shot driver for the dashboard chatbox: create → render → poll.
 * The full multi-step wizard (talking-head, per-scene asset review) stays on the
 * Promo page. onProgress({ step }) maps to the chatbox status list.
 * Resolves { projectId } (the editor project) when the render completes.
 */
export async function generateSaasVideo(payload, onProgress) {
  onProgress?.({ step: 0 }); // reading site / building plan

  const cRes  = await serverFetch("/api/promo-video/create", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const cData = await cRes.json().catch(() => ({}));
  if (!cRes.ok) {
    const e = new Error(cData.error || "Failed to build the scene plan");
    if (cData.code) e.code = cData.code;
    throw e;
  }
  const pid = cData.project?.id;
  if (!pid) throw new Error("No project returned from create");

  onProgress?.({ step: 1 }); // kicking off render
  const rRes = await serverFetch(`/api/promo-video/${pid}/render`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ talking_head_url: null }),
  });
  if (!rRes.ok) {
    const d = await rRes.json().catch(() => ({}));
    const e = new Error(d.error || "Failed to start render");
    if (d.code) e.code = d.code;
    throw e;
  }

  onProgress?.({ step: 2 }); // rendering (async, poll)
  return await new Promise((resolve, reject) => {
    const iv = setInterval(async () => {
      try {
        const res  = await serverFetch(`/api/promo-video/${pid}`);
        const data = await res.json();
        const p    = data.project;
        if (!p) return;
        if (p.status === "rendered") {
          clearInterval(iv);
          if (p.editor_project_id) { onProgress?.({ step: 3 }); resolve({ projectId: p.editor_project_id }); }
          else reject(new Error("Render finished but no editor project was created."));
        } else if (p.status === "failed") {
          clearInterval(iv);
          reject(new Error(p.error_message || "Render failed. Please try again."));
        }
      } catch { /* transient poll error — keep polling */ }
    }, 3000);
  });
}
