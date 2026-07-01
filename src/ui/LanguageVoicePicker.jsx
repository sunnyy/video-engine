import { useState, useEffect, useRef } from "react";
import { serverFetch } from "../services/serverApi";

const LANGUAGES = [
  { id: "en",       label: "English"               },
  { id: "hinglish", label: "Hindi"  },
  { id: "es",       label: "Spanish"               },
];

const KNOWN_DEFAULTS = LANGUAGES.map(l => l.id);

function hexToRgb(hex) {
  const h = (hex ?? "#7c5cfc").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

/**
 * LanguageVoicePicker
 *
 * Props:
 *   language          string       — current language id ("en", "hinglish", "es")
 *   onLanguageChange  fn(id)       — called when user picks a language
 *   voiceId           string|null  — selected ElevenLabs voice id
 *   onVoiceChange     fn(id)       — called when user picks a voice
 *   disabled          bool         — disables all controls (during generation)
 *   accentColor       string       — hex color for selection highlight (default #7c5cfc)
 *   border            string       — border color token (default rgba(255,255,255,0.07))
 */
export function LanguageVoicePicker({
  language       = "en",
  onLanguageChange,
  voiceId        = null,
  onVoiceChange,
  disabled       = false,
  accentColor    = "#7c5cfc",
  border         = "rgba(255,255,255,0.07)",
}) {
  const [voices,          setVoices]          = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [page,            setPage]            = useState(1);
  const [hasMore,         setHasMore]         = useState(false);
  const [loadingMore,     setLoadingMore]     = useState(false);
  const [playingVoiceId,  setPlayingVoiceId]  = useState(null);
  const voiceAudioRef     = useRef(null);
  const requestedRef      = useRef(null);
  const rgb               = hexToRgb(accentColor);

  const voicesUrl = (p) => {
    const params = new URLSearchParams();
    if (language !== "en") params.set("lang", language);
    params.set("page", String(p));
    return `/api/video/voices?${params.toString()}`;
  };

  // Fetch the first page whenever language changes
  useEffect(() => {
    setLoading(true);
    setPage(1);
    serverFetch(voicesUrl(1))
      .then(r => r.json())
      .then(d => {
        const list = d.voices || [];
        setVoices(list);
        setHasMore(!!d.hasMore);
        // Auto-select first voice if nothing selected or current not in new list
        if (list.length && (!voiceId || !list.find(v => v.id === voiceId))) {
          onVoiceChange?.(list[0].id);
        }
      })
      .catch(() => { setVoices([]); setHasMore(false); })
      .finally(() => setLoading(false));
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      const d = await serverFetch(voicesUrl(next)).then(r => r.json());
      const list = d.voices || [];
      setVoices(prev => {
        const seen = new Set(prev.map(v => v.id));
        return [...prev, ...list.filter(v => !seen.has(v.id))];
      });
      setHasMore(!!d.hasMore);
      setPage(next);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      voiceAudioRef.current?.pause();
      voiceAudioRef.current = null;
    };
  }, []);

  async function handlePlay(voice) {
    if (playingVoiceId === voice.id) {
      voiceAudioRef.current?.pause();
      voiceAudioRef.current = null;
      requestedRef.current = null;
      setPlayingVoiceId(null);
      return;
    }
    voiceAudioRef.current?.pause();
    voiceAudioRef.current = null;
    requestedRef.current = voice.id;
    setPlayingVoiceId(voice.id);

    try {
      let url;
      if (voice.preview_url) {
        const res = await serverFetch(`/api/video/voice-preview?url=${encodeURIComponent(voice.preview_url)}`);
        if (!res.ok) throw new Error("Preview fetch failed");
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
      } else {
        const res = await serverFetch(`/api/promo-video/voice-sample/${voice.id}?lang=${language}`);
        if (!res.ok) throw new Error("Sample fetch failed");
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
      }
      if (requestedRef.current !== voice.id) return;

      const audio = new Audio(url);
      const ctx   = new AudioContext();
      const src   = ctx.createMediaElementSource(audio);
      const gain  = ctx.createGain();
      gain.gain.value = 2.5;
      src.connect(gain);
      gain.connect(ctx.destination);
      audio.onended = () => {
        voiceAudioRef.current = null;
        setPlayingVoiceId(null);
        ctx.close();
      };
      voiceAudioRef.current = audio;
      await audio.play();
    } catch (err) {
      console.error("[voicePlay]", err?.message || err);
      if (requestedRef.current === voice.id) {
        voiceAudioRef.current = null;
        setPlayingVoiceId(null);
      }
    }
  }

  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)",
    marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em",
    display: "block",
  };

  const inputBase = {
    width: "100%", padding: "10px 13px", boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)", border: `1px solid ${border}`,
    borderRadius: 10, color: "#e8e8f0", fontSize: 13,
    fontFamily: "inherit", outline: "none",
  };

  return (
    <div>
      {/* Language */}
      <div style={{ marginBottom: 30 }}>
        <span style={labelStyle}>Language</span>
        <select
          value={language}
          onChange={e => onLanguageChange?.(e.target.value)}
          disabled={disabled}
          style={{
            ...inputBase,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {LANGUAGES.map(l => (
            <option key={l.id} value={l.id} style={{ background: "#111118" }}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Voiceover */}
      <div>
        <span style={labelStyle}>Voiceover</span>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", opacity: 0.5 }}>
            <div style={{ width: 16, height: 16, border: `2px solid ${accentColor}`, borderTopColor: "transparent", borderRadius: "50%", animation: "lvp-spin 0.8s linear infinite", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Loading voices…</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 340, overflowY: "auto", paddingRight: 4 }}>
            {voices.map(v => {
              const selected = voiceId === v.id;
              const playing  = playingVoiceId === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => !disabled && onVoiceChange?.(v.id)}
                  style={{
                    minWidth: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "12px 10px 10px",
                    borderRadius: 10, textAlign: "center",
                    background:   selected ? `rgba(${rgb},0.10)` : "rgba(255,255,255,0.04)",
                    border:       `1.5px solid ${selected ? `rgba(${rgb},0.55)` : border}`,
                    cursor:       disabled ? "not-allowed" : "pointer",
                    opacity:      disabled ? 0.6 : 1,
                    transition:   "all 0.15s",
                  }}
                >
                  {/* Play button */}
                  <button
                    onClick={e => { e.stopPropagation(); !disabled && handlePlay(v); }}
                    disabled={disabled}
                    title={playing ? "Stop" : "Preview voice"}
                    style={{
                      width: 28, height: 28, borderRadius: "50%", border: "none",
                      background: playing ? accentColor : `rgba(${rgb},0.15)`,
                      color:      playing ? "#fff"       : accentColor,
                      fontSize: 9, cursor: disabled ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s", flexShrink: 0,
                    }}
                  >
                    {playing ? "■" : "▶"}
                  </button>

                  {/* Name */}
                  <span style={{ fontSize: 12, fontWeight: 700, color: selected ? "#e8e8f0" : "#b0b0c8", lineHeight: 1.2 }}>
                    {v.label}
                  </span>

                  {/* Desc */}
                  {v.desc && (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.3 }}>
                      {v.desc}
                    </span>
                  )}

                  {/* Gender badge */}
                  {v.gender && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: v.gender === "female" ? "rgba(244,114,182,0.15)" : v.gender === "male" ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.08)",
                      color: v.gender === "female" ? "#f472b6" : v.gender === "male" ? "#60a5fa" : "rgba(255,255,255,0.4)",
                    }}>
                      {v.gender === "female" ? "F" : v.gender === "male" ? "M" : "—"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!loading && hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore || disabled}
            style={{
              marginTop: 10, width: "100%", padding: "9px", borderRadius: 10,
              border: `1px solid ${border}`, background: "rgba(255,255,255,0.03)",
              color: accentColor, fontSize: 12.5, fontWeight: 700,
              cursor: (loadingMore || disabled) ? "default" : "pointer",
              fontFamily: "inherit", opacity: (loadingMore || disabled) ? 0.6 : 1,
            }}
          >
            {loadingMore ? "Loading…" : "Load more voices"}
          </button>
        )}
      </div>

      <style>{`@keyframes lvp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
