import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTimelineStore } from "../../store/useTimelineStore";
import { serverFetch } from "../../services/serverApi";

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

      const poll = setInterval(async () => {
        try {
          const statusRes = await serverFetch(`/api/render/status/${jobId}`);
          if (!statusRes.ok) return;
          const status = await statusRes.json();
          setExportProgress(status.progress || 0);
          if (status.done) {
            clearInterval(poll);
            setExporting(false);
            if (status.cancelled) return;
            if (status.error) { alert("Export failed: " + status.error); return; }
            const videoUrl = status.video_url || status.url;
            if (videoUrl) {
              const r    = await fetch(videoUrl);
              const blob = await r.blob();
              const a    = document.createElement("a");
              a.href     = URL.createObjectURL(blob);
              a.download = `${name || "video"}-${Date.now()}.mp4`;
              a.click();
              URL.revokeObjectURL(a.href);
            }
          }
        } catch (_) {}
      }, 3000);
    } catch (err) {
      setExporting(false);
      alert(err.message || "Export failed");
    }
  };

  const handleFormatToggle = () => {
    if (!project) return;
    const { width, height } = project.format;
    updateProject({ format: { ...project.format, width: height, height: width } });
  };

  return (
    <>
      {/* Blocking export overlay — prevents editing while a render is in progress */}
      {exporting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(8,8,14,0.82)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 360, maxWidth: "90%", background: "#14141e", border: "1px solid rgba(124,92,252,0.3)", borderRadius: 16, padding: "28px 30px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 40, height: 40, margin: "0 auto 16px", border: "3px solid rgba(124,92,252,0.25)", borderTopColor: "#7c5cfc", borderRadius: "50%", animation: "tb-export-spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif", marginBottom: 6 }}>Exporting your video…</div>
            <div style={{ fontSize: 13, color: "#8896a8", marginBottom: 18, lineHeight: 1.5 }}>Keep this tab open — editing is paused until the export finishes.</div>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${exportProgress}%`, background: "#7c5cfc", borderRadius: 99, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a080ff", marginTop: 10, fontFamily: "'JetBrains Mono',monospace" }}>{exportProgress}%</div>
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

      {/* Center: project name */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <input
          value={name}
          onChange={handleNameChange}
          onFocus={(e) => e.target.select()}
          style={{
            background: "transparent",
            border: "none",
            color: "#e8e8f0",
            fontSize: 15,
            fontWeight: 600,
            textAlign: "center",
            outline: "none",
            padding: "5px 12px",
            borderRadius: 6,
            maxWidth: 340,
            width: "100%",
          }}
          onMouseOver={(e) => (e.target.style.background = "rgba(255,255,255,0.06)")}
          onMouseOut={(e) => (e.target.style.background = "transparent")}
        />
      </div>

      {/* Right: controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          style={_history.length ? btn : btnDisabled}
          onClick={undo}
          disabled={!_history.length}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          style={_future.length ? btn : btnDisabled}
          onClick={redo}
          disabled={!_future.length}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪ Redo
        </button>

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

        <button
          onClick={handleExport}
          disabled={!project || exporting}
          style={{
            background: exporting ? "#4a3a9a" : "#7c5cfc",
            border: "none",
            color: "#fff",
            cursor: !project || exporting ? "default" : "pointer",
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
      </div>
    </div>
    </>
  );
}
