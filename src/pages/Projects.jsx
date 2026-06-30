import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectsStore } from "../store/useProjectsStore";
import { deleteProject } from "../services/projects/projectService";
import { finisherFor } from "../services/ai/finishVideo";
import AppLayout from "../ui/AppLayout";
import { showToast } from "../ui/Toast";

/**
 * Projects — the home for the user's videos (moved out of the Dashboard hub).
 * Lists all projects with a by-service filter. Routes/pages for each service stay
 * intact; this just reads the project store (getUserProjects → has `source`).
 */

const T = { bg: "#090b11", surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a" };

const FILTERS = [
  { id: "all",              label: "All",              sources: null },
  { id: "ai_video",         label: "Prompt Video",     sources: ["ai_video"] },
  { id: "promo_video",      label: "SaaS Video",       sources: ["promo_video"] },
  { id: "product_video",    label: "Product Video",    sources: ["product_video", "product_video_v2", "product_ad"] },
  { id: "social_video",     label: "Social Video",     sources: ["social_video"] },
  { id: "talking_head",     label: "Talking Head",     sources: ["talking_head"] },
  { id: "video_clip",       label: "Video Clipping",   sources: ["video_clip"] },
  { id: "typography_video", label: "Typography Video", sources: ["typography_video"] },
  { id: "caption_studio",   label: "Auto Captions",    sources: ["caption_studio"] },
];

function timeLabel(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString();
}

// Resolve a representative preview for any service. Falls through cheapest-first:
// explicit thumbnail → image layer → video layer (captions, video-backed) →
// gradient + first headline (typography / pure-text) → generic placeholder.
function previewFor(project) {
  const json   = project.safe_project_json || {};
  const layers = json.layers || [];
  const t = json.meta?.thumbnail;
  if (t) return { kind: /\.(mp4|webm|mov)(\?|$)/i.test(t) ? "video" : "image", src: t };
  const img = layers.find(l => l.type === "image" && l.src);
  if (img) return { kind: "image", src: img.src };
  const vid = layers.find(l => l.type === "video" && l.src);
  if (vid) return { kind: "video", src: vid.src };
  const grad = layers.find(l => l.type === "gradient" && l.gradient);
  const txt  = layers.find(l => l.type === "text" && (l.content || "").trim());
  if (grad || txt) {
    const c = txt?.style?.color;
    return {
      kind:  "text",
      bg:    grad?.gradient || "linear-gradient(135deg,#0f0820,#1a0a2e,#2d1060)",
      text:  (txt?.content || "").trim(),
      color: typeof c === "string" && c.startsWith("#") ? c : "#ffffff",
    };
  }
  return null;
}

function Card({ project }) {
  const navigate = useNavigate();
  const removeProject = useProjectsStore(s => s.removeProject);
  const fetchProjects = useProjectsStore(s => s.fetchProjects);
  const [hov, setHov] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const preview = previewFor(project);
  const href = `/video-editor/${project.id}`;
  const finish = finisherFor(project.source);                  // service-specific Finish fn (or null)
  const incomplete = project.status === "incomplete" && !!finish; // voiceover stage failed — needs Finishing

  // Finish a saved incomplete video: re-runs production from the saved plan (no re-research) and
  // charges credits on success. Stays incomplete (with a generic toast) if the outage hasn't cleared.
  const handleFinish = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (finishing || !finish) return;
    setFinishing(true);
    try {
      const r = await finish(project.id);
      if (r.incomplete) {
        showToast(r.message || "Still couldn’t finish — please try again shortly.");
        setFinishing(false);
        return;
      }
      await fetchProjects(true);
      showToast("Video finished", "success");
      navigate(`/video-editor/${project.id}`, { state: { from: "/projects" } });
    } catch (err) {
      showToast(err?.code === "NO_CREDITS" ? "Not enough credits to finish this video." : "Couldn’t finish — please try again.");
      setFinishing(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (deleting) return;
    if (!window.confirm(`Delete "${project.name || "Untitled"}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      removeProject(project.id);
      showToast("Project deleted", "success");
    } catch {
      setDeleting(false);
      showToast("Couldn't delete the project — please try again.");
    }
  };
  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        if (incomplete) { handleFinish(e); return; } // empty placeholder — Finish, don't open the editor
        navigate(href, { state: { from: "/projects" } });
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "block", textDecoration: "none", borderRadius: 14, overflow: "hidden", border: `1px solid ${hov ? "rgba(124,92,252,0.35)" : T.border}`, background: T.surface, transition: "all 0.2s", transform: hov ? "translateY(-2px)" : "none" }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", background: "#060a14", overflow: "hidden" }}>
        {preview?.kind === "image" ? (
          <img src={preview.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : preview?.kind === "video" ? (
          <video src={preview.src} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : preview?.kind === "text" ? (
          <div style={{ width: "100%", height: "100%", background: preview.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <span style={{ color: preview.color, fontSize: 16, fontWeight: 800, textAlign: "center", lineHeight: 1.2, fontFamily: "'Outfit',sans-serif", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {preview.text || project.name}
            </span>
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0f0820,#1a0a2e,#2d1060)" }}><span style={{ fontSize: 28, opacity: 0.35 }}>🎬</span></div>
        )}
        {incomplete && (
          <div style={{ position: "absolute", top: 8, left: 8, padding: "4px 8px", borderRadius: 8, background: "rgba(8,10,16,0.82)", color: "#fbbf24", fontSize: 10, fontWeight: 800, letterSpacing: 0.3, backdropFilter: "blur(4px)", zIndex: 2 }}>
            ⏳ NEEDS FINISHING
          </div>
        )}
        {(hov || deleting) && (
          <button onClick={handleDelete} title="Delete project" disabled={deleting} aria-label="Delete project"
            style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 8, border: "none", cursor: deleting ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,10,16,0.8)", color: "#f87171", backdropFilter: "blur(4px)", zIndex: 2 }}>
            {deleting ? (
              <span style={{ fontSize: 14, lineHeight: 1 }}>…</span>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name || "Untitled"}</div>
        {incomplete ? (
          <button onClick={handleFinish} disabled={finishing}
            style={{ marginTop: 7, width: "100%", padding: "7px 0", borderRadius: 8, border: "none", cursor: finishing ? "default" : "pointer", fontWeight: 800, fontSize: 12, fontFamily: "inherit", background: finishing ? "rgba(124,92,252,0.5)" : "#7c5cfc", color: "#fff" }}>
            {finishing ? "Finishing…" : "Finish video"}
          </button>
        ) : (
          <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{timeLabel(project.updated_at)}</div>
        )}
      </div>
    </a>
  );
}

const PAGE_SIZE = 30;

export default function Projects() {
  const { projects, loading, fetchProjects } = useProjectsStore();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => { fetchProjects(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the page window whenever the active filter or search query changes.
  useEffect(() => { setVisible(PAGE_SIZE); }, [filter, query]);

  const active = FILTERS.find(f => f.id === filter) ?? FILTERS[0];
  const q = query.trim().toLowerCase();
  const matched = [...projects]
    .filter(p => !active.sources || active.sources.includes(p.source))
    .filter(p => !q || (p.name || "Untitled").toLowerCase().includes(q))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const shown = matched.slice(0, visible);
  const hasMore = matched.length > visible;

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ padding: "40px 40px 80px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 18px" }}>Your Projects</h1>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FILTERS.map(f => {
                const sel = filter === f.id;
                return (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    style={{ padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${sel ? "rgba(124,92,252,0.55)" : T.border}`, background: sel ? "rgba(124,92,252,0.14)" : "rgba(255,255,255,0.03)", color: sel ? "#fff" : T.muted }}>
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div style={{ position: "relative", width: 260, flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects by name…"
                style={{ width: "100%", padding: "9px 32px 9px 36px", borderRadius: 10, fontSize: 13, fontFamily: "inherit", color: T.text, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, outline: "none", boxSizing: "border-box" }}
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search"
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, borderRadius: 6, border: "none", cursor: "pointer", background: "transparent", color: T.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: T.faint }}>
              <div style={{ width: 16, height: 16, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading…</span>
            </div>
          ) : shown.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: T.faint, fontSize: 14 }}>
              {q ? `No projects match “${query.trim()}”.` : "No projects here yet — make one from the dashboard."}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
                {shown.map(p => <Card key={p.id} project={p} />)}
              </div>
              {hasMore && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                  <button onClick={() => setVisible(v => v + PAGE_SIZE)}
                    style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${T.border}`, background: "rgba(124,92,252,0.14)", color: "#fff" }}>
                    Load more ({matched.length - visible} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
