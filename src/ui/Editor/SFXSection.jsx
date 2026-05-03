/**
 * SFXSection.jsx
 * src/ui/Editor/SFXSection.jsx
 * Beat-level SFX — Library tab + search, selected sound panel at top, playable rows.
 */
import React, { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { SFX_LIBRARY, SFX_KEYS, pickBeatSFX, getSFXPreviewUrl, loadSFXLibrary } from "../../core/registries/sfxRegistry";

function Label({ children }) {
  return (
    <div className="text-[12px] font-bold tracking-widest uppercase text-[#7070a0] mb-[4px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.05, unit = "" }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-[12px] font-mono text-[#7070a0]">{Math.round(value * 100)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
    </div>
  );
}

/* ── SFX library row ── */
function SFXRow({ sfxKey, isSelected, isPlaying, onSelect, onTogglePlay }) {
  const sfx = SFX_LIBRARY[sfxKey];

  return (
    <div
      onClick={() => onSelect(sfxKey)}
      className={`flex items-center gap-3 px-3 py-[9px] rounded-[8px] border cursor-pointer transition-all
        ${isSelected
          ? "border-[#7c5cfc] bg-[#16163a]"
          : "border-[rgba(255,255,255,0.06)] bg-[#111118] hover:border-[rgba(255,255,255,0.15)]"
        }`}
    >
      <button onClick={e => { e.stopPropagation(); onTogglePlay(sfxKey); }}
        className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 border-0 text-[12px] transition-all cursor-pointer
          ${isPlaying ? "bg-[#7c5cfc] text-white" : isSelected ? "bg-[#7c5cfc] text-white" : "bg-[#1c1c28] text-[#9494a8] hover:bg-[#7c5cfc] hover:text-white"}`}>
        {isPlaying ? "■" : "▶"}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#e8e8f0] truncate">{sfx.label}</div>
        <div className="text-[10px] text-[#55556a] capitalize">{sfx.mood} · {sfx.energy} energy</div>
      </div>
      <span className="text-[11px] font-mono text-[#55556a] shrink-0">{sfx.duration}s</span>
      {isSelected && <div className="w-[6px] h-[6px] rounded-full bg-[#7c5cfc] shrink-0" />}
    </div>
  );
}

export default function SFXSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [tab,        setTab]        = useState("library");
  const [search,     setSearch]     = useState("");
  const [playingKey, setPlayingKey] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => { loadSFXLibrary(); }, []);

  const togglePlay = (key) => {
    if (playingKey === key) {
      audioRef.current?.pause();
      setPlayingKey(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    setPlayingKey(key);
    const url = getSFXPreviewUrl(key);
    if (!url) return;
    audioRef.current = new window.Audio(url);
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(() => setPlayingKey(null));
    audioRef.current.onended = () => setPlayingKey(null);
  };

  if (!beat) return null;

  const cues     = beat.audio_cues || [];
  const beatCue  = cues.find(c => c.source === "beat") || null;
  const selectedKey = beatCue?.key || null;

  const selectSFX = (key) => {
    const sfx  = SFX_LIBRARY[key];
    if (!sfx) return;
    const kept = cues.filter(c => c.source !== "beat");
    updateBeat(beat.id, {
      audio_cues: [...kept, {
        id:       `sfx_${Date.now()}`,
        key,
        label:    sfx.label,
        volume:   0.4,
        position: 0,
        source:   "beat",
      }]
    });
  };

  const updateCue = (key, value) => {
    updateBeat(beat.id, {
      audio_cues: cues.map(c => c.source === "beat" ? { ...c, [key]: value } : c)
    });
  };

  const removeCue = () => {
    updateBeat(beat.id, { audio_cues: cues.filter(c => c.source !== "beat") });
  };

  const autoAssign = () => {
    const cue = pickBeatSFX(beat.intent || "explanation", beat.energy || 0.5, 0.4);
    if (!cue) return;
    updateBeat(beat.id, { audio_cues: [...cues.filter(c => c.source !== "beat"), cue] });
  };

  const filtered = SFX_KEYS.filter(k =>
    !search || SFX_LIBRARY[k].label.toLowerCase().includes(search.toLowerCase()) ||
    SFX_LIBRARY[k].mood.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ── Selected sound panel ── */}
      {beatCue ? (
        <div className="flex flex-col gap-3 p-3 rounded-[10px] border border-[#7c5cfc] bg-[#111118]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#e8e8f0]">{beatCue.label}</span>
            <button onClick={removeCue}
              className="text-[12px] text-[#f87171] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer">
              Remove
            </button>
          </div>
          <Slider label="Volume" value={beatCue.volume ?? 0.4}
            onChange={v => updateCue("volume", v)} unit="%" />
          <div className="flex flex-col gap-[3px]">
            <div className="flex justify-between">
              <Label>Delay</Label>
              <span className="text-[12px] font-mono text-[#7070a0]">{(beatCue.position || 0).toFixed(1)}s</span>
            </div>
            <input type="range" min={0} max={3} step={0.1} value={beatCue.position || 0}
              onChange={e => updateCue("position", Number(e.target.value))}
              className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-[10px] border border-dashed border-[rgba(255,255,255,0.08)]">
          <span className="text-[13px] text-[#55556a]">No beat sound selected</span>
          <button onClick={autoAssign}
            className="text-[12px] px-3 py-[5px] rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-[#1c1c28] text-[#9494a8] hover:border-[#7c5cfc] hover:text-[#e8e8f0] transition-all cursor-pointer font-semibold">
            Auto
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-[3px] bg-[#111118] border border-[rgba(255,255,255,0.07)] rounded-[8px] p-[3px]">
        {[["library","Library"],["search","Search"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-[6px] rounded-[6px] text-[13px] font-semibold transition-all
              ${tab === key ? "bg-[#1c1c28] text-[#e8e8f0]" : "text-[#55556a] hover:text-[#9494a8]"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Search input */}
      {tab === "search" && (
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name or mood..."
          className="w-full bg-[#111118] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[8px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none" />
      )}

      {/* ── SFX list ── */}
      <div className="flex flex-col gap-[5px] max-h-[340px] overflow-y-auto pr-[2px]">
        {(tab === "library" ? SFX_KEYS : filtered).map(key => (
          <SFXRow key={key} sfxKey={key}
            isSelected={selectedKey === key}
            isPlaying={playingKey === key}
            onSelect={selectSFX}
            onTogglePlay={togglePlay} />
        ))}
      </div>

    </div>
  );
}