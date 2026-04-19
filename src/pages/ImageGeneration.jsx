/**
 * ImageGeneration.jsx — Unified AI Image Studio
 * Types: image (free), poster (9:16 enhanced), thumbnail (16:9 enhanced)
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";
import { useImageLibraryStore } from "../store/useImageLibraryStore";

/* ── Sidebar primitives (mirrors Dashboard) ── */
const Icons = {
  folder:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  gallery:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/></svg>,
  box:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  credits:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

function NavItem({ icon, label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-[10px] px-3 py-[7px] rounded-[8px] text-left border-0 transition-all cursor-pointer"
      style={{
        background: active ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.04)" : "transparent",
        color:      active ? "#a78bfa" : hov ? "#d8d8ea" : "#9494a8",
      }}>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span className="text-[15px] font-medium flex-1" style={{ fontFamily: "'Syne',sans-serif" }}>{label}</span>
    </button>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="mb-5">
      <div className="px-3 mb-1 text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>{title}</div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

/* ── Generation types ── */
const GEN_TYPES = [
  { id: "image",     label: "Image",     hint: "Free-form, full control" },
  { id: "poster",    label: "Poster",    hint: "9:16 · AI-enhanced prompt" },
  { id: "thumbnail", label: "Thumbnail", hint: "16:9 · AI-enhanced prompt" },
];

// Aspect ratio locked per type
const TYPE_RATIO = { poster: "9:16", thumbnail: "16:9" };


const ASPECT_RATIOS = [
  { id: "1:1",  label: "1 : 1"  },
  { id: "16:9", label: "16 : 9" },
  { id: "9:16", label: "9 : 16" },
];


/* ── Section label ── */
function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wider mb-2"
      style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
      {children}
    </div>
  );
}

