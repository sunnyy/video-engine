import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectsStore } from "../store/useProjectsStore";
import AppLayout from "../ui/AppLayout";

/**
 * Projects — the home for the user's videos (moved out of the Dashboard hub).
 * Lists all projects with a by-service filter. Routes/pages for each service stay
 * intact; this just reads the project store (getUserProjects → has `source`).
 */

const T = { bg: "#090b11", surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a" };

const FILTERS = [
  { id: "all",              label: "All",             sources: null },
  { id: "ai_video",         label: "Prompt to Video", sources: ["ai_video"] },
  { id: "promo_video",      label: "SaaS Video",      sources: ["promo_video"] },
  { id: "product_video",    label: "Product Video",   sources: ["product_video", "product_video_v2", "product_ad"] },
  { id: "social_video",     label: "Social",          sources: ["social_video"] },
  { id: "typography_video", label: "Typography",      sources: ["typography_video"] },
  { id: "caption_studio",   label: "Captions",        sources: ["caption_studio"] },
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
  const [hov, setHov] = useState(false);
  const preview = previewFor(project);
  const href = `/video-editor/${project.id}`;
  return (
    <a
      href={href}
      onClick={(e) => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(href, { state: { from: "/projects" } }); } }}
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
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name || "Untitled"}</div>
        <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{timeLabel(project.updated_at)}</div>
      </div>
    </a>
  );
}

const PAGE_SIZE = 30;

export default function Projects() {
  const { projects, loading, fetchProjects } = useProjectsStore();
  const [filter, setFilter] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => { fetchProjects(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the page window whenever the active filter changes.
  useEffect(() => { setVisible(PAGE_SIZE); }, [filter]);

  const active = FILTERS.find(f => f.id === filter) ?? FILTERS[0];
  const matched = [...projects]
    .filter(p => !active.sources || active.sources.includes(p.source))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const shown = matched.slice(0, visible);
  const hasMore = matched.length > visible;

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ padding: "40px 40px 80px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 18px" }}>Your Projects</h1>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
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

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: T.faint }}>
              <div style={{ width: 16, height: 16, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Loading…</span>
            </div>
          ) : shown.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: T.faint, fontSize: 14 }}>No projects here yet — make one from the dashboard.</div>
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
