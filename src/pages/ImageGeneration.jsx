/**
 * ImageGeneration.jsx — AI Image Studio
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { useImageLibraryStore } from "../store/useImageLibraryStore";
import { getCredits } from "../services/credits/creditService";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import GeneratingLoader from "../ui/GeneratingLoader";
import AppLayout from "../ui/AppLayout";

const ASPECT_RATIOS = [
  { id: "1:1",  label: "1 : 1",  icon: "▪" },
  { id: "16:9", label: "16 : 9", icon: "▬" },
  { id: "9:16", label: "9 : 16", icon: "▮" },
];

function Label({ children }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wider mb-2"
      style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
      {children}
    </div>
  );
}

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
    } catch { } finally { setDeleting(false); }
  };

  return (
    <div
      className="relative rounded-[10px] overflow-hidden border transition-all duration-200"
      style={{ borderColor: hovered ? "rgba(245,197,24,0.4)" : "rgba(255,255,255,0.07)", background: "#16161f" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img src={img.url} alt={img.prompt || "Generated"} className="w-full block" style={{ objectFit: "cover" }} loading="lazy" />
      <div className="absolute inset-0 flex flex-col justify-between transition-opacity duration-200" style={{ opacity: hovered ? 1 : 0 }}>
        <div className="flex items-center gap-2 px-3 pt-3">
          <button onClick={handleCopy}
            className="flex-1 py-[6px] rounded-[6px] text-[11px] font-semibold border-0 cursor-pointer"
            style={{ background: copied ? "rgba(34,197,94,0.85)" : "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", color: "#fff" }}>
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <button onClick={handleDownload}
            className="flex-1 py-[6px] rounded-[6px] text-[11px] font-semibold border-0 cursor-pointer"
            style={{ background: "rgba(245,197,24,0.85)", backdropFilter: "blur(6px)", color: "#0b0b10" }}>
            Download
          </button>
          {onDelete && (
            <button onClick={handleDelete} disabled={deleting}
              className="px-[8px] py-[6px] rounded-[6px] text-[11px] font-semibold border-0 cursor-pointer"
              style={{ background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", color: confirming ? "#fff" : "#aaa" }}>
              {deleting ? "…" : confirming ? "Sure?" : "✕"}
            </button>
          )}
        </div>
        {img.prompt && (
          <div className="px-3 pb-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
            <div className="text-[11px] text-[#cccccc] line-clamp-2 leading-snug">{img.prompt}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImageGeneration() {
  const navigate         = useNavigate();
  const { fetchCredits } = useCreditsStore();
  const [creditModal, setCreditModal] = useState(null);

  const [prompt,      setPrompt]      = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [count,       setCount]       = useState(1);
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState(null);
  const [results,     setResults]     = useState([]);
  const [activeTab,   setActiveTab]   = useState("generate");

  const { library, total: libraryTotal, loading: loadingLib, fetched: libraryFetched,
          loadLibrary, prependImages, removeImage } = useImageLibraryStore();

  useEffect(() => { fetchCredits(); }, []);
  useEffect(() => { if (!libraryFetched) loadLibrary(true); }, []);
  useEffect(() => { if (activeTab === "library" && !libraryFetched) loadLibrary(true); }, [activeTab]);

  const creditCost = count * 2;

  const handleGenerateClick = async () => {
    if (!prompt.trim() || generating) return;
    const credits = await getCredits();
    setCreditModal({
      total: count * 2,
      breakdown: { [`Generate ${count} image${count !== 1 ? "s" : ""}`]: count * 2 },
      balance: credits?.balance ?? 0,
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setError(null);
    setGenerating(true);
    setResults([]);
    setActiveTab("generate");
    try {
      const res  = await serverFetch("/api/image-generation/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim(), aspect_ratio: aspectRatio, count, type: "image" }),
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

  return (
    <AppLayout>
      {/* Full-height two-column layout */}
      <div className="flex h-full overflow-hidden">

        {/* ── Left sidebar — controls ── */}
        <div className="w-[280px] shrink-0 flex flex-col border-r overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="text-[18px] font-bold" style={{ color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>Images</div>
            <div className="text-[12px] mt-0.5" style={{ color: "#44444f" }}>AI Image Generator</div>
          </div>

          {/* Settings — scrollable middle */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">

            {/* Prompt */}
            <div>
              <Label>Prompt</Label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerateClick(); }}
                placeholder="Describe the image you want to generate…"
                rows={5}
                className="w-full rounded-[8px] px-3 py-3 text-[13px] text-[#e8e8f0] resize-none focus:outline-none transition-colors"
                style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit" }}
              />
              <div className="text-[10px] mt-1" style={{ color: "#33333f" }}>⌘+Enter to generate</div>
            </div>

            {/* Aspect ratio */}
            <div>
              <Label>Aspect Ratio</Label>
              <div className="flex flex-col gap-1.5">
                {ASPECT_RATIOS.map(r => (
                  <button key={r.id} onClick={() => setAspectRatio(r.id)}
                    className="flex items-center gap-3 px-3 py-[8px] rounded-[7px] text-[13px] font-medium border-0 cursor-pointer transition-all text-left"
                    style={{
                      background: aspectRatio === r.id ? "rgba(245,197,24,0.1)" : "rgba(255,255,255,0.04)",
                      color:      aspectRatio === r.id ? "#f5c518" : "#7070a0",
                      outline:    aspectRatio === r.id ? "1px solid rgba(245,197,24,0.35)" : "1px solid transparent",
                    }}>
                    <span className="text-[15px] opacity-60">{r.icon}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <Label>Number of Images</Label>
              <div className="flex gap-2">
                {[1, 2, 4].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className="flex-1 py-[7px] rounded-[7px] text-[13px] font-semibold border-0 cursor-pointer transition-all"
                    style={{
                      background: count === n ? "rgba(245,197,24,0.12)" : "rgba(255,255,255,0.04)",
                      color:      count === n ? "#f5c518" : "#7070a0",
                      outline:    count === n ? "1px solid rgba(245,197,24,0.35)" : "1px solid transparent",
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-[6px] text-[12px] text-[#f87171]"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                {error}
              </div>
            )}

          </div>

          {/* Generate button — pinned to bottom */}
          <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <button
              onClick={handleGenerateClick}
              disabled={!prompt.trim() || generating}
              className="w-full py-[11px] rounded-[8px] text-[14px] font-bold border-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "#f5c518", color: "#0b0b10" }}>
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0b0b10] border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <span>✦</span>
                  Generate · {creditCost} credit{creditCost !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Right panel — board / results ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0b0b10" }}>

          {/* Right top bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex gap-1 bg-[#111118] rounded-[7px] p-[3px]">
              {[["generate", "Board"], ["library", "My Library"]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className="px-4 py-[5px] rounded-[5px] text-[12px] font-semibold border-0 cursor-pointer transition-all"
                  style={{
                    background: activeTab === id ? "#1e1e2e" : "transparent",
                    color:      activeTab === id ? "#e8e8f0" : "#55556a",
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "library" && (
              <button onClick={() => loadLibrary(true)}
                className="text-[12px] bg-transparent border-0 cursor-pointer hover:opacity-80"
                style={{ color: "#7c5cfc" }}>
                Refresh
              </button>
            )}
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ── Generate tab ── */}
            {activeTab === "generate" && (
              <>
                {results.length === 0 && !generating && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 rounded-[14px] border"
                    style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)", minHeight: 320 }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.08 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                      <path d="M3 15l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <div className="text-[14px]" style={{ color: "#44444f" }}>Your images will appear here</div>
                    <div className="text-[12px]" style={{ color: "#33333f" }}>Write a prompt and hit Generate</div>
                  </div>
                )}

                {generating && (
                  <div className="flex flex-col items-center justify-center h-full rounded-[14px] border"
                    style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)", minHeight: 320 }}>
                    <GeneratingLoader message={`Generating your image${count > 1 ? "s" : ""}`} hint="10–30 seconds" />
                  </div>
                )}

                {results.length > 0 && (
                  <>
                    <div className="text-[11px] mb-4" style={{ color: "#44444f", fontFamily: "'JetBrains Mono',monospace" }}>
                      {results.length} image{results.length !== 1 ? "s" : ""} generated
                    </div>
                    <div className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${Math.min(results.length, 3)}, 1fr)` }}>
                      {results.map((img, i) => (
                        <ImageCard key={img.id || i} img={{ ...img, prompt }} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── Library tab ── */}
            {activeTab === "library" && (
              <>
                {loadingLib && library.length === 0 && (
                  <div className="flex items-center justify-center py-24">
                    <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!loadingLib && library.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="text-[14px]" style={{ color: "#55556a" }}>No images generated yet</div>
                    <button onClick={() => setActiveTab("generate")}
                      className="text-[13px] bg-transparent border-0 cursor-pointer hover:opacity-80"
                      style={{ color: "#7c5cfc" }}>
                      Generate your first image →
                    </button>
                  </div>
                )}
                {library.length > 0 && (
                  <>
                    <div className="text-[11px] mb-4" style={{ color: "#44444f" }}>
                      Showing {library.length} of {libraryTotal} images
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                      {library.map((img, i) => (
                        <ImageCard key={img.id || i} img={img} onDelete={id => removeImage(id)} />
                      ))}
                    </div>
                    {library.length < libraryTotal && (
                      <div className="flex justify-center mt-8">
                        <button onClick={() => loadLibrary(false)} disabled={loadingLib}
                          className="px-6 py-[8px] rounded-[8px] text-[13px] border cursor-pointer transition-all disabled:opacity-50"
                          style={{ color: "#9494a8", borderColor: "rgba(255,255,255,0.08)", background: "transparent" }}>
                          {loadingLib ? "Loading…" : "Load more"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {creditModal && (
        <CreditConfirmModal
          service="Images"
          breakdown={creditModal.breakdown}
          total={creditModal.total}
          balance={creditModal.balance}
          onConfirm={() => { setCreditModal(null); handleGenerate(); }}
          onCancel={() => setCreditModal(null)}
          onTopUp={() => { setCreditModal(null); navigate("/credits"); }}
        />
      )}
    </AppLayout>
  );
}