/* ── Chip ── */
function Chip({ active, onClick, disabled, children }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className="px-3 py-[5px] rounded-[6px] text-[13px] font-medium border-0 transition-all"
      style={{
        cursor:     disabled ? "default" : "pointer",
        background: active   ? "#f5c518" : "rgba(255,255,255,0.05)",
        color:      active   ? "#0b0b10" : disabled ? "#33333f" : "#9494a8",
        opacity:    disabled && !active ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

/* ── ImageCard ── */
function ImageCard({ img, onDelete }) {
  const [copied,     setCopied]     = useState(false);
  const [hovered,    setHovered]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(img.url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = img.url;
    a.download = `generated-${img.id || Date.now()}.jpg`;
    a.target = "_blank";
    a.click();
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!img.id) return;
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    setDeleting(true);
    try {
      await serverFetch(`/api/image-generation/${img.id}`, { method: "DELETE" });
      onDelete?.(img.id);
    } catch { /* ignore */ } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="relative rounded-[10px] overflow-hidden border transition-all duration-200"
      style={{
        borderColor: hovered ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.07)",
        background: "#16161f",
        maxHeight: 520,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={img.url}
        alt={img.prompt || "Generated"}
        className="w-full block"
        style={{ maxHeight: 520, objectFit: "contain" }}
        loading="lazy"
      />

      {/* Hover overlay — buttons at top, prompt at bottom */}
      <div
        className="absolute inset-0 flex flex-col justify-between transition-opacity duration-200"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        {/* Top — action buttons */}
        <div className="flex items-center gap-2 px-3 pt-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-[6px] rounded-[6px] text-[11px] font-semibold border-0 cursor-pointer transition-all"
            style={{ background: copied ? "rgba(34,197,94,0.85)" : "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", color: copied ? "#fff" : "#e8e8f0" }}
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-[6px] rounded-[6px] text-[11px] font-semibold border-0 cursor-pointer"
            style={{ background: "rgba(124,92,252,0.8)", backdropFilter: "blur(6px)", color: "#fff" }}
          >
            Download
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-[8px] py-[6px] rounded-[6px] text-[11px] font-semibold border-0 cursor-pointer transition-all"
              style={{ background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", color: confirming ? "#fff" : "#aaa" }}
              title={confirming ? "Click again to confirm" : "Delete"}
            >
              {deleting ? "…" : confirming ? "Sure?" : "✕"}
            </button>
          )}
        </div>

        {/* Bottom — prompt caption */}
        {img.prompt && (
          <div className="px-3 pb-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
            <div className="text-[11px] text-[#cccccc] line-clamp-2 leading-snug">{img.prompt}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function ImageGeneration() {
  const navigate = useNavigate();
  const { balance, fetchCredits } = useCreditsStore();

  const [genType,     setGenType]     = useState("image");
  const [prompt,      setPrompt]      = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [count,       setCount]       = useState(1);

  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState(null);
  const [results,    setResults]    = useState([]);
  const [activeTab,  setActiveTab]  = useState("generate");

  const { library, total: libraryTotal, loading: loadingLib, fetched: libraryFetched,
          loadLibrary, prependImages, removeImage } = useImageLibraryStore();

  useEffect(() => { fetchCredits(); }, []);

  // When type changes, lock aspect ratio
  useEffect(() => {
    const locked = TYPE_RATIO[genType];
    if (locked) setAspectRatio(locked);
  }, [genType]);

  useEffect(() => {
    if (activeTab === "library" && !libraryFetched) loadLibrary(true);
  }, [activeTab]);

  const creditCost = count * 2;
  const lockedRatio = TYPE_RATIO[genType] || null;

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setError(null);
    setGenerating(true);
    setResults([]);
    try {
      const res  = await serverFetch("/api/image-generation/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim(), aspect_ratio: aspectRatio, count, type: genType }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Generation failed"); return; }
      const generated = data.images || [];
      setResults(generated);
      fetchCredits();
      if (generated.length) prependImages(generated);
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setGenerating(false);
    }
  };

  const location = useLocation();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
  };

  return (
    <div className="flex min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col shrink-0 border-r" style={{ width: 220, borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
        <div className="px-4 py-5 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="flex flex-col gap-[2px] mb-5">
            <NavItem icon={Icons.folder}  label="Videos"  active={location.pathname === "/dashboard"}       onClick={() => navigate("/dashboard")} />
            <NavItem icon={Icons.gallery} label="Images"  active={location.pathname === "/image-generation"} onClick={() => {}} />
            <NavItem icon={Icons.box}     label="Assets"  active={location.pathname === "/assets"}           onClick={() => navigate("/assets")} />
            <NavItem icon={Icons.credits} label="Credits" active={location.pathname === "/credits"}          onClick={() => navigate("/credits")} />
          </div>
          <NavSection title="Account">
            <NavItem icon={Icons.settings} label="Settings" active={false} onClick={() => navigate("/settings")} />
          </NavSection>
        </nav>

        <div className="px-3 py-4 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-3 py-[7px] rounded-[8px] text-[14px] font-mono"
            style={{ background: "rgba(255,255,255,0.04)", color: balance !== null && balance < 10 ? "#f97316" : "#7c5cfc" }}>
            <span>⚡ Credits</span>
            <span className="font-bold">{balance ?? "—"}</span>
          </div>
          <button onClick={async () => { await signOut(); navigate("/login"); }}
            className="w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[15px] border-0 cursor-pointer transition-all text-left"
            style={{ background: "transparent", color: "#f87171" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
          <h1 className="text-[20px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne',sans-serif", color: "#f5c518" }}>Images</h1>
          <div className="flex gap-1 bg-[#111118] rounded-[8px] p-[3px]">
            {[["generate", "Generate"], ["library", "My Library"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="px-5 py-[6px] rounded-[6px] text-[13px] font-semibold border-0 cursor-pointer transition-all"
                style={{ background: activeTab === id ? "#f5c518" : "transparent", color: activeTab === id ? "#0b0b10" : "#55556a" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">

        {activeTab === "generate" && (
          <div className="flex gap-8 items-start">

            {/* ── Left controls ── */}
            <div className="w-[340px] shrink-0 flex flex-col gap-5">

              {/* Generation type */}
              <div>
                <SectionLabel>Type</SectionLabel>
                <div className="flex gap-0 bg-[#111118] rounded-[8px] p-[3px]">
                  {GEN_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setGenType(t.id)}
                      className="flex-1 py-[7px] rounded-[6px] text-[13px] font-semibold border-0 cursor-pointer transition-all text-center"
                      style={{
                        background: genType === t.id ? "#f5c518" : "transparent",
                        color:      genType === t.id ? "#0b0b10"  : "#9494a8",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#55556a" }}>
                  {GEN_TYPES.find(t => t.id === genType)?.hint}
                </div>
              </div>

              {/* Prompt */}
              <div>
                <SectionLabel>Prompt</SectionLabel>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    genType === "poster"    ? "e.g. Fitness supplement launch, bold energy…" :
                    genType === "thumbnail" ? "e.g. I tried the world's hottest pizza…" :
                    "Describe the image you want to generate…"
                  }
                  rows={4}
                  className="w-[93%] bg-[#111118] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-3 text-[14px] text-[#e8e8f0] resize-none focus:outline-none focus:border-[#7c5cfc] transition-colors"
                  style={{ fontFamily: "inherit" }}
                />
                <div className="text-[11px] mt-1" style={{ color: "#44444f" }}>⌘+Enter to generate</div>
              </div>


              {/* Aspect ratio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel>Aspect Ratio</SectionLabel>
                  {lockedRatio && (
                    <span className="text-[10px]" style={{ color: "#55556a" }}>
                      Locked to {lockedRatio}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_RATIOS.map(r => (
                    <Chip
                      key={r.id}
                      active={aspectRatio === r.id}
                      disabled={!!lockedRatio && r.id !== lockedRatio}
                      onClick={() => setAspectRatio(r.id)}
                    >
                      {r.label}
                    </Chip>
                  ))}
                </div>
              </div>


              {/* Count */}
              <div>
                <SectionLabel>Number of Images</SectionLabel>
                <div className="flex gap-2">
                  {[1, 2, 4].map(n => (
                    <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n}</Chip>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="px-3 py-2 rounded-[6px] text-[12px] text-[#f87171]"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {error}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="w-full py-[10px] rounded-[8px] text-[14px] font-bold border-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#f5c518", color: "#0b0b10" }}
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0b0b10] border-t-transparent rounded-full animate-spin inline-block" />
                    Generating…
                  </span>
                ) : (
                  `Generate · ${creditCost} credit${creditCost !== 1 ? "s" : ""}`
                )}
              </button>

            </div>

            {/* ── Right results ── */}
            <div className="flex-1" style={{ minHeight: 400, maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
              {results.length === 0 && !generating && (
                <div className="flex flex-col items-center justify-center h-[400px] border border-[rgba(255,255,255,0.05)] rounded-[14px]"
                  style={{ background: "rgba(255,255,255,0.01)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.1, marginBottom: 16 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                    <path d="M3 15l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div className="text-[15px]" style={{ color: "#44444f" }}>Your images will appear here</div>
                  <div className="text-[12px] mt-1" style={{ color: "#33333f" }}>Write a prompt and hit Generate</div>
                </div>
              )}

              {generating && (
                <div className="flex flex-col items-center justify-center h-[400px] border border-[rgba(255,255,255,0.05)] rounded-[14px]"
                  style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="w-8 h-8 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin mb-4" />
                  <div className="text-[14px] text-[#7c5cfc]">Generating your {genType}{count > 1 ? "s" : ""}…</div>
                  <div className="text-[11px] mt-1" style={{ color: "#44444f" }}>This may take 10–30 seconds</div>
                </div>
              )}

              {results.length > 0 && (
                <div>
                  <div className="text-[12px] mb-3" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
                    {results.length} {genType}{results.length !== 1 ? "s" : ""} generated
                  </div>
                  <div className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${Math.min(results.length, 2)}, 1fr)` }}>
                    {results.map((img, i) => (
                      <ImageCard key={img.id || i} img={{ ...img, prompt }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === "library" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: "'Syne',sans-serif" }}>
                My Generated Images
              </h2>
              <button onClick={() => loadLibrary(true)}
                className="text-[12px] text-[#7c5cfc] bg-transparent border-0 cursor-pointer hover:opacity-80">
                Refresh
              </button>
            </div>

            {loadingLib && library.length === 0 && (
              <div className="flex items-center justify-center py-24">
                <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loadingLib && library.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="text-[14px]" style={{ color: "#55556a" }}>No images generated yet</div>
                <button onClick={() => setActiveTab("generate")}
                  className="text-[13px] text-[#7c5cfc] bg-transparent border-0 cursor-pointer hover:opacity-80">
                  Generate your first image →
                </button>
              </div>
            )}

            {library.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4 text-[12px]" style={{ color: "#55556a" }}>
                  Showing {library.length} of {libraryTotal} images
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {library.map((img, i) => (
                    <ImageCard
                      key={img.id || i}
                      img={img}
                      onDelete={(id) => removeImage(id)}
                    />
                  ))}
                </div>
                {library.length < libraryTotal && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => loadLibrary(false)}
                      disabled={loadingLib}
                      className="px-6 py-[8px] rounded-[8px] text-[13px] text-[#9494a8] border border-[rgba(255,255,255,0.08)] bg-transparent cursor-pointer hover:border-[rgba(124,92,252,0.4)] hover:text-[#a78bfa] transition-all disabled:opacity-50"
                    >
                      {loadingLib ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
