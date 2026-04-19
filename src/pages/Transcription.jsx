/**
 * Transcription.jsx
 * src/pages/Transcription.jsx
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { serverFetch, SERVER } from "../services/serverApi";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";
import { supabase } from "../lib/supabase";

/* ── Sidebar primitives ── */
const Icons = {
  folder:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  gallery:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/></svg>,
  box:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  credits:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  mic:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>,
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

/* ── Helpers ── */
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
      {/* Meta bar */}
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

      {/* Action buttons */}
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

      {/* Segments view */}
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

      {/* Full transcript */}
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
      {/* Header row */}
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

      {/* Expanded content */}
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
  const navigate  = useNavigate();
  const location  = useLocation();
  const { balance, fetchCredits } = useCreditsStore();

  const [file,       setFile]       = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [result,     setResult]     = useState(null);
  const [history,    setHistory]    = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);

  const fileInputRef = useRef(null);
  const ACCEPTED = ".mp4,.mov,.avi,.webm,.mkv,.mp3,.wav,.m4a,.ogg,.flac";

  useEffect(() => { fetchCredits(); }, []);

  useEffect(() => {
    serverFetch("/api/transcription/history")
      .then(r => r.json())
      .then(d => setHistory(d.transcriptions || []))
      .catch(() => {})
      .finally(() => setLoadingHist(false));
  }, []);

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

      // Prepend to history
      if (data.id) {
        setHistory(prev => [{
          id:               data.id,
          file_name:        file.name,
          duration_seconds: data.duration_seconds,
          credits_used:     data.credits_used,
          transcript:       data.transcript,
          segments:         data.segments,
          language:         data.language,
          created_at:       new Date().toISOString(),
        }, ...prev]);
      }

      setFile(null);
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
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
            <NavItem icon={Icons.folder}  label="Videos"       active={location.pathname === "/dashboard"}        onClick={() => navigate("/dashboard")} />
            <NavItem icon={Icons.gallery} label="Images"       active={location.pathname === "/image-generation"} onClick={() => navigate("/image-generation")} />
            <NavItem icon={Icons.mic}     label="Transcribe"   active={location.pathname === "/transcription"}    onClick={() => {}} />
            <NavItem icon={Icons.box}     label="Assets"       active={location.pathname === "/assets"}           onClick={() => navigate("/assets")} />
            <NavItem icon={Icons.credits} label="Credits"      active={location.pathname === "/credits"}          onClick={() => navigate("/credits")} />
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
        <div className="flex items-center px-6 py-4 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
          <h1 className="text-[20px] font-bold" style={{ fontFamily: "'Syne',sans-serif", color: "#f5c518" }}>Transcribe</h1>
          <span className="ml-3 text-[12px] text-[#55556a]">2 credits / minute · min 2 credits</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8 max-w-[860px]">

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
                ) : "Transcribe"}
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

          {/* History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
                History
              </div>
              {history.length > 0 && (
                <span className="text-[11px] text-[#33333f]">{history.length} transcription{history.length !== 1 ? "s" : ""}</span>
              )}
            </div>

            {loadingHist && (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loadingHist && history.length === 0 && (
              <div className="text-[13px] text-[#33333f] py-8 text-center">No transcriptions yet</div>
            )}

            {history.length > 0 && (
              <div className="flex flex-col gap-2">
                {history.map(item => (
                  <HistoryItem
                    key={item.id}
                    item={item}
                    onDelete={id => setHistory(prev => prev.filter(i => i.id !== id))}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
