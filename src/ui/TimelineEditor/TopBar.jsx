import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTimelineStore } from "../../store/useTimelineStore";
import { serverFetch } from "../../services/serverApi";
import { getProjectRenders, deleteProject } from "../../services/projects/projectService";
import { supabase } from "../../lib/supabase";
import { showToast } from "../Toast";
import PublishModal from "./modals/PublishModal";
import { isPublishableSource } from "../../config/publishableSources";

const btn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  borderRadius: 6,
  padding: "5px 10px",
  fontSize: 14,
  color: "#c0c0d8",
};

const btnDisabled = { ...btn, color: "#3a3a52", cursor: "default" };

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const project = useTimelineStore((s) => s.project);
  const projectId = useTimelineStore((s) => s.projectId);
  const _history = useTimelineStore((s) => s._history);
  const _future = useTimelineStore((s) => s._future);
  const undo = useTimelineStore((s) => s.undo);
  const redo = useTimelineStore((s) => s.redo);
  const updateProject = useTimelineStore((s) => s.updateProject);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const exportPollRef = useRef(null); // active status-poll interval, so Cancel can stop it

  // Export history (every render is a row in `renders`, newest first) → download dropdown.
  const [renders, setRenders] = useState([]);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showPubHistory, setShowPubHistory] = useState(false);

  // Mobile = minimal top bar: Back + title + Export + Publish only (editing controls hidden).
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Durable publish status — the source of truth lives in the jobs table (server-side), so a
  // reloaded / reopened editor recomputes it instead of showing a fresh Publish button.
  const [pubStatus, setPubStatus] = useState(null); // { active, phase, progress, published, failed, total, last }
  const seededPub = useRef(false);  // first poll seeds; don't toast a pre-existing completion on open
  const lastPubJob = useRef(null);  // last terminal batch we toasted, so we toast each batch once
  const triedNow = useRef(false);   // user just hit "Publish now" → surface the next deferral's reason

  // Authoritative service source from the DB (store's project.meta may be stale/missing it).
  const [source, setSource] = useState(null);
  useEffect(() => {
    if (!projectId) { setSource(null); return; }
    supabase.from("projects").select("source").eq("id", projectId).single()
      .then(({ data }) => setSource(data?.source || null)).catch(() => {});
  }, [projectId]);

  // Publish is offered for automation-pipeline videos (Prompt-to-Video). One click renders the
  // current timeline then publishes — no prior export required.
  const canPublish = isPublishableSource(source) || isPublishableSource(project?.meta?.source);

  // Poll the durable publish status (on mount + while a publish is in flight). This is what makes
  // the flow survive reloads: reopening the editor mid-publish shows "Rendering…/Publishing…"
  // instead of a fresh button, because state is recomputed server-side from the jobs table.
  useEffect(() => {
    if (!projectId || !canPublish) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await serverFetch(`/api/social/publish-status?projectId=${projectId}`);
        if (!r.ok || !alive) return;
        const s = await r.json();
        if (!alive) return;
        const firstTick = !seededPub.current;
        seededPub.current = true;
        setPubStatus(s);
        // If the user just hit "Publish now" and it came back DEFERRED again, surface the actual
        // reason every time (don't let them keep clicking blindly) — YouTube still isn't accepting it.
        if (s.phase === "deferred" && triedNow.current) {
          triedNow.current = false;
          showToast(s.reason || "YouTube still won't accept this upload — check your channel's daily upload limit and verification (youtube.com/verify), then try again.", "info");
        }
        // Toast once per batch when it reaches a terminal state — but not for a batch that was
        // already finished when we opened the editor (firstTick seeds without toasting).
        const terminal = !s.active && (s.phase === "published" || s.phase === "failed" || s.phase === "deferred");
        if (terminal && s.jobId && lastPubJob.current !== s.jobId) {
          lastPubJob.current = s.jobId;
          if (!firstTick) {
            if (s.phase === "published") showToast(s.total > 1 ? `Published to ${s.published}/${s.total} accounts ✓` : "Published ✓", "success");
            else if (s.phase === "deferred") showToast(s.reason || "YouTube paused this publish at its daily limit — we'll retry automatically after it resets. Check Alerts for how to raise it.", "info");
            else if (s.published) showToast(`Published ${s.published}/${s.total} — ${s.failed} failed.`, "info");
            else showToast(s.error || "Publish failed.");
          }
        }
      } catch (_) {}
    };
    tick();
    const timer = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, [projectId, canPublish]);

  const loadRenders = async () => {
    if (!projectId) return;
    try { setRenders((await getProjectRenders(projectId)).filter((r) => r.video_url)); }
    catch (_) { /* renders history is best-effort */ }
  };
  useEffect(() => { loadRenders(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtRenderDate = (iso) => {
    try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return ""; }
  };

  const downloadVideo = async (url, label, { silent = false } = {}) => {
    if (!url) return;
    try {
      const r    = await fetch(url);
      const blob = await r.blob();
      const a    = document.createElement("a");
      a.href     = URL.createObjectURL(blob);
      a.download = `${name || "video"}-${label || Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(a.href);
      if (!silent) showToast("Download started ✓", "success");
    } catch (_) { showToast("Download failed — please try again."); }
  };

  // Warn before leaving the tab while an export is running.
  useEffect(() => {
    if (!exporting) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [exporting]);

  const name = project?.name ?? "Untitled Video";
  const isPortrait =
    (project?.format?.width ?? 1080) < (project?.format?.height ?? 1920);

  const handleNameChange = (e) => {
    if (!project) return;
    updateProject({ name: e.target.value });
  };

  // Export persistence: the server already persists each render job to disk and serves it by id
  // (/api/render/status/:jobId), so we stash the active export's jobId per project and reconnect
  // on mount. A real refresh / accidental "Leave" no longer loses an in-flight export.
  const exportKey = projectId ? `vq:export:${projectId}` : null;
  const saveExportJob = (jobId) => { try { if (exportKey) localStorage.setItem(exportKey, JSON.stringify({ jobId, ts: Date.now() })); } catch {} };
  const clearExportJob = () => { try { if (exportKey) localStorage.removeItem(exportKey); } catch {} };

  // Poll an export job to completion (used both for a fresh export and a reconnect after reload).
  const stopExportPoll = () => { if (exportPollRef.current) { clearInterval(exportPollRef.current); exportPollRef.current = null; } };

  const pollExportStatus = (jobId, { resumed = false } = {}) => {
    stopExportPoll();
    const poll = setInterval(async () => {
      try {
        const statusRes = await serverFetch(`/api/render/status/${jobId}`);
        if (statusRes.status === 404) { // job gone (server restart cleared it, or completed+downloaded)
          stopExportPoll(); clearExportJob(); setExporting(false);
          if (resumed) showToast("Your earlier export is no longer available — please export again.", "info");
          return;
        }
        if (!statusRes.ok) return;
        const status = await statusRes.json();
        setExportProgress(status.progress || 0);
        if (status.done) {
          stopExportPoll();
          clearExportJob();
          setExporting(false);
          if (status.cancelled) return;
          if (status.error) { showToast("Export failed: " + status.error); return; }
          const videoUrl = status.video_url || status.url;
          if (videoUrl) { showToast("Export complete — downloading ✓", "success"); await downloadVideo(videoUrl, undefined, { silent: true }); }
          loadRenders(); // refresh the version dropdown with this new export
        }
      } catch (_) {}
    }, 3000);
    exportPollRef.current = poll;
  };

  // Cancel an in-flight (or stuck) export. Best-effort tells the server to stop, then always
  // clears local state so a dead job (e.g. server was restarted mid-render) can't trap the editor.
  const cancelExport = async () => {
    setCancelling(true);
    let jobId = null;
    try { jobId = JSON.parse(localStorage.getItem(`vq:export:${projectId}`) || "null")?.jobId || null; } catch {}
    if (jobId) {
      try { await serverFetch("/api/render/cancel", { method: "POST", body: JSON.stringify({ jobId }) }); } catch (_) {}
    }
    stopExportPoll();
    clearExportJob();
    setExporting(false);
    setExportProgress(0);
    setCancelling(false);
    showToast("Export cancelled", "info");
  };

  const handleExport = async () => {
    if (!project || exporting) return;
    setExporting(true);
    setExportProgress(0);
    try {
      const res = await serverFetch("/api/render/timeline", {
        method: "POST",
        body: JSON.stringify({ project, projectId, resolution: "1080p" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Export failed");
      }
      const { jobId } = await res.json();
      saveExportJob(jobId);
      pollExportStatus(jobId);
    } catch (err) {
      setExporting(false);
      clearExportJob();
      showToast(err.message || "Export failed");
    }
  };

  // Reconnect to an in-flight export after a reload / reopen (resume-after-refresh).
  useEffect(() => {
    if (!projectId) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(`vq:export:${projectId}`) || "null"); } catch {}
    if (!saved?.jobId) return;
    // Drop very old keys (exports finish in minutes; a >30min-old key is abandoned).
    if (saved.ts && Date.now() - saved.ts > 30 * 60 * 1000) { try { localStorage.removeItem(`vq:export:${projectId}`); } catch {}; return; }
    setExporting(true);
    setExportProgress(0);
    pollExportStatus(saved.jobId, { resumed: true });
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render-then-publish, durably: enqueue ONE server job (render → publish) and let it run in the
  // background. Progress/outcome are tracked in the jobs table and surfaced by the status poll
  // above, so the flow survives reload / navigation / closing the tab. We send the live timeline
  // JSON so the render is exactly what's on screen.
  const startPublish = async ({ accountIds, metadata }) => {
    if (!project || !projectId || pubStatus?.active) return;
    try {
      const res = await serverFetch("/api/social/render-and-publish", {
        method: "POST",
        body: JSON.stringify({ projectId, project, accountIds, metadata }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Publish failed");
      seededPub.current = true; // we're driving the transition; don't suppress the terminal toast
      setPubStatus({ active: true, phase: "rendering", progress: 0, total: d.accounts || accountIds.length });
      showToast("Publishing started — we'll render then post it. You can keep editing or close this tab.", "info");
    } catch (err) { showToast(err.message || "Publish failed"); }
  };

  // "Try publish now" — when a publish was deferred (quota/upload-limit), re-run the already-queued
  // retry immediately instead of waiting for the scheduled reset. Reuses the existing render + post
  // (no re-render, no duplicate). If nothing is queued anymore, fall back to a fresh publish.
  const publishNow = async () => {
    if (!projectId || pubStatus?.active) return;
    try {
      const res = await serverFetch("/api/social/publish-now", { method: "POST", body: JSON.stringify({ projectId }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't start publishing");
      if (d.ran > 0) {
        seededPub.current = true;
        triedNow.current = true; // surface the reason if it comes back deferred again
        setPubStatus({ active: true, phase: "publishing", progress: 100, total: d.ran });
        showToast("Publishing now…", "info");
      } else {
        setShowPublish(true); // nothing queued to resume — open a fresh publish
      }
    } catch (err) { showToast(err.message || "Couldn't start publishing"); }
  };

  const pubActive = !!pubStatus?.active;
  const lastPub = pubStatus?.last || null; // persistent "already published" history for this project
  const publishedAccounts = {};            // accountId -> published_at, for the re-publish guard
  (lastPub?.posts || []).forEach((p) => { if (p.status === "published" && p.accountId) publishedAccounts[p.accountId] = p.at; });
  const publishLabel = pubActive
    ? (pubStatus.phase === "rendering" ? `Rendering… ${pubStatus.progress || 0}%` : pubStatus.via === "automation" ? "Auto-publishing…" : "Publishing…")
    : pubStatus?.phase === "deferred" ? "↗ Publish now"
    : (lastPub ? "↗ Publish again" : "↗ Publish");

  const relTime = (iso) => {
    if (!iso) return "";
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
    try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return ""; }
  };

  const handleFormatToggle = () => {
    if (!project) return;
    const { width, height } = project.format;
    updateProject({ format: { ...project.format, width: height, height: width } });
  };

  const [deleting, setDeleting] = useState(false);
  const handleDeleteProject = async () => {
    if (!projectId) { showToast("Nothing to delete yet — this project hasn't been saved.", "info"); return; }
    if (deleting) return;
    if (!window.confirm(`Delete "${name || "this project"}"? This permanently removes the project and can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteProject(projectId);
      showToast("Project deleted", "success");
      navigate("/projects");
    } catch {
      setDeleting(false);
      showToast("Couldn't delete the project — please try again.");
    }
  };

  return (
    <>
      {showPublish && (
        <PublishModal
          name={name}
          initialPublish={project?.meta?.publish}
          publishedAccounts={publishedAccounts}
          onSubmit={startPublish}
          onClose={() => setShowPublish(false)}
        />
      )}
      {/* Blocking overlay — prevents editing/concurrent renders while exporting. Publishing is a
          background job (server-side), so it does NOT block the editor. */}
      {exporting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(8,8,14,0.82)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 400, maxWidth: "90%", background: "#14141e", border: "1px solid rgba(124,92,252,0.3)", borderRadius: 16, padding: "28px 30px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 40, height: 40, margin: "0 auto 16px", border: "3px solid rgba(124,92,252,0.25)", borderTopColor: "#7c5cfc", borderRadius: "50%", animation: "tb-export-spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif", marginBottom: 6 }}>Exporting your video…</div>
            <div style={{ fontSize: 13, color: "#8896a8", marginBottom: 18, lineHeight: 1.5 }}>Keep this tab open — editing is paused until the export finishes.</div>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${exportProgress}%`, background: "#7c5cfc", borderRadius: 99, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a080ff", marginTop: 10, fontFamily: "'JetBrains Mono',monospace" }}>{exportProgress}%</div>
            <button onClick={cancelExport} disabled={cancelling} style={{
              marginTop: 18, background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              color: "#c0c0d8", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
              padding: "8px 18px", borderRadius: 8, cursor: cancelling ? "default" : "pointer", opacity: cancelling ? 0.6 : 1,
            }}>{cancelling ? "Cancelling…" : "Cancel export"}</button>
          </div>
          <style>{`@keyframes tb-export-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div
      style={{
        height: 52,
        background: "#111118",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 4,
        flexShrink: 0,
      }}
    >
      {/* Left: Back */}
      <button
        style={btn}
        onClick={(e) => {
          const src  = project?.meta?.source;
          const dest = location.state?.from
                     ?? (src === "product_video" || src === "product_video_v2" ? "/product-video"
                       : src === "typography_video"                            ? "/typography-video"
                       : src === "promo_video"  || src === "promo_video_v2"   ? "/promo-video"
                       : src === "social_video"                               ? "/social-video"
                       : src === "video_captions"                             ? "/video-captions"
                       : src === "scratch"                                    ? "/videos"
                       : "/dashboard");
          if (e.ctrlKey || e.metaKey) {
            window.open(dest, "_blank");
          } else {
            navigate(dest);
          }
        }}
        title="Back (Ctrl+click to open in new tab)"
      >
        ← Back
      </button>

      {/* Left: project name, beside Back */}
      <input
        value={name}
        onChange={handleNameChange}
        onFocus={(e) => e.target.select()}
        title="Project name"
        style={{
          background: "transparent",
          border: "none",
          color: "#e8e8f0",
          fontSize: 14,
          fontWeight: 600,
          textAlign: "left",
          outline: "none",
          padding: "5px 10px",
          borderRadius: 6,
          marginLeft: 2,
          ...(isMobile
            ? { flex: 1, minWidth: 0, width: "auto" }
            : { maxWidth: 220, width: 200, flexShrink: 0 }),
        }}
        onMouseOver={(e) => (e.target.style.background = "rgba(255,255,255,0.06)")}
        onMouseOut={(e) => (e.target.style.background = "transparent")}
      />

      {/* Delete this project (permanent, with confirmation) — red outline, like Publish */}
      {!isMobile && (
      <button
        onClick={handleDeleteProject}
        disabled={deleting}
        title="Delete this project (permanent)"
        style={{
          background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.45)",
          color: "#f87171", cursor: deleting ? "default" : "pointer", padding: "7px 14px",
          borderRadius: 6, fontSize: 13, fontWeight: 700, marginLeft: 6, flexShrink: 0,
          opacity: deleting ? 0.55 : 1,
        }}
      >
        {deleting ? "Deleting…" : "🗑 Delete"}
      </button>
      )}

      {/* Center: editing guidance note (desktop only) */}
      <div style={{ flex: isMobile ? "0 0 auto" : 1, display: "flex", justifyContent: "center", minWidth: 0, padding: isMobile ? 0 : "0 8px" }}>
        {!isMobile && (
        <div
          title="Vidquence's editor is for light touch-ups — replacing images/video/audio, editing text, recoloring, and nudging timing. It isn't a full pro editor: big structural changes (deleting core layers, reworking the layout/scenes) can break how the video was composed. For major changes, regenerate the video instead."
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, maxWidth: 620,
            padding: "5px 12px", borderRadius: 8,
            background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.1)",
            color: "#C2AF72", fontSize: 12, lineHeight: 1.3, fontFamily: "'Outfit',sans-serif",
            overflow: "hidden", cursor: "default",
          }}
        >
          <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Editing is best for light edits — swap media, tweak text, or change colors. Heavy restructuring may break the video.
          </span>
        </div>
        )}
      </div>

      {/* Right: controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {!isMobile && (
        <button
          style={_history.length ? btn : btnDisabled}
          onClick={undo}
          disabled={!_history.length}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        )}
        {!isMobile && (
        <button
          style={_future.length ? btn : btnDisabled}
          onClick={redo}
          disabled={!_future.length}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪ Redo
        </button>
        )}

        {/* Orientation toggle hidden: a naive width/height swap mis-positions every scene
            (layouts are measured per-canvas). A real aspect switch = regenerate each scene.
            Kept here (flip false→true) so it's trivial to revive if we build a reframe flow. */}
        {false && (
          <>
            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.1)", margin: "0 8px" }} />
            <button
              onClick={handleFormatToggle}
              title="Toggle aspect ratio"
              style={{
                background: "rgba(124,92,252,0.14)",
                border: "1px solid rgba(124,92,252,0.4)",
                color: "#a080ff",
                cursor: "pointer",
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.03em",
              }}
            >
              {isPortrait ? "9:16" : "16:9"}
            </button>
          </>
        )}

        {/* Download dropdown — previous exports (versions), newest first */}
        {!isMobile && renders.length > 0 && (
          <div style={{ position: "relative", marginLeft: 4 }}>
            <button
              onClick={() => setShowDownloads((v) => !v)}
              disabled={exporting}
              title="Download a previous export"
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#c0c0d8", cursor: exporting ? "default" : "pointer", padding: "7px 14px",
                borderRadius: 6, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              Download <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
            </button>
            {showDownloads && (
              <>
                <div onClick={() => setShowDownloads(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 9999, width: 250,
                  background: "#14141e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden", maxHeight: 320, overflowY: "auto",
                }}>
                  <div style={{ padding: "9px 13px", fontSize: 11, fontWeight: 700, color: "#8896a8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    Exports ({renders.length})
                  </div>
                  {renders.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => { downloadVideo(r.video_url, fmtRenderDate(r.created_at).replace(/[^\w]+/g, "-")); setShowDownloads(false); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%",
                        textAlign: "left", padding: "10px 13px", background: "none", border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#e8e8f0", cursor: "pointer",
                        fontSize: 12.5, fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.12)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span>{fmtRenderDate(r.created_at)}{i === 0 ? "  · Latest" : ""}</span>
                      <span style={{ fontSize: 13, color: "#a080ff" }}>↓</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={!project || exporting}
          style={{
            background: exporting ? "#4a3a9a" : "#7c5cfc",
            border: "none",
            color: "#fff",
            cursor: (!project || exporting) ? "default" : "pointer",
            padding: "7px 20px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            marginLeft: 4,
            minWidth: 110,
            opacity: !project ? 0.4 : 1,
          }}
        >
          {exporting ? `Exporting… ${exportProgress}%` : "Export"}
        </button>

        {/* Persistent "already published" chip + history — survives reload (server-derived), so a
            user who missed the toast still sees this video was posted, with links to the live posts. */}
        {!isMobile && canPublish && !pubActive && lastPub && (
          <div style={{ position: "relative", marginLeft: 4 }}>
            <button
              onClick={() => setShowPubHistory((v) => !v)}
              title="Where this video was published"
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.4)", color: "#34d399", cursor: "pointer",
                padding: "7px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 12 }}>✓</span> Published{lastPub.at ? ` · ${relTime(lastPub.at)}` : ""} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
            </button>
            {showPubHistory && (
              <>
                <div onClick={() => setShowPubHistory(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 9999, width: 280,
                  background: "#14141e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)", overflow: "hidden", maxHeight: 320, overflowY: "auto",
                }}>
                  <div style={{ padding: "9px 13px", fontSize: 11, fontWeight: 700, color: "#8896a8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    Published to
                  </div>
                  {lastPub.posts.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 13px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12.5, color: "#e8e8f0" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.platform}{p.account && p.account !== p.platform ? ` · ${p.account}` : ""}
                        </span>
                        <span style={{ fontSize: 11, color: p.status === "published" ? "#8896a8" : "#f87171" }}>
                          {p.status === "published" ? relTime(p.at) : "failed"}
                        </span>
                      </div>
                      {p.status === "published" && p.url
                        ? <a href={p.url} target="_blank" rel="noreferrer" style={{ color: "#34d399", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>View ↗</a>
                        : p.status !== "published" ? <span style={{ color: "#f87171", fontSize: 14 }}>✕</span> : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {canPublish && (
          <button
            onClick={() => { if (exporting || pubActive) return; pubStatus?.phase === "deferred" ? publishNow() : setShowPublish(true); }}
            disabled={exporting || pubActive}
            title={pubActive ? "Publishing in progress — you can keep editing" : pubStatus?.phase === "deferred" ? "Retry the deferred publish now (reuses the render)" : "Render & publish to your connected social accounts"}
            style={{
              background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.45)",
              color: "#34d399", cursor: (exporting || pubActive) ? "default" : "pointer", padding: "7px 16px",
              borderRadius: 6, fontSize: 13, fontWeight: 700, marginLeft: 4,
              opacity: exporting ? 0.5 : 1,
            }}
          >
            {publishLabel}
          </button>
        )}
      </div>
    </div>
    </>
  );
}
