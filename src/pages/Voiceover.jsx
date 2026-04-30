/**
 * TTSStudio.jsx — Voiceover / TTS
 * /tts-studio
 */
import { useState, useEffect, useRef } from "react";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import AppLayout from "../ui/AppLayout";

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
        background:   selected ? "rgba(124,92,252,0.1)" : hov ? "rgba(255,255,255,0.03)" : "#111118",
        border:       `1px solid ${selected ? "#7c5cfc" : hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 10,
        padding:      "12px 14px",
        cursor:       "pointer",
        transition:   "all 0.15s",
        position:     "relative",
      }}
    >
      {selected && (
        <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: "#7c5cfc" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>{voice.label}</span>
        <button
          onClick={e => { e.stopPropagation(); onPlay(voice); }}
          disabled={!voice.sampleUrl}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: playing ? "rgba(124,92,252,0.3)" : "rgba(124,92,252,0.12)",
            border:     `1px solid ${playing ? "#7c5cfc" : "rgba(124,92,252,0.3)"}`,
            color:      "#a78bfa", fontSize: 11, cursor: voice.sampleUrl ? "pointer" : "default",
            display:    "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, opacity: voice.sampleUrl ? 1 : 0.3,
          }}
        >
          {playing ? "■" : "▶"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{voice.desc}</div>
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
    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
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
        <a href={item.audio_url} download target="_blank" rel="noreferrer"
          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9494a8", textDecoration: "none" }}>
          ↓
        </a>
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

  const [activeTab, setActiveTab] = useState("generate");
  const [histPage,  setHistPage]  = useState(0);

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

  async function handleGenerate() {
    if (!script.trim() || generating) return;
    setGenerating(true);
    setGenErr("");
    setResult(null);
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

  return (
    <AppLayout>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
        <h1 className="text-[20px] font-bold" style={{ fontFamily: "'Outfit',sans-serif", color: "#f5c518" }}>Voiceover / TTS</h1>
        <div className="flex gap-1 bg-[#111118] rounded-[8px] p-[3px]">
          {[["generate", "Voiceover Generator"], ["history", "My Generated Voiceovers"]].map(([id, label]) => (
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
          <div style={{ maxWidth: 800, margin: "0 auto" }}>

            {/* Voice Picker */}
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                Choose a Voice
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {GENDER_FILTERS.map(f => (
                  <button key={f} onClick={() => setGenderFilter(f)}
                    style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: genderFilter === f ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${genderFilter === f ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.08)"}`, color: genderFilter === f ? "#a78bfa" : "#666", transition: "all 0.15s" }}>
                    {f}
                  </button>
                ))}
              </div>
              {voicesLoading && (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🔊</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#9494a8", marginBottom: 4 }}>Preparing voice samples…</div>
                  <div style={{ fontSize: 12, color: "#555" }}>Generating previews on first load — this takes ~15 seconds</div>
                </div>
              )}
              {voicesErr && (
                <div style={{ padding: 14, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: "#f87171", fontSize: 12 }}>
                  ✕ {voicesErr}
                </div>
              )}
              {!voicesLoading && !voicesErr && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {filteredVoices.map(v => (
                    <VoiceCard key={v.id} voice={v} selected={selectedVoice === v.id} playing={playingVoice === v.id} onSelect={setSelectedVoice} onPlay={playVoice} />
                  ))}
                  {filteredVoices.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px 0", color: "#555", fontSize: 13 }}>No voices in this category</div>
                  )}
                </div>
              )}
            </section>

            {/* Script */}
            <section style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>Script</div>
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder="Enter your script here…"
                style={{ width: "100%", minHeight: 140, background: "#0d0d14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 14px", color: "#e8e8f0", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "#555" }}>{script.length} character{script.length !== 1 ? "s" : ""}</span>
                <span style={{ fontSize: 11, color: "#666", fontStyle: "italic" }}>Speak or write in any language — the voice will follow</span>
              </div>
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#666", whiteSpace: "nowrap" }}>Speed</span>
                <input type="range" min={0.75} max={1.5} step={0.25} value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ flex: 1, accentColor: "#7c5cfc" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace", minWidth: 36, textAlign: "right" }}>{speed}×</span>
              </div>
            </section>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={!script.trim() || generating}
              style={{ width: "100%", padding: "14px 0", background: !script.trim() || generating ? "rgba(245,197,24,0.3)" : "#f5c518", color: !script.trim() || generating ? "rgba(0,0,0,0.4)" : "#000", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: !script.trim() || generating ? "not-allowed" : "pointer", fontFamily: "'Outfit',sans-serif", letterSpacing: "0.02em", marginBottom: 16 }}
            >
              {generating ? "⏳ Generating…" : "Generate Voiceover · 5 credits"}
            </button>

            {genErr && (
              <div style={{ padding: "10px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: "#f87171", fontSize: 12, marginBottom: 16 }}>
                ✕ {genErr}
              </div>
            )}

            {/* Result */}
            {result && (
              <div style={{ background: "#111118", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>✓ Generated</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(245,197,24,0.12)", border: "1px solid rgba(245,197,24,0.25)", color: "#f5c518" }}>⚡ 5 credits used</span>
                </div>
                <audio controls src={result.url} style={{ width: "100%", height: 36, marginBottom: 12 }} />
                <a href={result.url} download target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", padding: "7px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#9494a8", textDecoration: "none" }}>
                  ↓ Download
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Outfit',sans-serif", color: "#e8e8f0" }}>My Generated Voiceovers</h2>
              <button onClick={loadHistory} style={{ fontSize: 12, color: "#7c5cfc", background: "transparent", border: "none", cursor: "pointer" }}>Refresh</button>
            </div>

            {histLoading && history.length === 0 && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            )}

            {!histLoading && history.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>🔊</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No voiceovers yet</div>
                <div style={{ fontSize: 14, color: "#77777f" }}>Generate natural AI voiceovers in multiple languages</div>
                <button onClick={() => setActiveTab("generate")}
                  style={{ marginTop: 8, padding: "10px 24px", background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
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
                      style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: histPage === 0 ? "#33333f" : "#9494a8", cursor: histPage === 0 ? "default" : "pointer" }}>
                      ← Prev
                    </button>
                    <span style={{ padding: "7px 12px", fontSize: 12, color: "#55556a" }}>{histPage + 1} / {totalPages}</span>
                    <button onClick={() => setHistPage(p => Math.min(totalPages - 1, p + 1))} disabled={histPage === totalPages - 1}
                      style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: histPage === totalPages - 1 ? "#33333f" : "#9494a8", cursor: histPage === totalPages - 1 ? "default" : "pointer" }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
