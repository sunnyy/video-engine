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
  const [topTab,      setTopTab]      = useState("library");

  const [prompt,      setPrompt]      = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [count,       setCount]       = useState(1);
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState(null);
  const [results,     setResults]     = useState([]);

  const { library, total: libraryTotal, loading: loadingLib, fetched: libraryFetched,
          loadLibrary, prependImages, removeImage } = useImageLibraryStore();

  useEffect(() => { fetchCredits(); }, []);
  useEffect(() => { if (!libraryFetched) loadLibrary(true); }, []);
  useEffect(() => { if (topTab === "library" && !libraryFetched) loadLibrary(true); }, [topTab]);

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
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "16px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>Images</h1>
          <div style={{ display: "flex", gap: 4 }}>
            {[["library", "My Library"], ["create", "Create New"]].map(([id, label]) => (
              <button key={id} onClick={() => setTopTab(id)}
                style={{ padding: "8px 20px", border: "none", borderRadius: "8px 8px 0 0",
                  background: topTab === id ? "rgba(124,92,252,0.15)" : "transparent",
                  color: topTab === id ? "#a78bfa" : "#55556a",
                  fontSize: 14, fontWeight: topTab === id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif", cursor: "pointer", transition: "all 0.15s",
                  borderBottom: topTab === id ? "2px solid #7c5cfc" : "2px solid transparent" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── My Library tab ── */}
        {topTab === "library" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            {loadingLib && library.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
                <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loadingLib && library.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 }}>
                <div style={{ fontSize: 14, color: "#55556a" }}>No images generated yet</div>
                <button onClick={() => setTopTab("create")}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7c5cfc", fontSize: 13 }}>
                  Generate your first image →
                </button>
              </div>
            )}
            {library.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "#44444f", marginBottom: 16 }}>
                  Showing {library.length} of {libraryTotal} images
                </div>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                  {library.map((img, i) => (
                    <ImageCard key={img.id || i} img={img} onDelete={id => removeImage(id)} />
                  ))}
                </div>
                {library.length < libraryTotal && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
                    <button onClick={() => loadLibrary(false)} disabled={loadingLib}
                      style={{ padding: "8px 24px", borderRadius: 8, fontSize: 13, color: "#9494a8", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", cursor: "pointer", opacity: loadingLib ? 0.5 : 1 }}>
                      {loadingLib ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Create New tab — two-column layout ── */}
        {topTab === "create" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Left sidebar — controls */}
            <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", overflow: "hidden" }}>

              {/* Settings — scrollable */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Prompt */}
                <div>
                  <Label>Prompt</Label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerateClick(); }}
                    placeholder="Describe the image you want to generate…"
                    rows={5}
                    style={{ width: "100%", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#e8e8f0", resize: "none", outline: "none", background: "#111118", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  <div style={{ fontSize: 10, marginTop: 4, color: "#33333f" }}>⌘+Enter to generate</div>
                </div>

                {/* Aspect ratio */}
                <div>
                  <Label>Aspect Ratio</Label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {ASPECT_RATIOS.map(r => (
                      <button key={r.id} onClick={() => setAspectRatio(r.id)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                          background: aspectRatio === r.id ? "rgba(245,197,24,0.1)" : "rgba(255,255,255,0.04)",
                          color:      aspectRatio === r.id ? "#f5c518" : "#7070a0",
                          outline:    aspectRatio === r.id ? "1px solid rgba(245,197,24,0.35)" : "1px solid transparent" }}>
                        <span style={{ fontSize: 15, opacity: 0.6 }}>{r.icon}</span>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div>
                  <Label>Number of Images</Label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 4].map(n => (
                      <button key={n} onClick={() => setCount(n)}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s",
                          background: count === n ? "rgba(245,197,24,0.12)" : "rgba(255,255,255,0.04)",
                          color:      count === n ? "#f5c518" : "#7070a0",
                          outline:    count === n ? "1px solid rgba(245,197,24,0.35)" : "1px solid transparent" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "8px 12px", borderRadius: 6, fontSize: 12, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                    {error}
                  </div>
                )}
              </div>

              {/* Generate button — pinned */}
              <div style={{ padding: "12px 20px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                <button
                  onClick={handleGenerateClick}
                  disabled={!prompt.trim() || generating}
                  style={{ width: "100%", padding: "11px 0", borderRadius: 8, fontSize: 14, fontWeight: 800, border: "none", cursor: !prompt.trim() || generating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#f5c518", color: "#0b0b10", opacity: !prompt.trim() || generating ? 0.4 : 1 }}>
                  {generating ? (
                    <>
                      <span style={{ width: 16, height: 16, border: "2px solid #0b0b10", borderTopColor: "transparent", borderRadius: "50%", animation: "ig-spin 0.8s linear infinite", display: "inline-block" }} />
                      Generating…
                    </>
                  ) : (
                    <>✦ Generate · {creditCost} credit{creditCost !== 1 ? "s" : ""}</>
                  )}
                </button>
              </div>
            </div>

            {/* Right board — results */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#0b0b10" }}>
              {results.length === 0 && !generating && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)", minHeight: 320 }}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.08 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                    <path d="M3 15l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: 14, color: "#44444f" }}>Your images will appear here</div>
                  <div style={{ fontSize: 12, color: "#33333f" }}>Write a prompt and hit Generate</div>
                </div>
              )}

              {generating && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)", minHeight: 320 }}>
                  <GeneratingLoader message={`Generating your image${count > 1 ? "s" : ""}`} hint="10–30 seconds" />
                </div>
              )}

              {results.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "#44444f", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}>
                    {results.length} image{results.length !== 1 ? "s" : ""} generated
                  </div>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: `repeat(${Math.min(results.length, 3)}, 1fr)` }}>
                    {results.map((img, i) => (
                      <ImageCard key={img.id || i} img={{ ...img, prompt }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes ig-spin { to { transform: rotate(360deg); } }`}</style>

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
