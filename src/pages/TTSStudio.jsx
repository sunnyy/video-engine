/**
 * TTSStudio.jsx — Voice generation page with voice picker and preview
 * /tts-studio
 */
import { useState, useEffect, useRef } from "react";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import AppLayout from "../ui/AppLayout";

/* ── Helpers ── */
function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  return d.toLocaleDateString();
}

const GENDER_FILTERS = ["All", "Female", "Male", "Neutral"];

const GENDER_COLORS = {
  female:  { bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)", color: "#f472b6" },
  male:    { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  color: "#60a5fa" },
  neutral: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", color: "#a78bfa" },
};

/* ── VoiceCard ── */
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
        <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>{voice.label}</span>
        <button
          onClick={e => { e.stopPropagation(); onPlay(voice); }}
          disabled={!voice.sampleUrl}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: playing ? "rgba(124,92,252,0.3)" : "rgba(124,92,252,0.12)",
            border:     `1px solid ${playing ? "#7c5cfc" : "rgba(124,92,252,0.3)"}`,
            color:      "#a78bfa",
            fontSize:   11,
            cursor:     voice.sampleUrl ? "pointer" : "default",
            display:    "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            opacity:    voice.sampleUrl ? 1 : 0.3,
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

/* ── HistoryItem ── */
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
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    setDeleting(true);
    try {
      await serverFetch(`/api/tts/history/${item.id}`, { method: "DELETE" });
      onDelete(item.id);
    } catch {} finally { setDeleting(false); }
  };

  return (
    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
      <button
        onClick={togglePlay}
        style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: playing ? "rgba(124,92,252,0.25)" : "rgba(124,92,252,0.1)",
          border:     `1px solid ${playing ? "#7c5cfc" : "rgba(124,92,252,0.25)"}`,
          color:      "#a78bfa", fontSize: 12, cursor: "pointer",
          display:    "flex", alignItems: "center", justifyContent: "center",
        }}
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
          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9494a8", textDecoration: "none", cursor: "pointer" }}>
          ↓
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
            background: confirming ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
            border:     confirming ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)",
            color:      confirming ? "#f87171" : "#55556a",
          }}
        >
          {deleting ? "…" : confirming ? "Sure?" : "✕"}
        </button>
      </div>
    </div>
  );
}

