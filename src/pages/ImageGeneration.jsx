/**
 * ImageGeneration.jsx
 * src/pages/ImageGeneration.jsx
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";

/* ── Constants ── */
const STYLES = [
  { id: "photorealistic", label: "Photo Real" },
  { id: "cinematic",      label: "Cinematic"  },
  { id: "illustration",   label: "Illustration"},
  { id: "3d",             label: "3D Render"  },
  { id: "anime",          label: "Anime"      },
  { id: "minimal",        label: "Minimal"    },
];

const ASPECT_RATIOS = [
  { id: "1:1",  label: "1 : 1",  icon: "■" },
  { id: "16:9", label: "16 : 9", icon: "▬" },
  { id: "9:16", label: "9 : 16", icon: "▮" },
  { id: "4:3",  label: "4 : 3",  icon: "▬" },
  { id: "3:4",  label: "3 : 4",  icon: "▮" },
];

const QUALITY_OPTIONS = [
  { id: "standard", label: "Standard", creditsPerImg: 1, hint: "Fast · 1 credit/img" },
  { id: "high",     label: "High",     creditsPerImg: 2, hint: "Slower · 2 credits/img" },
];

/* ── Small components ── */
function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-[5px] rounded-[6px] text-[13px] font-medium border-0 cursor-pointer transition-all"
      style={{
        background: active ? "#f5c518" : "rgba(255,255,255,0.05)",
        color:      active ? "#0b0b10" : "#9494a8",
      }}
    >
      {children}
    </button>
  );
}

