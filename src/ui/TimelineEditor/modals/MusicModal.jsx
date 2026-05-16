import { useState, useEffect, useRef } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import { uploadUserAsset } from "../../../services/assets/uploadUserAsset";
import { showToast } from "../../Toast";
import EditorModal from "./EditorModal";
import { pickFile, getFileDuration, makeLayerAt } from "./helpers";
import { loadMusicLibrary } from "../../../core/registries/musicRegistry";

const MOODS = ["All", "energetic", "calm", "playful", "dramatic", "luxury"];
const MOOD_COLOR = {
  energetic: "#f97316",
  calm:      "#38bdf8",
  playful:   "#a3e635",
  dramatic:  "#c084fc",
  luxury:    "#fbbf24",
};

function fmtDur(s) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function MusicModal({ onClose }) {
  const project          = useTimelineStore((s) => s.project);
  const currentTime      = useTimelineStore((s) => s.currentTime);
  const projectId        = useTimelineStore((s) => s.projectId);
  const addLayer         = useTimelineStore((s) => s.addLayer);
  const addPendingFile   = useTimelineStore((s) => s.addPendingFile);
  const clearPendingFile = useTimelineStore((s) => s.clearPendingFile);

  const [library, setLibrary]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [moodFilter, setMoodFilter] = useState("All");
  const [search, setSearch]         = useState("");
  const [playingId, setPlayingId]   = useState(null);
  const [uploading, setUploading]   = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    loadMusicLibrary().then((lib) => { setLibrary(lib); setLoading(false); });
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; } };
  }, []);

  const allTracks = Object.values(library).flat();
  const filtered = allTracks.filter((t) => {
    if (moodFilter !== "All" && t.mood !== moodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title?.toLowerCase().includes(q) && !t.artist?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const togglePreview = (track) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    const url = track.preview_url || track.public_url;
    if (!url) return;
    const a = new Audio(url);
    a.play().catch(() => {});
    a.onended = () => setPlayingId(null);
    audioRef.current = a;
    setPlayingId(track.id);
  };

  const addMusicLayer = (track) => {
    if (audioRef.current) { audioRef.current.pause(); }
    const dur = track.duration || 30;
    const layer = makeLayerAt("audio", project, currentTime, dur, {
      src: track.public_url,
      name: track.title || "Music",
    });
    addLayer(layer);
    onClose();
  };

  const handleUpload = async () => {
    const file = await pickFile("audio/*");
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    let dur = 30;
    const d = await getFileDuration(file);
    if (d) dur = d;
    const layer = makeLayerAt("audio", project, currentTime, dur, { src: blobUrl, name: file.name });
    addPendingFile(layer.id, file);
    addLayer(layer);
    onClose();
    setUploading(true);
    try {
      const asset = await uploadUserAsset(file, "audio", null, "project", projectId);
      useTimelineStore.getState().updateLayer(layer.id, { src: asset.url });
      clearPendingFile(layer.id);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <EditorModal title="Music" onClose={onClose} width={560}>
      <button
        onClick={handleUpload}
        disabled={uploading}
        style={{
          width: "100%", marginBottom: 14,
          background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.35)",
          borderRadius: 7, color: "#34d399", fontSize: 13, fontWeight: 600,
          cursor: uploading ? "default" : "pointer", padding: "10px 0",
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? "Uploading…" : "+ Upload Music"}
      </button>

      <input
        placeholder="Search tracks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%", marginBottom: 10, boxSizing: "border-box",
          background: "#0d0d1e", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 7, color: "#e8e8f0", fontSize: 13, padding: "8px 12px", outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {MOODS.map((m) => {
          const active = moodFilter === m;
          const col = m === "All" ? "#7c5cfc" : (MOOD_COLOR[m] ?? "#7c5cfc");
          return (
            <button
              key={m}
              onClick={() => setMoodFilter(m)}
              style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                fontWeight: active ? 700 : 400,
                background: active ? `${col}22` : "transparent",
                border: `1px solid ${active ? col : "rgba(255,255,255,0.15)"}`,
                color: active ? col : "#9090b0",
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ color: "#44445a", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
          Loading library…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#44445a", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
          {allTracks.length === 0
            ? "No tracks in library yet — upload one above"
            : "No tracks match"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {filtered.map((track) => {
            const isPlaying = playingId === track.id;
            const moodCol = MOOD_COLOR[track.mood] ?? "#7c5cfc";
            return (
              <div
                key={track.id}
                onClick={() => addMusicLayer(track)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 10px", borderRadius: 7, cursor: "pointer",
                  border: "1px solid transparent", userSelect: "none",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                onMouseOut={(e)  => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); togglePreview(track); }}
                  title={isPlaying ? "Stop preview" : "Preview"}
                  style={{
                    width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: isPlaying ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)",
                    color: isPlaying ? "#34d399" : "#c0c0d8",
                    fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isPlaying ? "■" : "▶"}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {track.title}
                  </div>
                  {track.artist && (
                    <div style={{ fontSize: 11, color: "#7070a0", marginTop: 1 }}>{track.artist}</div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                    background: `${moodCol}20`, color: moodCol, textTransform: "capitalize",
                  }}>
                    {track.mood}
                  </span>
                  {track.bpm && (
                    <span style={{ fontSize: 11, color: "#55557a" }}>{track.bpm} bpm</span>
                  )}
                  {track.duration && (
                    <span style={{ fontSize: 11, color: "#55557a" }}>{fmtDur(track.duration)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EditorModal>
  );
}
