/**
 * AudioSection.jsx
 * src/ui/Editor/AudioSection.jsx
 */
import { useRef, useState } from "react";
import { useProjectStore }  from "../../store/useProjectStore";
import { uploadUserAsset }  from "../../services/assets/uploadUserAsset";
import { MUSIC_LIBRARY, MUSIC_KEYS, MUSIC_PREVIEW_URLS } from "../../core/registries/musicRegistry";
import { measureAudioDuration, syncBeatsToTTS } from "../../core/syncBeatsToTTs";
import { serverFetch } from "../../services/serverApi";

const TTS_VOICES = [
  { key: "female_warm",   label: "Female — Warm",     desc: "Nova · Warm & natural"     },
  { key: "female_clear",  label: "Female — Clear",    desc: "Shimmer · Clear & bright"  },
  { key: "male_deep",     label: "Male — Deep",       desc: "Onyx · Deep & authoritative"},
  { key: "male_neutral",  label: "Male — Neutral",    desc: "Echo · Balanced & clear"   },
  { key: "neutral_soft",  label: "Neutral — Soft",    desc: "Alloy · Soft & versatile"  },
  { key: "storyteller",   label: "Storyteller",       desc: "Fable · Expressive & warm" },
];

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

function Label({ children }) {
  return (
    <div className="text-[12px] font-bold tracking-widest uppercase text-[#7070a0] mb-[5px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

/* ── Voice / TTS track ── */
function TTSTrack({ audio, script, onUpload, onRemove, onVolumeChange, onGenerated, uploading, progress }) {
  const [playing,      setPlaying]      = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("female_warm");
  const [speed,         setSpeed]         = useState(1.0);
  const [error,         setError]         = useState("");
  const audioRef = useRef(null);
  const fileRef  = useRef(null);

  const ctxRef    = useRef(null);
  const sourceRef = useRef(null);

  const stopAudio = () => {
    try { sourceRef.current?.stop(); } catch (_) {}
    sourceRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
  };

  const togglePlay = async () => {
    if (!audio?.src) return;
    if (playing) {
      stopAudio();
      setPlaying(false);
      return;
    }

    // Create + resume AudioContext synchronously inside click handler —
    // BEFORE any awaits so Chrome doesn't suspend it under autoplay policy
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    // Kick it alive now while we're still in the user-gesture stack
    await ctx.resume();

    try {
      setPlaying(true);

      // Read volume FRESH from store — avoids stale closure if slider was moved rapidly
      const liveVol = useProjectStore.getState().project?.audio?.tts?.volume ?? audio.volume ?? 1;
      console.log("[TTS preview] gain =", liveVol, "src =", audio.src);

      const resp    = await fetch(audio.src);
      const buf     = await resp.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);

      // Resume again after async gap — Chrome can re-suspend
      if (ctx.state !== "running") await ctx.resume();

      if (!ctxRef.current) return; // user stopped while loading

      const source = ctx.createBufferSource();
      source.buffer = decoded;

      const gain = ctx.createGain();
      gain.gain.value = liveVol;

      source.connect(gain);
      gain.connect(ctx.destination);

      sourceRef.current = source;
      source.start(ctx.currentTime);
      source.onended = () => { setPlaying(false); ctx.close(); ctxRef.current = null; };
    } catch (err) {
      console.error("[TTS preview]", err);
      setPlaying(false);
      ctx.close();
      ctxRef.current = null;
    }
  };

  const handleRemove = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    onRemove();
  };

  const handleGenerate = async () => {
    if (!script?.trim()) { setError("No script found in project."); return; }
    setError("");
    setGenerating(true);
    try {
      const res = await serverFetch("/api/generate-tts", {
        method: "POST",
        body:   JSON.stringify({ script, voice: selectedVoice, speed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "TTS generation failed");
      // Server uploads directly to Supabase and returns a permanent URL — use it as-is
      onGenerated({ src: data.url, volume: 2, generated: true, voice: selectedVoice });
      setShowGenerate(false);
    } catch (e) {
      setError(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[20px] font-bold text-[#e8e8f0]">Voice / TTS</span>
        <div className="flex items-center gap-2">
          {audio?.src && (
            <button onClick={handleRemove}
              className="text-[13px] text-[#f87171] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer">
              Remove
            </button>
          )}
        </div>
      </div>

      {!audio?.src ? (
        <div className="flex flex-col gap-2">
          {/* Generate button */}
          <button
            onClick={() => setShowGenerate(s => !s)}
            className={`w-full py-[11px] rounded-[10px] text-[14px] font-bold transition-all cursor-pointer border-0
              ${showGenerate
                ? "bg-[#7c5cfc] text-white"
                : "bg-[rgba(124,92,252,0.12)] text-[#a78fff] hover:bg-[rgba(124,92,252,0.2)]"}`}>
            ✨ Generate Voice with AI
          </button>

          {/* Generate panel */}
          {showGenerate && (
            <div className="flex flex-col gap-3 p-4 rounded-[12px] border border-[rgba(124,92,252,0.2)] bg-[#0d0d1a]">

              {/* Voice picker */}
              <div>
                <Label>Voice</Label>
                <div className="flex flex-col gap-[5px]">
                  {TTS_VOICES.map(v => (
                    <button key={v.key}
                      onClick={() => setSelectedVoice(v.key)}
                      className={`flex items-center justify-between px-3 py-[8px] rounded-[8px] border transition-all cursor-pointer text-left
                        ${selectedVoice === v.key
                          ? "border-[#7c5cfc] bg-[#16163a]"
                          : "border-[rgba(255,255,255,0.07)] bg-[#111118] hover:border-[rgba(255,255,255,0.15)]"}`}>
                      <span className="text-[13px] font-semibold text-[#e8e8f0]">{v.label}</span>
                      <span className="text-[11px] text-[#55556a]">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed */}
              <div>
                <div className="flex justify-between mb-[4px]">
                  <Label>Speed</Label>
                  <span className="text-[12px] font-mono text-[#7070a0]">{speed.toFixed(1)}x</span>
                </div>
                <input type="range" min={0.75} max={1.5} step={0.05} value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
                <div className="flex justify-between text-[10px] text-[#55556a] mt-1">
                  <span>Slower</span><span>Normal</span><span>Faster</span>
                </div>
              </div>

              {/* Script preview */}
              <div>
                <Label>Script</Label>
                <div className="text-[12px] text-[#7070a0] bg-[#111118] rounded-[8px] p-3 max-h-[80px] overflow-y-auto leading-relaxed">
                  {script?.slice(0, 200)}{script?.length > 200 ? "..." : ""}
                </div>
              </div>

              {error && (
                <div className="text-[12px] text-[#f87171]">{error}</div>
              )}

              <button onClick={handleGenerate} disabled={generating}
                className="w-full py-[10px] rounded-[9px] bg-[#7c5cfc] hover:bg-[#6a4aed] text-white text-[14px] font-bold transition-all cursor-pointer border-0 disabled:opacity-50">
                {generating ? "Generating..." : "Generate Voice"}
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.06)]" />
            <span className="text-[11px] text-[#55556a]">or</span>
            <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.06)]" />
          </div>

          {/* Upload */}
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
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#111118]">
          {audio.generated && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-[2px] rounded-full bg-[rgba(124,92,252,0.15)] text-[#a78fff] font-semibold">AI Generated</span>
              <span className="text-[11px] text-[#55556a]">{TTS_VOICES.find(v => v.key === audio.voice)?.label || audio.voice}</span>
            </div>
          )}
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
            <input type="range" min={0} max={6} step={0.01} value={audio.volume ?? 1}
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
  const [playing, setPlaying] = useState(false);
  const [tab, setTab]         = useState("library");
  const audioRef = useRef(null);
  const fileRef  = useRef(null);

  const currentKey = audio?.musicKey || null;

  const togglePlay = (src) => {
    const url = src || audio?.src;
    if (!url) return;
    if (playing) { audioRef.current?.pause(); setPlaying(false); return; }
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new window.Audio(url);
    audioRef.current.volume = audio?.volume ?? 0.12;
    audioRef.current.play();
    audioRef.current.onended = () => setPlaying(false);
    setPlaying(true);
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
        <span className="text-[20px] font-bold text-[#e8e8f0]">Background Music</span>
        {audio?.src && (
          <button onClick={handleRemove}
            className="text-[13px] text-[#f87171] hover:text-[#ff6b6b] bg-transparent border-0 cursor-pointer">
            Remove
          </button>
        )}
      </div>

      <div className="flex gap-[3px] bg-[#111118] border border-[rgba(255,255,255,0.07)] rounded-[8px] p-[3px]">
        {[["library","Library"],["upload","Upload"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-[6px] rounded-[6px] text-[13px] font-semibold transition-all
              ${tab === key ? "bg-[#1c1c28] text-[#e8e8f0]" : "text-[#55556a] hover:text-[#9494a8]"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <div className="flex flex-col gap-[6px]">
          {MUSIC_KEYS.map(key => {
            const track      = MUSIC_LIBRARY[key];
            const isActive   = currentKey === key;
            const previewUrl = MUSIC_PREVIEW_URLS[key];
            return (
              <div key={key}
                className={`flex items-center gap-3 px-3 py-[10px] rounded-[10px] border cursor-pointer transition-all
                  ${isActive ? "border-[#7c5cfc] bg-[#16163a]" : "border-[rgba(255,255,255,0.07)] bg-[#111118] hover:border-[rgba(255,255,255,0.15)]"}`}
                onClick={() => onSelectLibrary(key)}>
                <button onClick={e => { e.stopPropagation(); togglePlay(previewUrl); }}
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
                {isActive && <div className="w-[8px] h-[8px] rounded-full bg-[#7c5cfc] shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

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

      {audio?.src && (
        <div className="p-3 rounded-[10px] border border-[rgba(255,255,255,0.07)] bg-[#111118]">
          <div className="flex justify-between mb-[4px]">
            <Label>Volume</Label>
            <span className="text-[12px] font-mono text-[#7070a0]">{Math.round((audio.volume ?? 0.12) * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={audio.volume ?? 0.12}
            onChange={e => onVolumeChange(Number(e.target.value))}
            className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
        </div>
      )}
    </div>
  );
}

/* ── Shared sync helper — auto-called after TTS set ── */
async function autoSyncBeats(ttsSrc, project) {
  if (!ttsSrc || !project) return null;
  try {
    const duration = await measureAudioDuration(ttsSrc);
    const synced   = syncBeatsToTTS(project.beats, duration);
    return { beats: synced, duration };
  } catch (e) {
    console.error("Auto-sync failed", e);
    return null;
  }
}

/* ── Main export ── */
export default function AudioSection() {
  const project           = useProjectStore((s) => s.project);
  const setProject        = useProjectStore((s) => s.setProject);
  const databaseId        = useProjectStore((s) => s.databaseId);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  const [uploading, setUploading] = useState({ tts: false, music: false });
  const [progress,  setProgress]  = useState({ tts: 0,     music: 0    });
  const [syncing,   setSyncing]   = useState(false);
  const [syncMsg,   setSyncMsg]   = useState("");

  if (!project) return null;

  const audio  = project.audio  || { tts: null, music: null };
  const script = project.script?.text || "";

  const uploadAudio = async (file, type) => {
    if (!file) return;
    setUploading(p => ({ ...p, [type]: true }));
    setProgress(p  => ({ ...p, [type]: 0   }));
    try {
      const formData = new FormData();
      formData.append("audio", file);
      const compressedRes = await serverFetch("/api/compress-audio", { method: "POST", body: formData });
      const blob = await compressedRes.blob();
      const compressedFile = new File([blob], "compressed.m4a", { type: "audio/mp4" });
      const uploaded = await uploadUserAsset(compressedFile, null, pct => setProgress(p => ({ ...p, [type]: pct })));

      const newAudio = { ...audio, [type]: { src: uploaded.url, volume: type === "music" ? 0.12 : 1 } };
      updateProjectMeta({ audio: newAudio });

      // Auto-sync beats when TTS is uploaded
      if (type === "tts") {
        setSyncing(true);
        setSyncMsg("Auto-syncing beats...");
        const result = await autoSyncBeats(uploaded.url, project);
        if (result) {
          const newProject = { ...project, audio: newAudio, beats: result.beats };
          setProject(newProject);
          const { updateProject } = await import("../../services/projects/projectService");
          if (databaseId) await updateProject(databaseId, newProject);
          setSyncMsg(`✓ Auto-synced to ${result.duration.toFixed(1)}s`);
        }
        setSyncing(false);
      }
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
      audio: { ...audio, music: { src: MUSIC_PREVIEW_URLS[key], musicKey: key, volume: 0.12 } },
    });
  };

  const removeAudio = (type) => updateProjectMeta({ audio: { ...audio, [type]: null } });

  const syncToTTS = async () => {
    if (!audio?.tts?.src) return;
    setSyncing(true);
    setSyncMsg("");
    const result = await autoSyncBeats(audio.tts.src, project);
    if (result) {
      const newProject = { ...project, beats: result.beats };
      setProject(newProject);
      const { updateProject } = await import("../../services/projects/projectService");
      if (databaseId) await updateProject(databaseId, newProject);
      setSyncMsg(`✓ Synced to ${result.duration.toFixed(1)}s TTS`);
    } else {
      setSyncMsg("Sync failed — check TTS audio");
    }
    setSyncing(false);
  };

  const setVolume   = (type, volume) =>
    updateProjectMeta({ audio: { ...audio, [type]: { ...audio[type], volume } } });

  return (
    <div className="w-[94%] overflow-y-auto bg-[#0b0b10] p-10">
      <div className="flex flex-col gap-8">

        <TTSTrack
          audio={audio?.tts}
          script={script}
          onUpload={f => uploadAudio(f, "tts")}
          onRemove={() => removeAudio("tts")}
          onVolumeChange={v => setVolume("tts", v)}
        onGenerated={async (ttsData) => {
          const newAudio = { ...audio, tts: ttsData };
          updateProjectMeta({ audio: newAudio });
          // Auto-sync beats to new TTS duration
          setSyncing(true);
          setSyncMsg("Auto-syncing beats...");
          const result = await autoSyncBeats(ttsData.src, project);
          if (result) {
            const newProject = { ...project, audio: newAudio, beats: result.beats };
            setProject(newProject);
            const { updateProject } = await import("../../services/projects/projectService");
            if (databaseId) await updateProject(databaseId, newProject);
            setSyncMsg(`✓ Auto-synced to ${result.duration.toFixed(1)}s`);
          }
          setSyncing(false);
        }}
          uploading={uploading.tts}
          progress={progress.tts}
        />

        {/* Sync beats to TTS */}
        {audio?.tts?.src && (
          <div className="flex flex-col gap-2">
            <button onClick={syncToTTS} disabled={syncing}
              className="w-full py-[10px] rounded-[10px] bg-[rgba(45,212,191,0.1)] border border-[rgba(45,212,191,0.2)] text-[#2dd4bf] text-[14px] font-bold hover:bg-[rgba(45,212,191,0.15)] transition-all cursor-pointer disabled:opacity-50">
              {syncing ? "Syncing..." : "⟳ Sync Beats to TTS Duration"}
            </button>
            {syncMsg && <div className="text-[12px] text-center text-[#2dd4bf]">{syncMsg}</div>}
          </div>
        )}

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