/* ══ Main Component ══════════════════════════════════════════════ */
export default function TTSStudio() {
  const { balance, fetchCredits } = useCreditsStore();

  // Voice catalog
  const [voices,        setVoices]        = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesErr,     setVoicesErr]     = useState("");
  const [genderFilter,  setGenderFilter]  = useState("All");
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [playingVoice,  setPlayingVoice]  = useState(null);
  const currentAudio = useRef(null);

  // Script
  const [script, setScript] = useState("");
  const [speed,  setSpeed]  = useState(1.0);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genErr,     setGenErr]     = useState("");
  const [result,     setResult]     = useState(null); // { url }
  const [toast,      setToast]      = useState("");

  // History
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  /* ── Fetch voices ── */
  useEffect(() => {
    setVoicesLoading(true);
    serverFetch("/api/tts/voices")
      .then(r => r.json())
      .then(d => { setVoices(d.voices || []); })
      .catch(e => setVoicesErr(e.message || "Failed to load voices"))
      .finally(() => setVoicesLoading(false));
  }, []);

  /* ── Fetch history ── */
  useEffect(() => {
    serverFetch("/api/tts/history")
      .then(r => r.json())
      .then(d => setHistory(d.history || []))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, []);

  /* ── Play voice sample ── */
  function playVoice(voice) {
    if (!voice.sampleUrl) return;
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current = null;
    }
    if (playingVoice === voice.id) {
      setPlayingVoice(null);
      return;
    }
    const audio = new Audio(voice.sampleUrl);
    audio.onended = () => setPlayingVoice(null);
    audio.play().catch(() => {});
    currentAudio.current = audio;
    setPlayingVoice(voice.id);
  }

  /* ── Generate ── */
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
      setHistory(prev => [{
        id:         `local-${Date.now()}`,
        voice_id:   selectedVoice,
        script:     script.trim().slice(0, 500),
        audio_url:  data.url,
        char_count: script.trim().length,
        created_at: new Date().toISOString(),
      }, ...prev]);
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleDeleteHistory(id) {
    setHistory(prev => prev.filter(h => h.id !== id));
  }

  const filteredVoices = genderFilter === "All"
    ? voices
    : voices.filter(v => v.gender === genderFilter.toLowerCase());

  /* ══ Render ══════════════════════════════════════════════════ */
  return (
    <AppLayout>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1c1c28", border: "1px solid rgba(124,92,252,0.4)", borderRadius: 8, padding: "10px 20px", fontSize: 13, color: "#a78bfa", zIndex: 9999, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            {toast}
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e8e8f0", margin: 0, fontFamily: "'Syne',sans-serif" }}>
              🎙️ Voice Studio
            </h1>
            <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
              5 credits per generation · OpenAI TTS-1-HD
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: "#f5c518" }}>⚡</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f5c518", fontFamily: "'JetBrains Mono',monospace" }}>
              {balance ?? "—"}
            </span>
            <span style={{ fontSize: 11, color: "#888" }}>credits</span>
          </div>
        </div>

        {/* ── Voice Picker ── */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>
            Choose a Voice
          </div>

          {/* Gender filter tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {GENDER_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setGenderFilter(f)}
                style={{
                  padding:    "5px 14px",
                  borderRadius: 20,
                  fontSize:   12,
                  fontWeight: 600,
                  cursor:     "pointer",
                  background: genderFilter === f ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.04)",
                  border:     `1px solid ${genderFilter === f ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.08)"}`,
                  color:      genderFilter === f ? "#a78bfa" : "#666",
                  transition: "all 0.15s",
                }}
              >
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
                <VoiceCard
                  key={v.id}
                  voice={v}
                  selected={selectedVoice === v.id}
                  playing={playingVoice === v.id}
                  onSelect={setSelectedVoice}
                  onPlay={playVoice}
                />
              ))}
              {filteredVoices.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px 0", color: "#555", fontSize: 13 }}>
                  No voices in this category
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Script Input ── */}
        <section style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>
            Script
          </div>

          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder="Enter your script here…"
            style={{
              width:        "100%",
              minHeight:    140,
              background:   "#0d0d14",
              border:       "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding:      "12px 14px",
              color:        "#e8e8f0",
              fontSize:     14,
              lineHeight:   1.6,
              resize:       "vertical",
              outline:      "none",
              boxSizing:    "border-box",
              fontFamily:   "inherit",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#555" }}>
              {script.length} character{script.length !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: 11, color: "#666", fontStyle: "italic" }}>
              Speak or write in any language — the voice will follow
            </span>
          </div>

          {/* Speed slider */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#666", whiteSpace: "nowrap" }}>Speed</span>
            <input
              type="range"
              min={0.75}
              max={1.5}
              step={0.25}
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#7c5cfc" }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace", minWidth: 36, textAlign: "right" }}>
              {speed}×
            </span>
          </div>
        </section>

        {/* ── Generate Button ── */}
        <button
          onClick={handleGenerate}
          disabled={!script.trim() || generating}
          style={{
            width:        "100%",
            padding:      "14px 0",
            background:   !script.trim() || generating ? "rgba(245,197,24,0.3)" : "#f5c518",
            color:        !script.trim() || generating ? "rgba(0,0,0,0.4)" : "#000",
            border:       "none",
            borderRadius: 10,
            fontSize:     15,
            fontWeight:   800,
            cursor:       !script.trim() || generating ? "not-allowed" : "pointer",
            fontFamily:   "'Syne',sans-serif",
            letterSpacing: "0.02em",
            transition:   "all 0.15s",
            marginBottom: 16,
          }}
        >
          {generating ? "⏳ Generating…" : "Generate Voiceover"}
        </button>

        {genErr && (
          <div style={{ padding: "10px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: "#f87171", fontSize: 12, marginBottom: 16 }}>
            ✕ {genErr}
          </div>
        )}

        {/* ── Result ── */}
        {result && (
          <div style={{ background: "#111118", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: 18, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>
                ✓ Generated
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(245,197,24,0.12)", border: "1px solid rgba(245,197,24,0.25)", color: "#f5c518" }}>
                ⚡ 5 credits used
              </span>
            </div>
            <audio
              controls
              src={result.url}
              style={{ width: "100%", height: 36, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <a
                href={result.url}
                download
                target="_blank"
                rel="noreferrer"
                style={{ padding: "7px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#9494a8", textDecoration: "none", cursor: "pointer" }}
              >
                ↓ Download
              </a>
              <button
                onClick={() => showToast("Coming soon — editor integration in progress")}
                style={{ padding: "7px 16px", background: "rgba(124,92,252,0.1)", border: "1px solid rgba(124,92,252,0.25)", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "#a78bfa", cursor: "pointer" }}
              >
                Use in Project →
              </button>
            </div>
          </div>
        )}

        {/* ── History ── */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>
            History
          </div>

          {histLoading && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#555", fontSize: 13 }}>Loading…</div>
          )}

          {!histLoading && history.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#444", fontSize: 13 }}>
              No voiceovers yet — generate your first one above
            </div>
          )}

          {!histLoading && history.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map(item => (
                <HistoryItem key={item.id} item={item} onDelete={handleDeleteHistory} />
              ))}
            </div>
          )}
        </section>

      </div>
    </AppLayout>
  );
}
