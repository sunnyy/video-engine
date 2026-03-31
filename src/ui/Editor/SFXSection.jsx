/**
 * SFXSection.jsx
 * src/ui/Editor/SFXSection.jsx
 *
 * Beat-level SFX editor.
 * - Beat SFX: one main sound per beat, auto-assigned by intent
 * - Element SFX: sounds for blocks and overlays (auto, toggleable)
 * - Pixabay search for manual override
 */
import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { SFX_LIBRARY, SFX_KEYS, pickBeatSFX, getSFXPreviewUrl } from "../../core/sfxRegistry";

const PIXABAY_KEY = import.meta.env.VITE_PIXABAY_API_KEY;

function Label({ children }) {
  return (
    <div className="text-[12px] font-bold tracking-widest uppercase text-[#7070a0] mb-[5px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.05, unit = "" }) {
  return (
    <div className="flex flex-col gap-[4px]">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-[12px] font-mono text-[#7070a0]">
          {Math.round(value * 100)}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
    </div>
  );
}

/* ── Single cue row ── */
function CueRow({ cue, onUpdate, onRemove }) {
  const [playing, setPlaying] = useState(false);
  const audio = React.useRef(null);

  const togglePlay = () => {
    if (!cue.url) return;
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
    } else {
      audio.current = new window.Audio(getSFXPreviewUrl(cue.key));
      audio.current.volume = cue.volume ?? 1;
      audio.current.play();
      audio.current.onended = () => setPlaying(false);
      setPlaying(true);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#111118]">

      {/* Header row */}
      <div className="flex items-center gap-2">
        {/* Play button */}
        <button onClick={togglePlay}
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-[rgba(255,255,255,0.1)] bg-[#1c1c28] hover:border-[#7c5cfc] transition-all shrink-0 cursor-pointer text-[14px]">
          {playing ? "■" : "▶"}
        </button>

        {/* Label + source tag */}
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-[#e8e8f0] truncate">
            {cue.label || cue.key || "SFX"}
          </div>
          <div className="text-[11px] text-[#55556a] capitalize">{cue.source || "beat"}</div>
        </div>

        {/* Position */}
        <div className="text-[12px] font-mono text-[#55556a] shrink-0">
          +{((cue.position || 0).toFixed(1))}s
        </div>

        {/* Remove */}
        <button onClick={onRemove}
          className="text-[#f87171] text-[13px] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer px-1">
          ✕
        </button>
      </div>

      {/* Volume slider */}
      <Slider
        label="Volume"
        value={cue.volume ?? 1}
        onChange={v => onUpdate("volume", v)}
        unit="%"
      />

      {/* Position slider */}
      <div className="flex flex-col gap-[4px]">
        <div className="flex justify-between">
          <Label>Delay</Label>
          <span className="text-[12px] font-mono text-[#7070a0]">
            {(cue.position || 0).toFixed(1)}s
          </span>
        </div>
        <input type="range" min={0} max={3} step={0.1} value={cue.position || 0}
          onChange={e => onUpdate("position", Number(e.target.value))}
          className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
      </div>

    </div>
  );
}

/* ── SFX picker modal ── */
function SFXPicker({ onSelect, onClose, title = "Pick a Sound" }) {
  const [search, setSearch] = useState("");
  const [pixabayResults, setPixabayResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("library");

  const filtered = SFX_KEYS.filter(k =>
    k.toLowerCase().includes(search.toLowerCase()) ||
    SFX_LIBRARY[k].label.toLowerCase().includes(search.toLowerCase())
  );

  const searchPixabay = async () => {
    if (!search.trim() || !PIXABAY_KEY) return;
    setLoading(true);
    try {
      const res  = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(search)}&response_group=high_resolution&per_page=10`);
      const data = await res.json();
      setPixabayResults(data.hits || []);
    } catch (e) {
      console.warn("Pixabay audio search failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-[#1c1c28] w-[520px] max-h-[70vh] rounded-[14px] border border-[rgba(255,255,255,0.1)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.07)]">
          <span className="text-[16px] font-bold text-[#e8e8f0]">{title}</span>
          <button onClick={onClose} className="text-[#55556a] hover:text-[#e8e8f0] bg-transparent border-0 cursor-pointer text-[18px]">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-[3px] mx-5 mt-4 bg-[#111118] border border-[rgba(255,255,255,0.07)] rounded-[8px] p-[3px]">
          {[["library","Library"],["pixabay","Search Pixabay"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-[7px] rounded-[6px] text-[13px] font-semibold transition-all
                ${tab === key ? "bg-[#1c1c28] text-[#e8e8f0]" : "text-[#55556a] hover:text-[#9494a8]"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && tab === "pixabay" && searchPixabay()}
              placeholder={tab === "library" ? "Filter sounds..." : "Search Pixabay audio..."}
              className="flex-1 bg-[#111118] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[8px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none"
            />
            {tab === "pixabay" && (
              <button onClick={searchPixabay}
                className="px-4 py-[8px] bg-[#7c5cfc] text-white rounded-[8px] text-[13px] font-semibold cursor-pointer border-0">
                {loading ? "..." : "Search"}
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-[6px]">

          {tab === "library" && filtered.map(key => {
            const sfx = SFX_LIBRARY[key];
            return (
              <button key={key} onClick={() => onSelect({ key, label: sfx.label })}
                className="flex items-center gap-3 px-3 py-[10px] rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#111118] hover:border-[#7c5cfc] hover:bg-[#16163a] transition-all cursor-pointer text-left w-full">
                <span className="text-[16px]">🔊</span>
                <span className="text-[14px] text-[#e8e8f0] font-medium">{sfx.label}</span>
                <span className="ml-auto text-[12px] font-mono text-[#55556a]">{sfx.duration}s</span>
              </button>
            );
          })}

          {tab === "pixabay" && pixabayResults.map((hit, i) => (
            <button key={i}
              onClick={() => onSelect({ key: "pixabay", label: hit.tags?.split(",")[0] || "Pixabay SFX" })}
              className="flex items-center gap-3 px-3 py-[10px] rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#111118] hover:border-[#7c5cfc] hover:bg-[#16163a] transition-all cursor-pointer text-left w-full">
              <span className="text-[16px]">🎵</span>
              <span className="text-[14px] text-[#e8e8f0] font-medium truncate">{hit.tags?.split(",")[0] || "Sound"}</span>
            </button>
          ))}

          {tab === "pixabay" && !loading && pixabayResults.length === 0 && (
            <div className="text-center text-[14px] text-[#55556a] py-8">
              Search for a sound above
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Main section ── */
export default function SFXSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [picker, setPicker] = useState(null); // null | "beat" | "element"
  const [previewAudio, setPreviewAudio] = useState(null);

  if (!beat) return null;

  const cues = beat.audio_cues || [];

  const beatCues    = cues.filter(c => c.source === "beat");
  const elementCues = cues.filter(c => c.source === "element");

  const addCue = (sfx, source) => {
    const newCue = {
      id:       `sfx_${Date.now()}`,
      key:      sfx.key,
      label:    sfx.label,
      volume:   source === "beat" ? 1.0 : 0.4,
      position: 0,
      source,
    };
    updateBeat(beat.id, { audio_cues: [...cues, newCue] });
    setPicker(null);
  };

  const updateCue = (id, key, value) => {
    updateBeat(beat.id, {
      audio_cues: cues.map(c => c.id === id ? { ...c, [key]: value } : c)
    });
  };

  const removeCue = (id) => {
    updateBeat(beat.id, { audio_cues: cues.filter(c => c.id !== id) });
  };

  const autoAssign = () => {
    const intent = beat.caption?.intent || beat.intent || "explanation";
    const cue    = pickBeatSFX(intent);
    if (!cue) return;
    // Replace existing beat cues
    const kept = cues.filter(c => c.source !== "beat");
    updateBeat(beat.id, { audio_cues: [...kept, cue] });
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Beat SFX */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-[#e8e8f0]">Beat Sound</span>
          <div className="flex gap-2">
            <button onClick={autoAssign}
              className="text-[13px] px-3 py-[6px] rounded-[7px] border border-[rgba(255,255,255,0.08)] bg-[#1c1c28] text-[#9494a8] hover:border-[#7c5cfc] hover:text-[#e8e8f0] transition-all cursor-pointer font-semibold">
              Auto
            </button>
            <button onClick={() => setPicker("beat")}
              className="text-[13px] px-3 py-[6px] rounded-[7px] border border-[rgba(255,255,255,0.08)] bg-[#1c1c28] text-[#e8e8f0] hover:border-[#7c5cfc] transition-all cursor-pointer font-semibold">
              + Add
            </button>
          </div>
        </div>

        {beatCues.length === 0 ? (
          <div className="flex items-center justify-center py-6 rounded-[10px] border border-dashed border-[rgba(255,255,255,0.08)] text-[14px] text-[#55556a]">
            No beat sound — click Auto or Add
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {beatCues.map(cue => (
              <CueRow key={cue.id} cue={cue}
                onUpdate={(k, v) => updateCue(cue.id, k, v)}
                onRemove={() => removeCue(cue.id)} />
            ))}
          </div>
        )}
      </div>



      {/* Picker modal */}
      {picker && (
        <SFXPicker
          title={picker === "beat" ? "Pick Beat Sound" : "Pick Element Sound"}
          onSelect={sfx => addCue(sfx, picker)}
          onClose={() => setPicker(null)}
        />
      )}

    </div>
  );
}