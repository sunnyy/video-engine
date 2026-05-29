import { useState, useEffect, useRef } from "react";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import AppLayout from "../ui/AppLayout";

async function downloadAudio(url, filename) {
  const res  = await fetch(url);
  const blob = await res.blob();
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  return d.toLocaleDateString();
}

const GENDER_FILTERS = ["All", "Female", "Male", "Neutral"];
const PAGE_SIZE = 12;

const GENDER_COLORS = {
  female:  { bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)", color: "#f472b6" },
  male:    { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  color: "#60a5fa" },
  neutral: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", color: "#a78bfa" },
};

function VoiceCard({ voice, selected, onSelect, onPlay, playing }) {
  const [hov, setHov] = useState(false);
  const gc = GENDER_COLORS[voice.gender] || GENDER_COLORS.neutral;
  return (
    <div
      onClick={() => onSelect(voice.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   selected ? "rgba(124,92,252,0.1)" : hov ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)",
        border:       `1px solid ${selected ? "#7c5cfc" : hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 10,
        padding:      "10px 12px",
        cursor:       "pointer",
        transition:   "all 0.15s",
        position:     "relative",
      }}
    >
      {selected && (
        <div style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#7c5cfc" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>{voice.label}</span>
        <button
          onClick={e => { e.stopPropagation(); onPlay(voice); }}
          disabled={!voice.sampleUrl}
          style={{
            width: 26, height: 26, borderRadius: "50%",
            background: playing ? "rgba(124,92,252,0.3)" : "rgba(124,92,252,0.12)",
            border:     `1px solid ${playing ? "#7c5cfc" : "rgba(124,92,252,0.3)"}`,
            color:      "#a78bfa", fontSize: 10, cursor: voice.sampleUrl ? "pointer" : "default",
            display:    "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, opacity: voice.sampleUrl ? 1 : 0.3,
          }}
        >
          {playing ? "■" : "▶"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#777", marginBottom: 6 }}>{voice.desc}</div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: gc.bg, border: `1px solid ${gc.border}`, color: gc.color }}>
        {voice.gender}
      </span>
    </div>
  );
}

function HistoryItem({ item, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(item.audio_url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 2500); return; }
    setDeleting(true);
    try {
      await serverFetch(`/api/tts/history/${item.id}`, { method: "DELETE" });
      onDelete(item.id);
    } catch {} finally { setDeleting(false); }
  };

  return (
    <div style={{ background: "#1e1e30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
      <button onClick={togglePlay}
        style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: playing ? "rgba(124,92,252,0.25)" : "rgba(124,92,252,0.1)", border: `1px solid ${playing ? "#7c5cfc" : "rgba(124,92,252,0.25)"}`, color: "#a78bfa", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {playing ? "■" : "▶"}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9494a8", marginBottom: 2 }}>
          {item.voice_id} · <span style={{ color: "#55556a", fontWeight: 400 }}>{timeLabel(item.created_at)}</span>
          {item.char_count ? <span style={{ color: "#55556a", fontWeight: 400 }}> · {item.char_count} chars</span> : null}
        </div>
        <div style={{ fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.script || "—"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={() => downloadAudio(item.audio_url, `voiceover-${item.id || Date.now()}.mp3`)}
          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9494a8" }}>
          ↓
        </button>
        <button onClick={handleDelete} disabled={deleting}
          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", background: confirming ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)", border: confirming ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)", color: confirming ? "#f87171" : "#55556a" }}>
          {deleting ? "…" : confirming ? "Sure?" : "✕"}
        </button>
      </div>
    </div>
  );
}

export default function TTSStudio() {
  const { fetchCredits } = useCreditsStore();

  const [activeTab,   setActiveTab]   = useState("result");
  const [histPage,    setHistPage]    = useState(0);
  const [creditModal, setCreditModal] = useState(null);

  const [voices,        setVoices]        = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesErr,     setVoicesErr]     = useState("");
  const [genderFilter,  setGenderFilter]  = useState("All");
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [playingVoice,  setPlayingVoice]  = useState(null);
  const currentAudio = useRef(null);

  const [script, setScript] = useState("");
  const [speed,  setSpeed]  = useState(1.0);

  const [generating, setGenerating] = useState(false);
  const [genErr,     setGenErr]     = useState("");
  const [result,     setResult]     = useState(null);

  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    setVoicesLoading(true);
    serverFetch("/api/tts/voices")
      .then(r => r.json())
      .then(d => setVoices(d.voices || []))
      .catch(e => setVoicesErr(e.message || "Failed to load voices"))
      .finally(() => setVoicesLoading(false));
    loadHistory();
  }, []);

  function loadHistory() {
    setHistLoading(true);
    serverFetch("/api/tts/history")
      .then(r => r.json())
      .then(d => setHistory(d.history || []))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }

  function playVoice(voice) {
    if (!voice.sampleUrl) return;
    if (currentAudio.current) { currentAudio.current.pause(); currentAudio.current = null; }
    if (playingVoice === voice.id) { setPlayingVoice(null); return; }
    const audio = new Audio(voice.sampleUrl);
    audio.onended = () => setPlayingVoice(null);
    audio.play().catch(() => {});
    currentAudio.current = audio;
    setPlayingVoice(voice.id);
  }

  async function handleGenerateClick() {
    if (!script.trim() || generating) return;
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.voiceover;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  }

  async function handleGenerate() {
    setCreditModal(null);
    if (!script.trim() || generating) return;
    setGenerating(true);
    setGenErr("");
    setResult(null);
    setActiveTab("result");
    try {
      const res  = await serverFetch("/api/generate-tts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ script, voice: selectedVoice, speed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult({ url: data.url });
      fetchCredits();
      loadHistory();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
  }

  const filteredVoices = genderFilter === "All"
    ? voices
    : voices.filter(v => v.gender === genderFilter.toLowerCase());

  const totalPages   = Math.ceil(history.length / PAGE_SIZE);
  const pagedHistory = history.slice(histPage * PAGE_SIZE, (histPage + 1) * PAGE_SIZE);
  const canGenerate  = script.trim() && !generating;

  return (
    <AppLayout>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "#1E1E34" }}>
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>Voiceover</h1>
          </div>

          {/* Scrollable form */}
          <div className="left-panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Voice picker */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8888aa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Choose a Voice</div>

              {/* Gender filter */}
              <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
                {GENDER_FILTERS.map(f => (
                  <button key={f} onClick={() => setGenderFilter(f)}
                    style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: genderFilter === f ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${genderFilter === f ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.08)"}`, color: genderFilter === f ? "#a78bfa" : "#8888aa", transition: "all 0.15s" }}>
                    {f}
                  </button>
                ))}
              </div>

              {voicesLoading && (
                <div style={{ padding: "24px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔊</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#9494a8", marginBottom: 3 }}>Preparing voice samples…</div>
                  <div style={{ fontSize: 11, color: "#55556a" }}>First load takes ~15 seconds</div>
                </div>
              )}
              {voicesErr && (
                <div style={{ padding: "10px 12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: "#f87171", fontSize: 12 }}>
                  ✕ {voicesErr}
                </div>
              )}
              {!voicesLoading && !voicesErr && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {filteredVoices.map(v => (
                    <VoiceCard key={v.id} voice={v} selected={selectedVoice === v.id} playing={playingVoice === v.id} onSelect={setSelectedVoice} onPlay={playVoice} />
                  ))}
                  {filteredVoices.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px 0", color: "#555", fontSize: 13 }}>No voices in this category</div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

            {/* Script */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8888aa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Script</div>
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder="Enter your script here…"
                rows={6}
                style={{ width: "100%", background: "#252540", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px", color: "#e8e8f0", fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 11, color: "#55556a" }}>{script.length} chars</span>
                <span style={{ fontSize: 11, color: "#55556a", fontStyle: "italic" }}>Any language supported</span>
              </div>
            </div>

            {/* Speed */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8888aa", textTransform: "uppercase", letterSpacing: "0.07em" }}>Speed</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace" }}>{speed}×</span>
              </div>
              <input type="range" min={0.75} max={1.5} step={0.25} value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ width: "100%", accentColor: "#7c5cfc" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontSize: 10, color: "#44445a" }}>0.75×</span>
                <span style={{ fontSize: 10, color: "#44445a" }}>1.5×</span>
              </div>
            </div>

            {genErr && (
              <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)" }}>
                ✕ {genErr}
              </div>
            )}
          </div>

          {/* Generate button — pinned */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <button onClick={handleGenerateClick} disabled={!canGenerate}
              style={{ width: "100%", padding: "11px 0", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: canGenerate ? "pointer" : "default", opacity: canGenerate ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {generating ? (
                <>
                  <span style={{ width: 15, height: 15, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%", animation: "vo-spin 0.8s linear infinite", display: "inline-block" }} />
                  Generating…
                </>
              ) : "✦ Generate Voiceover · 5 credits"}
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
                ["history", `My Voiceovers${history.length ? ` (${history.length})` : ""}`],
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

                {/* Generating state */}
                {generating && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 40 }}>
                      {[0, 0.15, 0.3, 0.45, 0.6].map((d, i) => (
                        <div key={i} style={{ width: 5, borderRadius: 3, background: "#7c5cfc", animation: `vo-wave 1.2s ease-in-out ${d}s infinite` }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#55556a" }}>Generating voiceover</span>
                      <span style={{ display: "flex", gap: 3 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c5cfc", display: "block", animation: `gl-bounce 1.3s ease-in-out ${d}s infinite` }} />
                        ))}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#333" }}>5–15 seconds</div>
                  </div>
                )}

                {/* Empty state */}
                {!generating && !result && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>🔊</div>
                    <div style={{ fontSize: 14, color: "#35354a" }}>Your audio will appear here</div>
                    <div style={{ fontSize: 12, color: "#2a2a3a", marginTop: 4 }}>Select a voice and enter a script to generate</div>
                  </div>
                )}

                {/* Result */}
                {!generating && result && (
                  <div style={{ width: "100%", maxWidth: 520 }}>
                    <div style={{ background: "#1e1e30", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>✓ Generated</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(245,197,24,0.12)", border: "1px solid rgba(245,197,24,0.25)", color: "#f5c518" }}>⚡ 5 credits used</span>
                      </div>
                      <audio controls src={result.url} style={{ width: "100%", height: 36, marginBottom: 14, display: "block" }} />
                      <button onClick={() => downloadAudio(result.url, `voiceover-${Date.now()}.mp3`)}
                        style={{ padding: "7px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#9494a8", cursor: "pointer" }}>
                        ↓ Download MP3
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── History tab ── */}
            {activeTab === "history" && (
              <>
                {histLoading && history.length === 0 && (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                    <span style={{ width: 22, height: 22, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "vo-spin 0.8s linear infinite", display: "inline-block" }} />
                  </div>
                )}
                {!histLoading && history.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🔊</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>No voiceovers yet</div>
                    <div style={{ fontSize: 13, color: "#77777f" }}>Generate natural AI voiceovers in any language</div>
                    <button onClick={() => setActiveTab("result")} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#f5c518", color: "#0b0b10" }}>
                      Generate First Voiceover →
                    </button>
                  </div>
                )}
                {history.length > 0 && (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pagedHistory.map(item => (
                        <HistoryItem key={item.id} item={item} onDelete={id => setHistory(prev => prev.filter(h => h.id !== id))} />
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
        @keyframes vo-spin   { to { transform: rotate(360deg); } }
        @keyframes vo-wave   { 0%,100% { height: 8px; } 50% { height: 32px; } }
        @keyframes gl-bounce { 0%,70%,100% { transform:translateY(0); opacity:.25; } 35% { transform:translateY(-5px); opacity:1; } }
        .left-panel-scroll::-webkit-scrollbar { width: 6px; }
        .left-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .left-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .left-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
      `}</style>

      {creditModal && (
        <CreditConfirmModal
          service="Voiceover / TTS"
          breakdown={creditModal.breakdown}
          total={creditModal.total}
          balance={creditModal.balance}
          onConfirm={handleGenerate}
          onCancel={() => setCreditModal(null)}
          onTopUp={() => { setCreditModal(null); window.location.href = "/credits"; }}
        />
      )}
    </AppLayout>
  );
}
