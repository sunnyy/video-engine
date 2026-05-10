import { useState, useEffect, useRef } from "react";
import { fetchElevenLabsVoices } from "../services/elevenlabs";

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M2 1.5l6 3.5-6 3.5V1.5z"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <rect x="2" y="2" width="6" height="6" rx="1"/>
    </svg>
  );
}

export default function VoiceSelector({ selectedVoiceId, onSelect, stopSignal, language = "english" }) {
  const [voices,    setVoices]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [gender,    setGender]    = useState("all");

  const audioRef = useRef(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  };

  useEffect(() => { stopAudio(); }, [stopSignal]);

  useEffect(() => {
    fetchElevenLabsVoices()
      .then(v => { setVoices(v); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = (voice) => {
    if (!voice.preview_url) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === voice.voice_id) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPlayingId(voice.voice_id);

    audio.play().catch(() => {});
    audio.addEventListener("ended", () => {
      setPlayingId(null);
      audioRef.current = null;
    });
  };

  if (error) {
    return (
      <div style={{
        padding: "12px 16px", borderRadius: 8,
        background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)",
        fontSize: 12, color: "#f87171",
      }}>
        Voice selection unavailable
      </div>
    );
  }

  const byLanguage = (() => {
    if (language === "hindi") {
      // eleven_multilingual_v2 supports any voice for Hindi — show all
      return voices;
    }
    if (language === "english") {
      const en = voices.filter(v => {
        const lang   = (v.labels?.language || "").toLowerCase();
        const accent = (v.labels?.accent   || "").toLowerCase();
        return lang === "en" ||
               accent.includes("american") || accent.includes("british") || accent.includes("australian");
      });
      return en.length >= 5 ? en : voices;
    }
    return voices;
  })();

  const visibleVoices = gender === "all"
    ? byLanguage
    : byLanguage.filter(v => (v.labels?.gender || "").toLowerCase() === gender);

  return (
    <div>
      <style>{`
        @keyframes vs-spin { to { transform: rotate(360deg); } }
        .vs-grid::-webkit-scrollbar { width: 4px; }
        .vs-grid::-webkit-scrollbar-track { background: transparent; }
        .vs-grid::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 999px; }
        .vs-grid::-webkit-scrollbar-thumb:hover { background: #3a3a4a; }
      `}</style>

      {/* Gender filter */}
      {!loading && !error && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, gap: 4 }}>
          {["all", "female", "male"].map(g => {
            const active = gender === g;
            return (
              <button
                key={g}
                onClick={() => { stopAudio(); setGender(g); }}
                style={{
                  padding: "4px 12px", borderRadius: 999, border: "none",
                  background: active ? "rgba(124,92,252,0.2)" : "transparent",
                  color: active ? "#a78bfa" : "#555570",
                  fontSize: 11, fontWeight: active ? 700 : 500,
                  fontFamily: "'Outfit', sans-serif",
                  cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
                }}
              >
                {g === "all" ? "All" : g === "female" ? "Female" : "Male"}
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#555566", fontSize: 12, marginBottom: 12 }}>
          <div style={{
            width: 14, height: 14, borderRadius: "50%",
            border: "2px solid rgba(124,92,252,0.15)",
            borderTopColor: "#7c5cfc",
            animation: "vs-spin 1s linear infinite",
            flexShrink: 0,
          }} />
          Loading voices…
        </div>
      )}

      <div className="vs-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 8,
        maxHeight: 320,
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "#2a2a3a transparent",
      }}>
      {visibleVoices.map(voice => {
        const selected  = selectedVoiceId === voice.voice_id;
        const isPlaying = playingId === voice.voice_id;
        const gender    = voice.labels?.gender || "";

        return (
          <div
            key={voice.voice_id}
            onClick={() => onSelect(voice.voice_id)}
            style={{
              background:   selected ? "rgba(124,92,252,0.1)" : "#1c1c28",
              border:       `1px solid ${selected ? "#7c5cfc" : "rgba(255,255,255,0.08)"}`,
              boxShadow:    selected ? "0 0 0 1px rgba(124,92,252,0.25)" : "none",
              borderRadius: 10,
              padding:      "10px 10px 8px",
              cursor:       "pointer",
              transition:   "all 0.15s",
              display:      "flex",
              flexDirection: "column",
              gap:          5,
            }}
          >
            {/* Name + play */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: selected ? "#a78bfa" : "#d8d8f0",
                fontFamily: "'Outfit', sans-serif",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                flex: 1,
              }}>
                {voice.name}
              </div>

              {voice.preview_url && (
                <button
                  onClick={e => { e.stopPropagation(); handlePlay(voice); }}
                  style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: "none", cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isPlaying ? "#7c5cfc" : "rgba(124,92,252,0.2)",
                    color:      isPlaying ? "#fff"    : "#a78bfa",
                    transition: "all 0.15s",
                  }}
                >
                  {isPlaying ? <StopIcon /> : <PlayIcon />}
                </button>
              )}
            </div>

            {/* Gender tag */}
            {gender && (
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
                textTransform: "uppercase", color: "#55556a",
                background: "rgba(255,255,255,0.04)", padding: "2px 5px",
                borderRadius: 3, alignSelf: "flex-start",
              }}>
                {gender}
              </span>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
