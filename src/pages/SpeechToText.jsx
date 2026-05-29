import { useState, useEffect, useRef } from "react";
import { serverFetch, SERVER } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { supabase } from "../lib/supabase";
import AppLayout from "../ui/AppLayout";

const PAGE_SIZE = 12;

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSRTTime(seconds) {
  const h  = Math.floor(seconds / 3600);
  const m  = Math.floor((seconds % 3600) / 60);
  const s  = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
}

function buildSRT(segments) {
  return segments.map((seg, i) =>
    `${i + 1}\n${formatSRTTime(seg.start)} --> ${formatSRTTime(seg.end)}\n${seg.text}\n`
  ).join("\n");
}

function downloadText(content, filename, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

function TranscriptResult({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  const baseName = result.file_name?.replace(/\.[^.]+$/, "") || "transcript";

  const copy = () => {
    navigator.clipboard.writeText(result.transcript).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontFamily: "monospace", padding: "3px 8px", borderRadius: 5, background: "rgba(245,197,24,0.12)", color: "#f5c518" }}>
          ⚡ {result.credits_used} credits used
        </span>
        <span style={{ fontSize: 12, color: "#55556a" }}>
          {formatTime(result.duration_seconds || 0)} · {result.language?.toUpperCase()}
        </span>
        <button onClick={onClose} style={{ marginLeft: "auto", fontSize: 12, color: "#55556a", background: "transparent", border: "none", cursor: "pointer" }}>
          ✕ Clear
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={copy}
          style={{ padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`, background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)", color: copied ? "#22c55e" : "#9494a8", cursor: "pointer", transition: "all 0.15s" }}>
          {copied ? "Copied!" : "Copy Transcript"}
        </button>
        <button onClick={() => downloadText(result.transcript, `${baseName}.txt`)}
          style={{ padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#9494a8", cursor: "pointer" }}>
          Download TXT
        </button>
        {result.segments?.length > 0 && (
          <button onClick={() => downloadText(buildSRT(result.segments), `${baseName}.srt`)}
            style={{ padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#9494a8", cursor: "pointer" }}>
            Download SRT
          </button>
        )}
      </div>

      {result.segments?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", maxHeight: 300, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "#1e1e30" }}>
          {result.segments.map((seg, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 16px", borderBottom: i < result.segments.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#f5c518", flexShrink: 0, marginTop: 2 }}>[{formatTime(seg.start)}]</span>
              <span style={{ fontSize: 13, color: "#c8c8d8", lineHeight: 1.6 }}>{seg.text}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#55556a", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace" }}>
          Full Transcript
        </div>
        <textarea
          readOnly
          value={result.transcript}
          style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "#1e1e30", fontSize: 13, color: "#c8c8d8", lineHeight: 1.6, padding: 16, resize: "none", outline: "none", minHeight: 180, fontFamily: "inherit", boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}

function HistoryItem({ item, onDelete }) {
  const [expanded,   setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [copied,     setCopied]     = useState(false);
  const baseName = item.file_name?.replace(/\.[^.]+$/, "") || "transcript";

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.transcript).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 2500); return; }
    setDeleting(true);
    try {
      await serverFetch(`/api/transcription/${item.id}`, { method: "DELETE" });
      onDelete(item.id);
    } catch {} finally { setDeleting(false); }
  };

  return (
    <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", background: "#1e1e30", overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file_name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: "#55556a" }}>{timeLabel(item.created_at)}</span>
            <span style={{ fontSize: 11, color: "#55556a" }}>{formatTime(item.duration_seconds || 0)}</span>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#f5c518" }}>⚡ {item.credits_used}</span>
            {item.language && <span style={{ fontSize: 11, color: "#55556a" }}>{item.language.toUpperCase()}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button onClick={copy}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: `1px solid ${copied ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`, background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", color: copied ? "#22c55e" : "#9494a8", cursor: "pointer" }}>
            {copied ? "Copied" : "Copy"}
          </button>
          {item.segments?.length > 0 && (
            <button onClick={e => { e.stopPropagation(); downloadText(buildSRT(item.segments), `${baseName}.srt`); }}
              style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#9494a8", cursor: "pointer" }}>
              SRT
            </button>
          )}
          <button onClick={handleDelete} disabled={deleting}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: confirming ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)", background: confirming ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)", color: confirming ? "#f87171" : "#55556a", cursor: "pointer" }}>
            {deleting ? "…" : confirming ? "Sure?" : "✕"}
          </button>
          <span style={{ fontSize: 12, color: "#55556a" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {item.segments?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", maxHeight: 220, overflowY: "auto", marginTop: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
              {item.segments.map((seg, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "8px 12px", borderBottom: i < item.segments.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#f5c518", flexShrink: 0, marginTop: 1 }}>[{formatTime(seg.start)}]</span>
                  <span style={{ fontSize: 12, color: "#c8c8d8", lineHeight: 1.6 }}>{seg.text}</span>
                </div>
              ))}
            </div>
          )}
          <textarea
            readOnly
            value={item.transcript}
            style={{ width: "100%", marginTop: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", background: "#151523", fontSize: 12, color: "#9494a8", lineHeight: 1.6, padding: 12, resize: "none", outline: "none", minHeight: 100, fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>
      )}
    </div>
  );
}

export default function Transcription() {
  const { fetchCredits } = useCreditsStore();

  const [activeTab, setActiveTab] = useState("result");
  const [histPage,  setHistPage]  = useState(0);

  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);

  const [history,     setHistory]     = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const fileInputRef = useRef(null);
  const ACCEPTED = ".mp4,.mov,.avi,.webm,.mkv,.mp3,.wav,.m4a,.ogg,.flac";

  useEffect(() => {
    fetchCredits();
    loadHistory();
  }, []);

  function loadHistory() {
    setLoadingHist(true);
    serverFetch("/api/transcription/history")
      .then(r => r.json())
      .then(d => setHistory(d.transcriptions || []))
      .catch(() => {})
      .finally(() => setLoadingHist(false));
  }

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const handleUpload = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveTab("result");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = (await supabase.auth.getSession())?.data?.session?.access_token;
      const res = await fetch(`${SERVER}/api/transcription/transcribe`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setResult({ ...data, file_name: file.name });
      fetchCredits();
      loadHistory();
      setFile(null);
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const totalPages   = Math.ceil(history.length / PAGE_SIZE);
  const pagedHistory = history.slice(histPage * PAGE_SIZE, (histPage + 1) * PAGE_SIZE);

  return (
    <AppLayout>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "#1E1E34" }}>
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>Speech to Text</h1>
          </div>

          {/* Scrollable form */}
          <div className="left-panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              style={{
                borderRadius: 12,
                border: `2px dashed ${dragging ? "#f5c518" : file ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.12)"}`,
                background: dragging ? "rgba(245,197,24,0.04)" : "rgba(255,255,255,0.02)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "28px 16px", cursor: file ? "default" : "pointer", textAlign: "center",
                transition: "border-color 0.15s",
              }}
            >
              <input ref={fileInputRef} type="file" accept={ACCEPTED} style={{ display: "none" }} onChange={e => pickFile(e.target.files[0])} />
              {!file ? (
                <>
                  <div style={{ fontSize: 36 }}>🎙</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0" }}>Drop a video or audio file</div>
                  <div style={{ fontSize: 11, color: "#55556a" }}>MP4, MOV, AVI, WebM · MP3, WAV, M4A, FLAC</div>
                  <div style={{ fontSize: 11, color: "#44445a" }}>up to 500 MB · click to browse</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 28 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "#55556a" }}>{formatFileSize(file.size)}</div>
                  <div style={{ fontSize: 11, color: "#55556a" }}>Credit cost calculated on upload</div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }}
                    style={{ fontSize: 11, color: "#55556a", background: "transparent", border: "none", cursor: "pointer", marginTop: 2, textDecoration: "underline" }}>
                    Remove file
                  </button>
                </>
              )}
            </div>

            {error && (
              <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)" }}>
                ✕ {error}
              </div>
            )}

            <div style={{ fontSize: 11, color: "#44445a", lineHeight: 1.5 }}>
              Pricing: <span style={{ color: "#8888aa" }}>2 credits / minute</span> — charged based on actual duration
            </div>
          </div>

          {/* Transcribe button — pinned */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <button onClick={handleUpload} disabled={!file || loading}
              style={{ width: "100%", padding: "11px 0", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: file && !loading ? "pointer" : "default", opacity: file && !loading ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? (
                <>
                  <span style={{ width: 15, height: 15, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "stt-spin 0.8s linear infinite", display: "inline-block" }} />
                  Transcribing…
                </>
              ) : "✦ Transcribe · 2 cr/min"}
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
                ["history", `My Transcriptions${history.length ? ` (${history.length})` : ""}`],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ padding: "16px 20px", border: "none", background: "transparent", color: activeTab === id ? "#a78bfa" : "#55556a", fontSize: 14, fontWeight: activeTab === id ? 700 : 500, fontFamily: "'Outfit',sans-serif", cursor: "pointer", borderBottom: activeTab === id ? "2px solid #7c5cfc" : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "history" && (
              <button onClick={loadHistory} style={{ fontSize: 12, color: "#7c5cfc", background: "transparent", border: "none", cursor: "pointer" }}>Refresh</button>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {/* ── Result tab ── */}
            {activeTab === "result" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%" }}>

                {/* Transcribing state */}
                {loading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 40 }}>
                      {[0, 0.15, 0.3, 0.45, 0.6].map((d, i) => (
                        <div key={i} style={{ width: 5, borderRadius: 3, background: "#7c5cfc", animation: `vo-wave 1.2s ease-in-out ${d}s infinite` }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#55556a" }}>Transcribing audio</span>
                      <span style={{ display: "flex", gap: 3 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c5cfc", display: "block", animation: `gl-bounce 1.3s ease-in-out ${d}s infinite` }} />
                        ))}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#333" }}>May take up to a minute</div>
                  </div>
                )}

                {/* Empty state */}
                {!loading && !result && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>🎙</div>
                    <div style={{ fontSize: 14, color: "#35354a" }}>Your transcript will appear here</div>
                    <div style={{ fontSize: 12, color: "#2a2a3a", marginTop: 4 }}>Upload a file and click Transcribe</div>
                  </div>
                )}

                {/* Result */}
                {!loading && result && (
                  <div style={{ width: "100%" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#55556a", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}>
                      Result — {result.file_name}
                    </div>
                    <TranscriptResult result={result} onClose={() => setResult(null)} />
                  </div>
                )}
              </div>
            )}

            {/* ── History tab ── */}
            {activeTab === "history" && (
              <>
                {loadingHist && history.length === 0 && (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                    <span style={{ width: 22, height: 22, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "stt-spin 0.8s linear infinite", display: "inline-block" }} />
                  </div>
                )}
                {!loadingHist && history.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🎙</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>No transcriptions yet</div>
                    <div style={{ fontSize: 13, color: "#77777f" }}>Upload audio or video to get an accurate transcript</div>
                    <button onClick={() => setActiveTab("result")} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#f5c518", color: "#0b0b10" }}>
                      Transcribe First File →
                    </button>
                  </div>
                )}
                {history.length > 0 && (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pagedHistory.map(item => (
                        <HistoryItem key={item.id} item={item} onDelete={id => setHistory(prev => prev.filter(i => i.id !== id))} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
                        <button onClick={() => setHistPage(p => Math.max(0, p - 1))} disabled={histPage === 0}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#9494a8", cursor: "pointer", opacity: histPage === 0 ? 0.4 : 1 }}>
                          ← Prev
                        </button>
                        <span style={{ fontSize: 12, color: "#55556a", padding: "0 8px" }}>{histPage + 1} / {totalPages}</span>
                        <button onClick={() => setHistPage(p => Math.min(totalPages - 1, p + 1))} disabled={histPage === totalPages - 1}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#9494a8", cursor: "pointer", opacity: histPage === totalPages - 1 ? 0.4 : 1 }}>
                          Next →
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
        @keyframes stt-spin  { to { transform: rotate(360deg); } }
        @keyframes vo-wave   { 0%,100% { height: 8px; } 50% { height: 32px; } }
        @keyframes gl-bounce { 0%,70%,100% { transform:translateY(0); opacity:.25; } 35% { transform:translateY(-5px); opacity:1; } }
        .left-panel-scroll::-webkit-scrollbar { width: 6px; }
        .left-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .left-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .left-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
      `}</style>
    </AppLayout>
  );
}
