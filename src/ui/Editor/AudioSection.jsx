/**
 * AudioSection.jsx
 * src/ui/Editor/AudioSection.jsx
 */
import React, { useRef, useState } from "react";
import { useProjectStore }  from "../../store/useProjectStore";
import { uploadUserAsset }  from "../../services/assets/uploadUserAsset";
import { MUSIC_LIBRARY, MUSIC_KEYS, MUSIC_PREVIEW_URLS } from "../../core/musicRegistry";

/* ── Waveform bar visual ── */
function WaveformBar() {
  return (
    <div className="flex-1 h-[36px] rounded-[6px] bg-[#1c1c28] flex items-center px-2 gap-[2px] overflow-hidden">
      {Array.from({ length: 36 }).map((_, i) => (
        <div key={i} className="flex-1 rounded-full bg-[#7c5cfc]"
          style={{ height: `${22 + Math.sin(i * 0.9) * 12 + Math.cos(i * 1.5) * 7}%`, opacity: 0.55 }} />
      ))}
    </div>
  );
}

/* ── Shared label ── */
function Label({ children }) {
  return (
    <div className="text-[12px] font-bold tracking-widest uppercase text-[#7070a0] mb-[5px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

/* ── Voice / TTS track ── */
function TTSTrack({ audio, onUpload, onRemove, onVolumeChange, uploading, progress }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const fileRef  = useRef(null);

  const togglePlay = () => {
    if (!audio?.src) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      audioRef.current = new window.Audio(audio.src);
      audioRef.current.volume = audio.volume ?? 1;
      audioRef.current.play();
      audioRef.current.onended = () => setPlaying(false);
      setPlaying(true);
    }
  };

  const handleRemove = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    onRemove();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[16px] font-bold text-[#e8e8f0]">Voice / TTS</span>
        {audio?.src && (
          <button onClick={handleRemove}
            className="text-[13px] text-[#f87171] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer">
            Remove
          </button>
        )}
      </div>

      {!audio?.src ? (
        <div>
          <input ref={fileRef} type="file" accept="audio/*"
            onChange={e => onUpload(e.target.files?.[0])} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-[10px] rounded-[10px] border border-dashed border-[rgba(255,255,255,0.1)] text-[14px] text-[#55556a] hover:border-[#7c5cfc] hover:text-[#9494a8] transition-all cursor-pointer bg-transparent">
            + Upload Voice / TTS
          </button>
          {uploading && (
            <div className="w-full h-[3px] bg-[#1c1c28] rounded mt-2 overflow-hidden">
              <div className="h-full bg-[#7c5cfc] transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#111118]">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay}
              className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#7c5cfc] hover:bg-[#6a4aed] shrink-0 cursor-pointer border-0 text-white text-[16px]">
              {playing ? "■" : "▶"}
            </button>
            <WaveformBar />
          </div>
          <div>
            <div className="flex justify-between mb-[4px]">
              <Label>Volume</Label>
              <span className="text-[12px] font-mono text-[#7070a0]">{Math.round((audio.volume ?? 1) * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={audio.volume ?? 1}
              onChange={e => onVolumeChange(Number(e.target.value))}
              className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Background Music track ── */
function MusicTrack({ audio, onSelectLibrary, onUpload, onRemove, onVolumeChange, uploading, progress }) {
  const [playing, setPlaying]   = useState(false);
  const [tab, setTab]           = useState("library"); // "library" | "upload"
  const audioRef = useRef(null);
  const fileRef  = useRef(null);

  const currentKey = audio?.musicKey || null;

  const togglePlay = (src) => {
    const url = src || audio?.src;
    if (!url) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      if (audioRef.current) { audioRef.current.pause(); }
      audioRef.current = new window.Audio(url);
      audioRef.current.volume = audio?.volume ?? 0.4;
      audioRef.current.play();
      audioRef.current.onended = () => setPlaying(false);
      setPlaying(true);
    }
  };

  const handleRemove = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    onRemove();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[16px] font-bold text-[#e8e8f0]">Background Music</span>
        {audio?.src && (
          <button onClick={handleRemove}
            className="text-[13px] text-[#f87171] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer">
            Remove
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-[3px] bg-[#111118] border border-[rgba(255,255,255,0.07)] rounded-[8px] p-[3px]">
        {[["library","Library"],["upload","Upload"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-[6px] rounded-[6px] text-[13px] font-semibold transition-all
              ${tab === key ? "bg-[#1c1c28] text-[#e8e8f0]" : "text-[#55556a] hover:text-[#9494a8]"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Library tab */}
      {tab === "library" && (
        <div className="flex flex-col gap-[6px]">
          {MUSIC_KEYS.map(key => {
            const track     = MUSIC_LIBRARY[key];
            const isActive  = currentKey === key;
            const previewUrl = MUSIC_PREVIEW_URLS[key];

            return (
              <div key={key}
                className={`flex items-center gap-3 px-3 py-[10px] rounded-[10px] border cursor-pointer transition-all
                  ${isActive
                    ? "border-[#7c5cfc] bg-[#16163a]"
                    : "border-[rgba(255,255,255,0.07)] bg-[#111118] hover:border-[rgba(255,255,255,0.15)]"
                  }`}
                onClick={() => onSelectLibrary(key)}>

                {/* Play preview */}
                <button
                  onClick={e => { e.stopPropagation(); togglePlay(previewUrl); }}
                  className={`w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer border-0 text-[13px] transition-all
                    ${isActive ? "bg-[#7c5cfc] text-white" : "bg-[#1c1c28] text-[#9494a8] hover:bg-[#7c5cfc] hover:text-white"}`}>
                  {playing && isActive ? "■" : "▶"}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-[#e8e8f0] truncate">{track.label}</div>
                  <div className="flex gap-1 mt-[3px] flex-wrap">
                    {track.vibe.map(v => (
                      <span key={v} className="text-[10px] px-[6px] py-[1px] rounded-full bg-[rgba(124,92,252,0.12)] text-[#a78fff]">{v}</span>
                    ))}
                  </div>
                </div>

                {isActive && (
                  <div className="w-[8px] h-[8px] rounded-full bg-[#7c5cfc] shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload tab */}
      {tab === "upload" && (
        <div>
          <input ref={fileRef} type="file" accept="audio/*"
            onChange={e => onUpload(e.target.files?.[0])} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-[10px] rounded-[10px] border border-dashed border-[rgba(255,255,255,0.1)] text-[14px] text-[#55556a] hover:border-[#7c5cfc] hover:text-[#9494a8] transition-all cursor-pointer bg-transparent">
            + Upload Music File
          </button>
          {uploading && (
            <div className="w-full h-[3px] bg-[#1c1c28] rounded mt-2 overflow-hidden">
              <div className="h-full bg-[#7c5cfc] transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Volume — shown when music is selected */}
      {audio?.src && (
        <div className="p-3 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#111118]">
          <div className="flex justify-between mb-[4px]">
            <Label>Volume</Label>
            <span className="text-[12px] font-mono text-[#7070a0]">{Math.round((audio.volume ?? 0.4) * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={audio.volume ?? 0.4}
            onChange={e => onVolumeChange(Number(e.target.value))}
            className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
        </div>
      )}
    </div>
  );
}

/* ── Main export ── */
export default function AudioSection() {
  const project           = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const [uploading, setUploading] = useState({ tts: false, music: false });
  const [progress,  setProgress]  = useState({ tts: 0,     music: 0    });

  if (!project) return null;

  const audio = project.audio || { tts: null, music: null };

  const uploadAudio = async (file, type) => {
    if (!file) return;
    setUploading(p => ({ ...p, [type]: true }));
    setProgress(p  => ({ ...p, [type]: 0   }));
    try {
      const formData = new FormData();
      formData.append("audio", file);
      const compressedRes = await fetch("http://localhost:5000/api/compress-audio", { method: "POST", body: formData });
      const blob = await compressedRes.blob();
      const compressedFile = new File([blob], "compressed.m4a", { type: "audio/mp4" });
      const uploaded = await uploadUserAsset(compressedFile, null, pct => setProgress(p => ({ ...p, [type]: pct })));
      updateProjectMeta({ audio: { ...audio, [type]: { src: uploaded.url, volume: type === "music" ? 0.4 : 1 } } });
    } catch (e) {
      console.error("Audio upload failed", e);
    } finally {
      setUploading(p => ({ ...p, [type]: false }));
    }
  };

  const selectLibraryMusic = (key) => {
    const track = MUSIC_LIBRARY[key];
    if (!track) return;
    updateProjectMeta({
      audio: {
        ...audio,
        music: {
          src:      MUSIC_PREVIEW_URLS[key], // browser preview + VideoComposition fallback
          musicKey: key,                      // used by VideoComposition for staticFile()
          volume:   0.4,
        },
      },
    });
  };

  const removeAudio = (type) => updateProjectMeta({ audio: { ...audio, [type]: null } });

  const setVolume = (type, volume) =>
    updateProjectMeta({ audio: { ...audio, [type]: { ...audio[type], volume } } });

  return (
    <div className="w-[50%] overflow-y-auto border-r border-[rgba(255,255,255,0.06)] bg-[#0b0b10] px-6 py-6">
      <h3 className="mb-6 text-[16px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne', sans-serif" }}>
        Video Audio
      </h3>

      <div className="flex flex-col gap-8">

        <TTSTrack
          audio={audio?.tts}
          onUpload={f => uploadAudio(f, "tts")}
          onRemove={() => removeAudio("tts")}
          onVolumeChange={v => setVolume("tts", v)}
          uploading={uploading.tts}
          progress={progress.tts}
        />

        <div className="h-[1px] bg-[rgba(255,255,255,0.06)]" />

        <MusicTrack
          audio={audio?.music}
          onSelectLibrary={selectLibraryMusic}
          onUpload={f => uploadAudio(f, "music")}
          onRemove={() => removeAudio("music")}
          onVolumeChange={v => setVolume("music", v)}
          uploading={uploading.music}
          progress={progress.music}
        />

      </div>
    </div>
  );
}