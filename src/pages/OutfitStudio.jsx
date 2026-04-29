import { useState, useRef, useEffect } from "react";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import AppLayout from "../ui/AppLayout";

const C = {
  inp:  { padding: "9px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:  { fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, display: "block" },
  btnG: { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%" },
  card: { background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 },
};

const SKIN_COLORS = {
  light:        "#f5e6d3",
  medium_light: "#e8c9a0",
  medium:       "#c8956c",
  medium_dark:  "#8b5e3c",
  dark:         "#4a2c17",
};

function UploadZone({ preview, onFile, onClear, label, accept = "image/*", inputRef, compact = false }) {
  const [drag, setDrag] = useState(false);
  const localRef = useRef();
  const ref = inputRef || localRef;

  function handleDrop(e) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <>
      <div
        onClick={() => !preview && ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        style={{
          background: "#111118",
          border: preview ? "1px solid rgba(255,255,255,0.08)" : `2px dashed ${drag ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 12,
          overflow: "hidden",
          cursor: preview ? "default" : "pointer",
          transition: "border-color 0.15s",
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} style={{ width: "100%", maxHeight: compact ? 180 : 260, objectFit: "contain", display: "block", background: "#0b0b10" }} />
            <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => ref.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>↑ Replace</button>
              <button onClick={onClear} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
            </div>
          </>
        ) : (
          <div style={{ padding: compact ? "24px 16px" : "36px 24px", textAlign: "center" }}>
            <div style={{ fontSize: compact ? 24 : 32, marginBottom: 8 }}>👕</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9494a8", marginBottom: 3 }}>Click or drop {label}</div>
            <div style={{ fontSize: 11, color: "#444" }}>JPG, PNG, WEBP</div>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} style={{ display: "none" }} />
    </>
  );
}

export default function OutfitStudio() {
  const fetchCredits = useCreditsStore(s => s.fetchCredits);

  const [garmentFile,    setGarmentFile]    = useState(null);
  const [garmentUrl,     setGarmentUrl]     = useState("");
  const [garmentPreview, setGarmentPreview] = useState("");
  const [modelFile,      setModelFile]      = useState(null);
  const [modelUrl,       setModelUrl]       = useState("");
  const [modelPreview,   setModelPreview]   = useState("");
  const [models,         setModels]         = useState([]);
  const [selectedModel,  setSelectedModel]  = useState(null);
  const [genderFilter,   setGenderFilter]   = useState("all");
  const [modelTab,       setModelTab]       = useState("models"); // "models" | "mine"
  const [hasMannequin,   setHasMannequin]   = useState(false);
  const [generating,     setGenerating]     = useState(false);
  const [resultUrl,      setResultUrl]      = useState(null);
  const [history,        setHistory]        = useState([]);
  const [genErr,         setGenErr]         = useState("");
  const [genTime,        setGenTime]        = useState(null);
  const [uploading,      setUploading]      = useState(false);

  const garmentInputRef = useRef();
  const modelInputRef   = useRef();

  useEffect(() => {
    fetchModels();
    fetchHistory();
  }, []);

  async function fetchModels() {
    try {
      const res  = await serverFetch("/api/outfit/models");
      const data = await res.json();
      if (res.ok) setModels(data.models || []);
    } catch (_) {}
  }

  async function fetchHistory() {
    try {
      const res  = await serverFetch("/api/outfit/list");
      const data = await res.json();
      if (res.ok) setHistory(data.tryons || []);
    } catch (_) {}
  }

  async function uploadImage(file, fieldName = "image") {
    const form = new FormData();
    form.append(fieldName, file);
    const res  = await serverFetch("/api/outfit/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  async function handleGenerate() {
    setGenErr(""); setResultUrl(null);
    setGenerating(true);
    const t0 = Date.now();
    try {
      setUploading(true);
      let finalGarmentUrl = garmentUrl;
      if (garmentFile && !garmentUrl) {
        finalGarmentUrl = await uploadImage(garmentFile);
        setGarmentUrl(finalGarmentUrl);
      }

      let finalModelUrl = selectedModel?.url || modelUrl;
      if (modelFile && !modelUrl) {
        finalModelUrl = await uploadImage(modelFile);
        setModelUrl(finalModelUrl);
      }
      setUploading(false);

      if (!finalGarmentUrl) throw new Error("Garment image required");
      if (!finalModelUrl)   throw new Error("Model photo required");

      const res  = await serverFetch("/api/outfit/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ garmentUrl: finalGarmentUrl, modelUrl: finalModelUrl, hasMannequin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResultUrl(data.resultUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      fetchHistory();
      fetchCredits();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
    setUploading(false);
  }

  async function deleteTryon(tryon) {
    try {
      await serverFetch("/api/outfit/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: tryon.id, storageKey: tryon.storage_key }),
      });
      if (resultUrl === tryon.result_url) setResultUrl(null);
      setHistory(h => h.filter(t => t.id !== tryon.id));
    } catch (_) {}
  }

  const canGenerate = (garmentFile || garmentUrl) && (modelFile || modelUrl || selectedModel) && !generating && !uploading;

  const filteredModels = genderFilter === "all"
    ? models
    : models.filter(m => m.gender === genderFilter);

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e8e8f0", margin: 0, fontFamily: "'Syne', sans-serif" }}>
            ✦ Outfit Studio
          </h1>
          <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>
            Upload a garment and a model photo — AI dresses the model in your outfit
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, alignItems: "start" }}>

          {/* ── LEFT: Garment ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={C.card}>
              <label style={C.lbl}>Garment / Outfit <span style={{ color: "#f87171", fontSize: 10, textTransform: "none", fontWeight: 700 }}>required</span></label>
              <UploadZone
                preview={garmentPreview}
                label="garment image"
                inputRef={garmentInputRef}
                onFile={f => { setGarmentFile(f); setGarmentUrl(""); setGarmentPreview(URL.createObjectURL(f)); }}
                onClear={() => { setGarmentFile(null); setGarmentUrl(""); setGarmentPreview(""); }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={hasMannequin}
                  onChange={e => setHasMannequin(e.target.checked)}
                  style={{ accentColor: "#7c5cfc", width: 15, height: 15 }}
                />
                <span style={{ fontSize: 12, color: "#9494a8" }}>This garment is on a mannequin or dummy</span>
              </label>
            </div>
          </div>

          {/* ── CENTER: Model + Generate ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={C.card}>
              <label style={C.lbl}>Model Photo <span style={{ color: "#f87171", fontSize: 10, textTransform: "none", fontWeight: 700 }}>required</span></label>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, marginBottom: 14, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3 }}>
                {[["models", "Use Our Models"], ["mine", "Use My Photo"]].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setModelTab(key);
                      if (key === "models") { setModelFile(null); setModelUrl(""); setModelPreview(""); }
                      if (key === "mine")   { setSelectedModel(null); }
                    }}
                    style={{
                      flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 700,
                      border: "none", cursor: "pointer",
                      background: modelTab === key ? "#7c5cfc" : "transparent",
                      color: modelTab === key ? "#fff" : "#666",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {modelTab === "mine" && (
                <UploadZone
                  compact
                  preview={modelPreview}
                  label="your photo"
                  inputRef={modelInputRef}
                  onFile={f => { setModelFile(f); setModelUrl(""); setModelPreview(URL.createObjectURL(f)); }}
                  onClear={() => { setModelFile(null); setModelUrl(""); setModelPreview(""); }}
                />
              )}

              {modelTab === "models" && (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {["all", "female", "male"].map(g => (
                      <button
                        key={g}
                        onClick={() => setGenderFilter(g)}
                        style={{
                          padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          border: "1px solid", cursor: "pointer",
                          background: genderFilter === g ? "rgba(124,92,252,0.18)" : "transparent",
                          borderColor: genderFilter === g ? "#7c5cfc" : "rgba(255,255,255,0.08)",
                          color: genderFilter === g ? "#c4b5fd" : "#555",
                        }}
                      >
                        {g === "all" ? "All" : g === "female" ? "Female" : "Male"}
                      </button>
                    ))}
                  </div>

                  {filteredModels.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#444", textAlign: "center", padding: "20px 0" }}>
                      {models.length === 0 ? "Loading models…" : "No models for this filter"}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {filteredModels.map(m => {
                        const sel = selectedModel?.id === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setSelectedModel(sel ? null : m)}
                            style={{
                              padding: 0, border: `2px solid ${sel ? "#7c5cfc" : "rgba(255,255,255,0.06)"}`,
                              borderRadius: 10, overflow: "hidden", cursor: "pointer",
                              background: "transparent", transition: "border-color 0.15s",
                              display: "flex", flexDirection: "column",
                            }}
                          >
                            <img
                              src={m.url}
                              alt={m.skin_tone}
                              style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }}
                            />
                            <div style={{ padding: "4px 6px", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                              <span style={{
                                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                                background: SKIN_COLORS[m.skin_tone] || "#888",
                                border: "1px solid rgba(255,255,255,0.1)",
                                display: "inline-block",
                              }} />
                              <span style={{ fontSize: 9, color: "#555", fontWeight: 600, textTransform: "capitalize" }}>
                                {m.skin_tone?.replace(/_/g, " ")}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Generate button */}
            <div>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.4 }}
              >
                {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Try On"}
              </button>
              <div style={{ textAlign: "center", fontSize: 11, color: "#444", marginTop: 6 }}>~8 credits</div>
              {genErr && (
                <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)", marginTop: 10 }}>
                  ✕ {genErr}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Result ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{
              width: "100%", aspectRatio: "9/16",
              background: "#111118",
              border: resultUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.07)",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {generating && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 36, height: 36, border: "3px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
                  <div style={{ fontSize: 13, color: "#9494a8" }}>Generating try-on…</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>20–40 seconds</div>
                </div>
              )}
              {!generating && !resultUrl && (
                <div style={{ textAlign: "center", color: "#2a2a3a" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>👗</div>
                  <div style={{ fontSize: 13 }}>Your result will appear here</div>
                </div>
              )}
              {resultUrl && (
                <img src={resultUrl} alt="Try-on result" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              )}
            </div>

            {resultUrl && (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={resultUrl} download={`outfit-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                    <button style={{ ...C.btnY, fontSize: 13 }}>↓ Download</button>
                  </a>
                  <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>
                    ↺ Regenerate
                  </button>
                </div>
                {genTime && <div style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 6 }}>Generated in {genTime}s</div>}
              </div>
            )}
          </div>

        </div>

        {/* ── Gallery ── */}
        {history.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#9494a8", marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>
              Previous Try-Ons
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
              {history.map(tryon => (
                <div key={tryon.id} style={{ position: "relative", aspectRatio: "9/16" }}>
                  <div
                    onClick={() => setResultUrl(tryon.result_url)}
                    style={{
                      width: "100%", height: "100%", borderRadius: 10, overflow: "hidden", cursor: "pointer",
                      border: tryon.result_url === resultUrl ? "2px solid #7c5cfc" : "2px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <img src={tryon.result_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  <button
                    onClick={() => deleteTryon(tryon)}
                    style={{
                      position: "absolute", top: 6, right: 6,
                      background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 4,
                      color: "#f87171", fontSize: 11, cursor: "pointer", padding: "2px 6px", lineHeight: 1.4,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
