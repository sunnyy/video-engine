import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteProject, createProject } from "../services/projects/projectService";
import { useProjectsStore } from "../store/useProjectsStore";
import { buildSafeProject } from "../normalize/normalizeProject";
import { BLANK_LAYOUT_ID } from "../core/registries/layoutRegistry.js";
import AppLayout from "../ui/AppLayout";
import { ProjectCard } from "./Videos";

const PAGE_SIZE = 15;

/* ── Listing ── */
function VideoListing() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(1);
  const { projects, loading, fetchProjects, removeProject } = useProjectsStore();

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteProject(id);
      removeProject(id);
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const customProjects = projects.filter(p => p.source === "scratch");
  const filtered = customProjects.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleSearch = (val) => { setSearch(val); setPage(1); };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (customProjects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>✏️</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No custom videos yet</div>
        <div style={{ fontSize: 14, color: "#77777f" }}>Switch to Create New to build your first one</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      {/* Search bar */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search videos…"
          className="rounded-[8px] px-3 py-[7px] text-[13px] text-[#e8e8f0] focus:outline-none"
          style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", width: 220 }}
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[14px]" style={{ color: "#77777f" }}>
          No projects match "{search}"
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {paginated.map(p => (
              <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-[6px] rounded-[7px] text-[13px] font-semibold border-0 cursor-pointer transition-all disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8" }}>
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className="w-[32px] h-[32px] rounded-[7px] text-[13px] font-bold border-0 cursor-pointer transition-all"
                  style={{ background: n === page ? "#7c5cfc" : "rgba(255,255,255,0.06)", color: n === page ? "#fff" : "#a0a0b8" }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-[6px] rounded-[7px] text-[13px] font-semibold border-0 cursor-pointer transition-all disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8" }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Create New ── */
function GeneratorForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleScratch = async () => {
    setLoading(true);
    setError("");
    try {
      const defaultBeat = {
        id:     crypto.randomUUID(),
        order:  0,
        layout: BLANK_LAYOUT_ID,
        layoutBackground: { type: "color", value: "#111118" },
        zones:    {},
        caption:  { show: true, text: "", style: "wordBlaze", position: 80, emphasis_words: [] },
        spoken:   "",
        intent:   "explanation",
        energy:   0.5,
        duration_sec: 4,
        start_sec:    0,
        end_sec:      4,
        transition:   { type: "cut", duration: 0.3 },
        overlays:  [],
        audio_cues: [],
        blocks:    [],
      };
      const safeProject = buildSafeProject({
        meta:   { orientation: "9:16", mode: "faceless", fps: 25, width: 1080, height: 1920 },
        script: { text: "", emotionalArc: "" },
        audio:  { tts: null, music: null },
        beats:  [defaultBeat],
        workflow: { script_completed: false, avatar_completed: false, beats_initialized: false },
      });
      const saved = await createProject({ name: "Untitled Project", rawAI: {}, safeProject, source: "scratch" });
      navigate(`/editor/${saved.id}`);
    } catch (err) {
      setError(err.message || "Failed to create project.");
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40 }}>
      <div style={{ fontSize: 56 }}>✏️</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif", marginBottom: 8 }}>
          Start from Scratch
        </div>
        <div style={{ fontSize: 14, color: "#77777f", maxWidth: 340, lineHeight: 1.6 }}>
          Open a blank project in the editor and build your video beat by beat — full creative control.
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleScratch}
        disabled={loading}
        style={{
          padding: "13px 36px", borderRadius: 12, border: "none",
          background: loading ? "rgba(245,197,24,0.12)" : "#f5c518",
          color: loading ? "#44441a" : "#0b0b10",
          fontSize: 15, fontWeight: 800,
          fontFamily: "'Outfit',sans-serif",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {loading ? "Creating…" : "Create Empty Project →"}
      </button>
    </div>
  );
}

/* ── Main page ── */
export default function CustomVideos() {
  const [tab, setTab] = useState("videos");

  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Custom Videos
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px",
                  border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(124,92,252,0.15)" : "transparent",
                  color: tab === t.id ? "#a78bfa" : "#55556a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "videos" ? <VideoListing /> : <GeneratorForm />}
      </div>
    </AppLayout>
  );
}
