/**
 * Transcription.jsx
 * src/pages/Transcription.jsx
 */
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

/* ── Result panel ── */
function TranscriptResult({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  const baseName = result.file_name?.replace(/\.[^.]+$/, "") || "transcript";

  const copy = () => {
    navigator.clipboard.writeText(result.transcript).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[12px] font-mono px-2 py-[3px] rounded-[5px]" style={{ background: "rgba(245,197,24,0.12)", color: "#f5c518" }}>
          ⚡ {result.credits_used} credits used
        </span>
        <span className="text-[12px] text-[#55556a]">
          {formatTime(result.duration_seconds || 0)} · {result.language?.toUpperCase()}
        </span>
        <button onClick={onClose} className="ml-auto text-[12px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer">
          ✕ Clear
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={copy}
          className="px-4 py-[7px] rounded-[7px] text-[12px] font-semibold border cursor-pointer transition-all"
          style={{ background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)", borderColor: copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)", color: copied ? "#22c55e" : "#9494a8" }}>
          {copied ? "Copied!" : "Copy Transcript"}
        </button>
        <button onClick={() => downloadText(result.transcript, `${baseName}.txt`)}
          className="px-4 py-[7px] rounded-[7px] text-[12px] font-semibold border cursor-pointer transition-all"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#9494a8" }}>
          Download TXT
        </button>
        {result.segments?.length > 0 && (
          <button onClick={() => downloadText(buildSRT(result.segments), `${baseName}.srt`)}
            className="px-4 py-[7px] rounded-[7px] text-[12px] font-semibold border cursor-pointer transition-all"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#9494a8" }}>
            Download SRT
          </button>
        )}
      </div>

      {result.segments?.length > 0 && (
        <div className="flex flex-col gap-0 max-h-[340px] overflow-y-auto rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#111118]">
          {result.segments.map((seg, i) => (
            <div key={i} className="flex gap-3 px-4 py-[10px] border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <span className="text-[11px] font-mono text-[#f5c518] shrink-0 mt-[2px]">[{formatTime(seg.start)}]</span>
              <span className="text-[13px] text-[#c8c8d8] leading-relaxed">{seg.text}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
          Full Transcript
        </div>
        <textarea
          readOnly
          value={result.transcript}
          className="w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#111118] text-[13px] text-[#c8c8d8] leading-relaxed p-4 resize-none focus:outline-none"
          style={{ minHeight: 180, fontFamily: "inherit" }}
        />
      </div>
    </div>
  );
}

/* ── History item ── */
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
    <div className="rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#111118] overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#e8e8f0] truncate">{item.file_name}</div>
          <div className="flex items-center gap-3 mt-[2px]">
            <span className="text-[11px] text-[#55556a]">{timeLabel(item.created_at)}</span>
            <span className="text-[11px] text-[#55556a]">{formatTime(item.duration_seconds || 0)}</span>
            <span className="text-[11px] font-mono" style={{ color: "#f5c518" }}>⚡ {item.credits_used}</span>
            {item.language && <span className="text-[11px] text-[#55556a]">{item.language.toUpperCase()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={copy}
            className="text-[11px] px-2 py-[4px] rounded-[5px] border cursor-pointer transition-all"
            style={{ background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", borderColor: copied ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)", color: copied ? "#22c55e" : "#9494a8" }}>
            {copied ? "Copied" : "Copy"}
          </button>
          {item.segments?.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); downloadText(buildSRT(item.segments), `${baseName}.srt`); }}
              className="text-[11px] px-2 py-[4px] rounded-[5px] border cursor-pointer"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#9494a8" }}>
              SRT
            </button>
          )}
          <button onClick={handleDelete} disabled={deleting}
            className="text-[11px] px-2 py-[4px] rounded-[5px] border cursor-pointer transition-all"
            style={{ background: confirming ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)", borderColor: confirming ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)", color: confirming ? "#f87171" : "#55556a" }}>
            {deleting ? "…" : confirming ? "Sure?" : "✕"}
          </button>
          <span className="text-[#55556a] text-[12px]">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.05)]">
          {item.segments?.length > 0 && (
            <div className="flex flex-col gap-0 max-h-[240px] overflow-y-auto mt-3 rounded-[8px] border border-[rgba(255,255,255,0.05)]">
              {item.segments.map((seg, i) => (
                <div key={i} className="flex gap-3 px-3 py-[8px] border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <span className="text-[11px] font-mono text-[#f5c518] shrink-0 mt-[1px]">[{formatTime(seg.start)}]</span>
                  <span className="text-[12px] text-[#c8c8d8] leading-relaxed">{seg.text}</span>
                </div>
              ))}
            </div>
          )}
          <textarea
            readOnly
            value={item.transcript}
            className="w-full mt-3 rounded-[8px] border border-[rgba(255,255,255,0.05)] bg-[#0d0d14] text-[12px] text-[#9494a8] leading-relaxed p-3 resize-none focus:outline-none"
            style={{ minHeight: 100, fontFamily: "inherit" }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function Transcription() {
  const { fetchCredits } = useCreditsStore();

  const [activeTab, setActiveTab] = useState("generate");
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

      const resultWithName = { ...data, file_name: file.name };
      setResult(resultWithName);
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
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
        <h1 className="text-[20px] font-bold" style={{ fontFamily: "'Outfit',sans-serif", color: "#f5c518" }}>Speech to Text</h1>
        <div className="flex gap-1 bg-[#111118] rounded-[8px] p-[3px]">
          {[["generate", "Transcribe"], ["history", "My Transcriptions"]].map(([id, label]) => (
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
          <div className="flex flex-col gap-8 max-w-[860px]">

            {/* Upload zone */}
            {!result && (
              <div>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className="rounded-[14px] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 py-14 px-6 cursor-pointer"
                  style={{
                    borderColor: dragging ? "#f5c518" : file ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.1)",
                    background:  dragging ? "rgba(245,197,24,0.04)" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED}
                    className="hidden"
                    onChange={e => pickFile(e.target.files[0])}
                  />
                  {!file ? (
                    <>
                      <div className="text-[40px]">🎙</div>
                      <div className="text-[15px] font-semibold text-[#e8e8f0]">Drop a video or audio file</div>
                      <div className="text-[12px] text-[#55556a] text-center">MP4, MOV, AVI, WebM, MKV · MP3, WAV, M4A, OGG, FLAC · up to 500 MB</div>
                      <div className="text-[11px] text-[#33333f]">or click to browse</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[32px]">📄</div>
                      <div className="text-[14px] font-semibold text-[#e8e8f0]">{file.name}</div>
                      <div className="text-[12px] text-[#55556a]">{formatFileSize(file.size)}</div>
                      <div className="text-[11px] text-[#55556a]">Duration and credit cost will be calculated on upload</div>
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); }}
                        className="text-[11px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer mt-1">
                        Remove file
                      </button>
                    </>
                  )}
                </div>

                {error && (
                  <div className="mt-3 px-4 py-3 rounded-[8px] text-[13px] text-[#f87171]"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="mt-4 w-full py-[11px] rounded-[10px] text-[14px] font-bold border-0 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "#f5c518", color: "#0b0b10" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#0b0b10] border-t-transparent rounded-full animate-spin inline-block" />
                      Transcribing… this may take a minute
                    </span>
                  ) : "Transcribe · 2 credits / minute"}
                </button>
              </div>
            )}

            {/* Result */}
            {result && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
                  Result — {result.file_name}
                </div>
                <TranscriptResult result={result} onClose={() => setResult(null)} />
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="max-w-[860px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: "'Outfit',sans-serif", color: "#e8e8f0" }}>My Transcriptions</h2>
              <button onClick={loadHistory} className="text-[12px] text-[#7c5cfc] bg-transparent border-0 cursor-pointer hover:opacity-80">Refresh</button>
            </div>

            {loadingHist && history.length === 0 && (
              <div className="flex items-center justify-center py-24">
                <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loadingHist && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="text-[48px]">🎙</div>
                <div className="text-[20px] font-bold text-[#e8e8f0]">No transcriptions yet</div>
                <div className="text-[14px] text-[#77777f]">Upload audio or video to get an accurate transcript</div>
                <button onClick={() => setActiveTab("generate")}
                  className="mt-2 px-6 py-[10px] rounded-[10px] text-[14px] font-bold border-0 cursor-pointer"
                  style={{ background: "#f5c518", color: "#0b0b10" }}>
                  Transcribe First File →
                </button>
              </div>
            )}

            {history.length > 0 && (
              <>
                <div className="flex flex-col gap-2">
                  {pagedHistory.map(item => (
                    <HistoryItem key={item.id} item={item} onDelete={id => setHistory(prev => prev.filter(i => i.id !== id))} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button onClick={() => setHistPage(p => Math.max(0, p - 1))} disabled={histPage === 0}
                      className="px-4 py-[7px] rounded-[8px] text-[13px] border cursor-pointer transition-all disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)", color: "#9494a8" }}>
                      ← Prev
                    </button>
                    <span className="text-[12px] px-3" style={{ color: "#55556a" }}>{histPage + 1} / {totalPages}</span>
                    <button onClick={() => setHistPage(p => Math.min(totalPages - 1, p + 1))} disabled={histPage === totalPages - 1}
                      className="px-4 py-[7px] rounded-[8px] text-[13px] border cursor-pointer transition-all disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)", color: "#9494a8" }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