function ImageCard({ img, onCopy }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(img.url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(img.url);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = img.url;
    a.download = `generated-${img.id || Date.now()}.jpg`;
    a.target = "_blank";
    a.click();
  };

  const ratio = img.width && img.height ? img.height / img.width : 1;

  return (
    <div
      className="relative rounded-[10px] overflow-hidden border transition-all duration-200 group"
      style={{
        borderColor: hovered ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.07)",
        background: "#111118",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ paddingTop: `${Math.min(ratio * 100, 150)}%`, position: "relative" }}>
        <img
          src={img.url}
          alt={img.prompt || "Generated image"}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-end transition-opacity duration-200"
        style={{ opacity: hovered ? 1 : 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }}
      >
        {img.prompt && (
          <div className="px-3 pb-[10px] pt-6">
            <div className="text-[11px] text-[#cccccc] line-clamp-2 leading-snug">{img.prompt}</div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-[5px] rounded-[5px] text-[11px] font-semibold border-0 cursor-pointer transition-all"
                style={{ background: copied ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.12)", color: copied ? "#4ade80" : "#e8e8f0" }}
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-[5px] rounded-[5px] text-[11px] font-semibold border-0 cursor-pointer"
                style={{ background: "rgba(124,92,252,0.25)", color: "#a78bfa" }}
              >
                Download
              </button>
            </div>
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

  const [prompt,      setPrompt]      = useState("");
  const [style,       setStyle]       = useState("photorealistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality,     setQuality]     = useState("standard");
  const [count,       setCount]       = useState(1);

  const [generating,   setGenerating]   = useState(false);
  const [error,        setError]        = useState(null);
  const [results,      setResults]      = useState([]);   // latest batch
  const [library,      setLibrary]      = useState([]);   // historical
  const [libraryPage,  setLibraryPage]  = useState(0);
  const [libraryMore,  setLibraryMore]  = useState(true);
  const [loadingLib,   setLoadingLib]   = useState(false);
  const [activeTab,    setActiveTab]    = useState("generate"); // "generate" | "library"

  useEffect(() => { fetchCredits(); }, []);

  const loadLibrary = useCallback(async (reset = false) => {
    if (loadingLib) return;
    const offset = reset ? 0 : libraryPage * 20;
    setLoadingLib(true);
    try {
      const res = await serverFetch(`/api/image-generation/library?limit=20&offset=${offset}`);
      const data = await res.json();
      const imgs = data.images || [];
      if (reset) {
        setLibrary(imgs);
        setLibraryPage(1);
      } else {
        setLibrary(prev => [...prev, ...imgs]);
        setLibraryPage(p => p + 1);
      }
      setLibraryMore(imgs.length === 20);
    } catch (e) {
      console.error("[image-gen] library load error:", e);
    } finally {
      setLoadingLib(false);
    }
  }, [loadingLib, libraryPage]);

  useEffect(() => {
    if (activeTab === "library" && library.length === 0) loadLibrary(true);
  }, [activeTab]);

  const qualityMeta = QUALITY_OPTIONS.find(q => q.id === quality);
  const creditCost  = (qualityMeta?.creditsPerImg || 1) * count;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (generating) return;
    setError(null);
    setGenerating(true);
    setResults([]);

    try {
      const res = await serverFetch("/api/image-generation/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim(), style, aspect_ratio: aspectRatio, quality, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }
      setResults(data.images || []);
      fetchCredits();
      // Refresh library if visible
      if (activeTab === "library") loadLibrary(true);
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
  };

  return (
    <div className="min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] px-6 py-3 flex items-center justify-between shrink-0" style={{ background: "#111118" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-[#77777f] hover:text-[#e8e8f0] transition-colors text-[15px] bg-transparent border-0 cursor-pointer"
          >
            ← Home
          </button>
          <div className="w-[1px] h-[18px] bg-[rgba(255,255,255,0.08)]" />
          <div className="w-[36px] h-[24px] flex items-center justify-center rounded-[4px] bg-[#f5c518] text-[#0b0b10] font-bold text-[15px]"
            style={{ fontFamily: "'Syne',sans-serif" }}>VE</div>
          <span className="text-[15px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne',sans-serif" }}>Image Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1 px-3 py-[5px] rounded-[6px] text-[13px] font-mono border"
            style={{ background: "#16161f", borderColor: "rgba(255,255,255,0.06)", color: balance !== null && balance < 10 ? "#f97316" : "#7c5cfc" }}
          >
            ⚡ {balance ?? "—"} credits
          </div>
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="text-[13px] text-[#f87171] bg-transparent border-0 cursor-pointer hover:opacity-80 px-1"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8">

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#111118] rounded-[8px] p-[3px] w-fit">
          {[["generate","Generate"], ["library","My Library"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="px-5 py-[6px] rounded-[6px] text-[13px] font-semibold border-0 cursor-pointer transition-all"
              style={{
                background: activeTab === id ? "#f5c518" : "transparent",
                color:      activeTab === id ? "#0b0b10"  : "#55556a",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "generate" && (
          <div className="flex gap-8 items-start">

            {/* Left — controls */}
            <div className="w-[340px] shrink-0 flex flex-col gap-5">

              {/* Prompt */}
              <div>
                <label className="block text-[12px] font-semibold text-[#55556a] uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the image you want to generate…"
                  rows={4}
                  className="w-full bg-[#111118] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-3 text-[14px] text-[#e8e8f0] resize-none focus:outline-none focus:border-[#7c5cfc] transition-colors"
                  style={{ fontFamily: "inherit" }}
                />
                <div className="text-[11px] text-[#44444f] mt-1">⌘+Enter to generate</div>
              </div>

              {/* Style */}
              <div>
                <label className="block text-[12px] font-semibold text-[#55556a] uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  Style
                </label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Aspect ratio */}
              <div>
                <label className="block text-[12px] font-semibold text-[#55556a] uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  Aspect Ratio
                </label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_RATIOS.map(r => (
                    <Chip key={r.id} active={aspectRatio === r.id} onClick={() => setAspectRatio(r.id)}>
                      {r.label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-[12px] font-semibold text-[#55556a] uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  Quality
                </label>
                <div className="flex gap-2">
                  {QUALITY_OPTIONS.map(q => (
                    <button
                      key={q.id}
                      onClick={() => setQuality(q.id)}
                      className="flex-1 py-[8px] rounded-[8px] border cursor-pointer transition-all text-left px-3"
                      style={{
                        background:   quality === q.id ? "rgba(124,92,252,0.12)" : "rgba(255,255,255,0.03)",
                        borderColor:  quality === q.id ? "rgba(124,92,252,0.5)"  : "rgba(255,255,255,0.06)",
                        color:        quality === q.id ? "#a78bfa" : "#55556a",
                      }}
                    >
                      <div className="text-[13px] font-semibold">{q.label}</div>
                      <div className="text-[11px] opacity-70 mt-[2px]">{q.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div>
                <label className="block text-[12px] font-semibold text-[#55556a] uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  Number of Images
                </label>
                <div className="flex gap-2">
                  {[1, 2, 4].map(n => (
                    <Chip key={n} active={count === n} onClick={() => setCount(n)}>
                      {n}
                    </Chip>
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

            {/* Right — results */}
            <div className="flex-1 min-h-[400px]">
              {results.length === 0 && !generating && (
                <div className="flex flex-col items-center justify-center h-[400px] border border-[rgba(255,255,255,0.05)] rounded-[14px]"
                  style={{ background: "rgba(255,255,255,0.01)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.12, marginBottom: 16 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                    <path d="M3 15l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div className="text-[15px] text-[#44444f]">Your images will appear here</div>
                  <div className="text-[12px] text-[#33333f] mt-1">Write a prompt and hit Generate</div>
                </div>
              )}

              {generating && (
                <div className="flex flex-col items-center justify-center h-[400px] border border-[rgba(255,255,255,0.05)] rounded-[14px]"
                  style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="w-8 h-8 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin mb-4" />
                  <div className="text-[14px] text-[#7c5cfc]">Generating your image{count > 1 ? "s" : ""}…</div>
                  <div className="text-[11px] text-[#44444f] mt-1">This may take 10–30 seconds</div>
                </div>
              )}

              {results.length > 0 && (
                <div>
                  <div className="text-[12px] text-[#55556a] mb-3" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                    {results.length} image{results.length !== 1 ? "s" : ""} generated
                  </div>
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${Math.min(results.length, 2)}, 1fr)` }}
                  >
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
              <button
                onClick={() => loadLibrary(true)}
                className="text-[12px] text-[#7c5cfc] bg-transparent border-0 cursor-pointer hover:opacity-80"
              >
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
                <div className="text-[14px] text-[#55556a]">No images generated yet</div>
                <button
                  onClick={() => setActiveTab("generate")}
                  className="text-[13px] text-[#7c5cfc] bg-transparent border-0 cursor-pointer hover:opacity-80"
                >
                  Generate your first image →
                </button>
              </div>
            )}

            {library.length > 0 && (
              <>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {library.map((img, i) => (
                    <ImageCard key={img.id || i} img={img} />
                  ))}
                </div>
                {libraryMore && (
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
  );
}
