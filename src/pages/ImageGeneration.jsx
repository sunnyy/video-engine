import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { useImageLibraryStore } from "../store/useImageLibraryStore";
import { getCredits } from "../services/credits/creditService";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import AppLayout from "../ui/AppLayout";
import RefundClaimTrigger from "../ui/components/RefundClaimTrigger";
import SizeSelector from "../ui/SizeSelector";

const C = {
  lbl:  { fontSize: 11, fontWeight: 700, color: "#8888aa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, display: "block" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", width: "100%" },
};

const ASPECT_RATIOS = [
  { id: "1:1",  label: "1 : 1",  icon: "▪", cssRatio: "1/1"  },
  { id: "4:5",  label: "4 : 5",  icon: "▮", cssRatio: "4/5"  },
  { id: "16:9", label: "16 : 9", icon: "▬", cssRatio: "16/9" },
  { id: "9:16", label: "9 : 16", icon: "▮", cssRatio: "9/16" },
];

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  return d.toLocaleDateString();
}

function ImageCard({ img, onSelect, onDelete }) {
  const [hov,        setHov]        = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    const res  = await fetch(img.url);
    const blob = await res.blob();
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `generated-${img.id || Date.now()}.jpg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!img.id) return;
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 2500); return; }
    setDeleting(true);
    try {
      await serverFetch(`/api/image-generation/${img.id}`, { method: "DELETE" });
      onDelete?.(img.id);
    } catch { } finally { setDeleting(false); }
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirming(false); }}
      style={{
        position: "relative", borderRadius: 12, overflow: "hidden",
        cursor: onSelect ? "pointer" : "default",
        border: `2px solid ${hov ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.08)"}`,
        background: "#1e1e30",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <img src={img.url} alt={img.prompt || "Generated"} style={{ width: "100%", display: "block", objectFit: "cover" }} loading="lazy" />

      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hov ? 1 : 0, transition: "opacity 0.2s", pointerEvents: hov ? "auto" : "none" }}>
        <button onClick={handleDownload}
          style={{ padding: "8px 20px", background: "#f5c518", color: "#000", borderRadius: 8, fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
          ↓ Download
        </button>
      </div>

      {onDelete && (
        <button onClick={handleDelete} disabled={deleting}
          style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 5, background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", border: "none", color: confirming ? "#fff" : "#bbb", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
          {deleting ? "…" : "✕"}
        </button>
      )}

      {img.created_at && (
        <div style={{ position: "absolute", bottom: 6, left: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.65)", color: "#9494a8", backdropFilter: "blur(4px)", lineHeight: 1.4, pointerEvents: "none" }}>
          {timeLabel(img.created_at)}
        </div>
      )}
    </div>
  );
}

export default function ImageGeneration() {
  const navigate         = useNavigate();
  const { fetchCredits } = useCreditsStore();
  const [creditModal, setCreditModal] = useState(null);
  const [activeTab,   setActiveTab]   = useState("result");

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
  useEffect(() => { if (activeTab === "library" && !libraryFetched) loadLibrary(true); }, [activeTab]);

  const creditCost    = count * 2;
  const cssRatio      = ASPECT_RATIOS.find(r => r.id === aspectRatio)?.cssRatio ?? "1/1";
  const shimmerCols   = count === 1 ? 1 : count === 2 ? 2 : 2;

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
    setActiveTab("result");
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
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "#1E1E34" }}>
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>Image Studio</h1>
          </div>

          {/* Scrollable form */}
          <div className="left-panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Prompt */}
            <div>
              <label style={C.lbl}>Prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerateClick(); }}
                placeholder="Describe the image you want to generate…"
                rows={6}
                style={{ width: "100%", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#e8e8f0", resize: "none", outline: "none", background: "#252540", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "inherit", boxSizing: "border-box" }}
              />
              <div style={{ fontSize: 10, marginTop: 4, color: "#44445a" }}>⌘+Enter to generate</div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

            {/* Aspect ratio */}
            <div>
              <SizeSelector value={aspectRatio} onChange={setAspectRatio} options={["1:1", "4:5", "9:16", "16:9"]} accent="#f5c518" />
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

            {/* Count */}
            <div>
              <label style={C.lbl}>Number of Images</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 4].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s",
                      background: count === n ? "rgba(245,197,24,0.12)" : "rgba(255,255,255,0.05)",
                      color:      count === n ? "#f5c518" : "#8888aa",
                      outline:    count === n ? "1px solid rgba(245,197,24,0.35)" : "1px solid transparent" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)" }}>
                ✕ {error}
              </div>
            )}
          </div>

          {/* Generate button — pinned */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <button onClick={handleGenerateClick} disabled={!prompt.trim() || generating}
              style={{ ...C.btnY, opacity: !prompt.trim() || generating ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {generating ? (
                <>
                  <span style={{ width: 15, height: 15, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "ig-spin 0.8s linear infinite", display: "inline-block" }} />
                  Generating…
                </>
              ) : (
                <>✦ Generate · {creditCost} credit{creditCost !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#151523" }}>
          {/* Tab bar */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#151523", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
            <div style={{ display: "flex" }}>
              {[
                ["result",  "Result"],
                ["library", `My Library${!loadingLib && library.length ? ` (${library.length})` : ""}`],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ padding: "16px 20px", border: "none", background: "transparent", color: activeTab === id ? "#a78bfa" : "#55556a", fontSize: 14, fontWeight: activeTab === id ? 700 : 500, fontFamily: "'Outfit',sans-serif", cursor: "pointer", borderBottom: activeTab === id ? "2px solid #7c5cfc" : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "library" && (
              <button onClick={() => loadLibrary(true)} style={{ fontSize: 12, color: "#7c5cfc", background: "transparent", border: "none", cursor: "pointer" }}>Refresh</button>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {/* ── Result tab ── */}
            {activeTab === "result" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%" }}>

                {/* Shimmer loading */}
                {generating && (
                  <div style={{ width: "100%", maxWidth: count === 1 ? 340 : 680, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${shimmerCols}, 1fr)`, gap: 12, width: "100%" }}>
                      {Array.from({ length: count }).map((_, i) => (
                        <div key={i} style={{ aspectRatio: cssRatio, borderRadius: 12, overflow: "hidden", position: "relative", background: "#2a2a40" }}>
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 35%, rgba(124,92,252,0.1) 50%, transparent 65%)", backgroundSize: "200% 100%", animation: "ig-shimmer 1.6s ease-in-out infinite" }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#55556a" }}>Generating image{count > 1 ? "s" : ""}</span>
                      <span style={{ display: "flex", gap: 3 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c5cfc", display: "block", animation: `gl-bounce 1.3s ease-in-out ${d}s infinite` }} />
                        ))}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#333" }}>10–30 seconds</div>
                  </div>
                )}

                {/* Empty state */}
                {!generating && results.length === 0 && (
                  <div style={{ textAlign: "center" }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.1, marginBottom: 14 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                      <path d="M3 15l5-5 4 4 3-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <div style={{ fontSize: 14, color: "#35354a" }}>Your images will appear here</div>
                    <div style={{ fontSize: 12, color: "#2a2a3a", marginTop: 4 }}>Write a prompt and hit Generate</div>
                  </div>
                )}

                {/* Results grid */}
                {!generating && results.length > 0 && (
                  <div style={{ width: "100%" }}>
                    <div style={{ fontSize: 11, color: "#44444f", marginBottom: 14, fontFamily: "'JetBrains Mono',monospace" }}>
                      {results.length} image{results.length !== 1 ? "s" : ""} generated
                    </div>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: `repeat(${Math.min(results.length, 3)}, 1fr)` }}>
                      {results.map((img, i) => (
                        <ImageCard key={img.id || i} img={{ ...img, prompt }} />
                      ))}
                    </div>
                    <div style={{ marginTop: 10, textAlign: "right" }}>
                      <RefundClaimTrigger service="ai_image" creditsUsed={results.length * 2} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Library tab ── */}
            {activeTab === "library" && (
              <>
                {loadingLib && library.length === 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
                    <span style={{ width: 22, height: 22, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "ig-spin 0.8s linear infinite", display: "inline-block" }} />
                  </div>
                )}
                {!loadingLib && library.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🖼</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>No images yet</div>
                    <div style={{ fontSize: 13, color: "#77777f" }}>Generate your first image to see it here</div>
                    <button onClick={() => setActiveTab("result")} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#f5c518", color: "#0b0b10" }}>
                      Generate →
                    </button>
                  </div>
                )}
                {library.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: "#44444f", marginBottom: 14, fontFamily: "'JetBrains Mono',monospace" }}>
                      Showing {library.length} of {libraryTotal} images
                    </div>
                    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                      {library.map((img, i) => (
                        <ImageCard key={img.id || i} img={img} onDelete={id => removeImage(id)} onSelect={() => { setResults([img]); setActiveTab("result"); }} />
                      ))}
                    </div>
                    {library.length < libraryTotal && (
                      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                        <button onClick={() => loadLibrary(false)} disabled={loadingLib}
                          style={{ padding: "8px 24px", borderRadius: 8, fontSize: 13, color: "#9494a8", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", cursor: "pointer", opacity: loadingLib ? 0.5 : 1 }}>
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

      <style>{`
        @keyframes ig-spin    { to { transform: rotate(360deg); } }
        @keyframes ig-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes gl-bounce  { 0%,70%,100% { transform:translateY(0); opacity:.25; } 35% { transform:translateY(-5px); opacity:1; } }
        .left-panel-scroll::-webkit-scrollbar { width: 6px; }
        .left-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .left-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .left-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
      `}</style>

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
