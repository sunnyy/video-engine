/**
 * MusicLibrary.jsx
 * Admin page for managing music tracks in Supabase (music_tracks table + media/music/ storage).
 */
import { useEffect, useRef, useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabase";

async function fetchTracks() {
  const { data, error } = await supabase
    .from("music_tracks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

const MOODS    = ["upbeat", "chill", "cinematic", "playful", "epic", "peaceful", "devotional", "transcendent", "warm", "cheerful", "professional", "futuristic", "confident", "wanderlust", "neutral", "curious", "quirky", "silly", "inspirational", "driven", "elegant", "fresh", "tense", "dramatic", "aggressive", "dark", "energetic"];
const ENERGIES = ["low", "medium", "high"];

function TrackRow({ track, onToggle, onDelete, toggling, deleting }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!track.public_url) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new window.Audio(track.public_url);
      audioRef.current.volume = 0.6;
      audioRef.current.play();
      audioRef.current.onended = () => setPlaying(false);
      setPlaying(true);
    }
  };

  const energyColor = track.energy === "high" ? "#f97316" : track.energy === "low" ? "#3b9eff" : "#888";

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <button onClick={togglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-0 cursor-pointer transition-colors shrink-0
            ${playing ? "bg-[#7c5cfc] text-white" : "bg-[#1c1c28] text-[#888] hover:bg-[#7c5cfc] hover:text-white"}`}>
          {playing ? "■" : "▶"}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-mono text-[#a78bfa]">{track.key}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-white font-medium">{track.title}</div>
        {track.artist && <div className="text-xs text-[#666]">{track.artist}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-[#888]">{track.mood || "—"}</td>
      <td className="px-4 py-3">
        {track.energy && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color: energyColor, background: energyColor + "22" }}>
            {track.energy}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-[#888] font-mono">{track.bpm || "—"}</td>
      <td className="px-4 py-3">
        <button onClick={() => onToggle(track)} disabled={toggling === track.id}
          className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer border transition-colors disabled:opacity-50
            ${track.is_active
              ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/20"
              : "bg-white/[0.04] border-white/[0.1] text-[#555] hover:text-[#aaa]"}`}>
          {toggling === track.id ? "…" : track.is_active ? "Active" : "Inactive"}
        </button>
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onDelete(track)} disabled={deleting === track.id}
          className="px-3 py-1 bg-[#f97316]/10 border border-[#f97316]/30 rounded-md text-[#f97316] text-xs cursor-pointer hover:bg-[#f97316]/20 transition-colors disabled:opacity-50">
          {deleting === track.id ? "…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}

function UploadForm({ onUploaded }) {
  const [file,     setFile]     = useState(null);
  const [key,      setKey]      = useState("");
  const [title,    setTitle]    = useState("");
  const [artist,   setArtist]   = useState("");
  const [mood,     setMood]     = useState("");
  const [energy,   setEnergy]   = useState("medium");
  const [bpm,      setBpm]      = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [error,     setError]     = useState("");
  const fileRef = useRef(null);

  const reset = () => {
    setFile(null); setKey(""); setTitle(""); setArtist(""); setMood(""); setEnergy("medium"); setBpm(""); setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) { setError("Select an MP3 file."); return; }
    if (!key.trim()) { setError("Key is required."); return; }
    if (!title.trim()) { setError("Title is required."); return; }
    setError(""); setUploading(true); setProgress(10);

    try {
      const storagePath = `music/${key.trim()}.mp3`;

      const { error: uploadErr } = await supabase.storage
        .from("user-assets")
        .upload(storagePath, file, { contentType: "audio/mpeg", upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);
      setProgress(60);

      const { data: { publicUrl } } = supabase.storage.from("user-assets").getPublicUrl(storagePath);
      setProgress(80);

      const { error: insertErr } = await supabase.from("music_tracks").insert([{
        key:          key.trim(),
        title:        title.trim(),
        artist:       artist.trim() || null,
        mood:         mood || null,
        energy:       energy || null,
        bpm:          bpm ? parseInt(bpm, 10) : null,
        storage_path: storagePath,
        public_url:   publicUrl,
        is_active:    true,
      }]);
      if (insertErr) throw new Error(insertErr.message);
      setProgress(100);
      reset();
      onUploaded();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const inp = "px-3 py-2 bg-[#111118] border border-white/[0.08] rounded-lg text-sm text-white outline-none focus:border-[#7c5cfc] placeholder-[#444]";

  return (
    <div className="bg-[#111118] border border-white/[0.08] rounded-xl p-5 mb-6">
      <div className="text-base font-semibold text-white mb-4">Add Track</div>

      {error && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg px-4 py-2 text-[#f97316] text-sm mb-4">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">Key *</div>
          <input value={key} onChange={e => setKey(e.target.value)} placeholder="eliveta_1"
            className={`${inp} w-full`} />
        </div>
        <div>
          <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">Title *</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Eliveta I"
            className={`${inp} w-full`} />
        </div>
        <div>
          <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">Artist</div>
          <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist name"
            className={`${inp} w-full`} />
        </div>
        <div>
          <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">BPM</div>
          <input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="128"
            className={`${inp} w-full`} />
        </div>
        <div>
          <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">Mood</div>
          <select value={mood} onChange={e => setMood(e.target.value)}
            className={`${inp} w-full cursor-pointer`}>
            <option value="">— none —</option>
            {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">Energy</div>
          <select value={energy} onChange={e => setEnergy(e.target.value)}
            className={`${inp} w-full cursor-pointer`}>
            {ENERGIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">MP3 File *</div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="audio/mpeg,audio/mp3,.mp3"
            onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-[#aaa] cursor-pointer hover:bg-white/[0.08] transition-colors">
            Choose File
          </button>
          <span className="text-sm text-[#666]">{file ? file.name : "No file chosen"}</span>
        </div>
        {uploading && (
          <div className="mt-2 h-1 bg-[#1c1c28] rounded overflow-hidden">
            <div className="h-full bg-[#7c5cfc] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={handleUpload} disabled={uploading}
          className="px-5 py-2 bg-[#7c5cfc] hover:bg-[#6a4aed] text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors disabled:opacity-50 border-0">
          {uploading ? "Uploading…" : "Upload & Save"}
        </button>
        {(file || key) && (
          <button onClick={reset} className="px-4 py-2 bg-transparent border border-white/[0.08] text-[#888] text-sm rounded-lg cursor-pointer hover:text-white transition-colors">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default function MusicLibrary() {
  const [tracks,   setTracks]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true); setError("");
    try { setTracks(await fetchTracks()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (track) => {
    setToggling(track.id);
    try {
      const { error: e } = await supabase
        .from("music_tracks")
        .update({ is_active: !track.is_active })
        .eq("id", track.id);
      if (e) throw new Error(e.message);
      setTracks(ts => ts.map(t => t.id === track.id ? { ...t, is_active: !t.is_active } : t));
    } catch (e) { alert("Update failed: " + e.message); }
    finally { setToggling(null); }
  };

  const handleDelete = async (track) => {
    if (!confirm(`Delete "${track.title}" (${track.key})?\nThis removes the file from storage and the database row.`)) return;
    setDeleting(track.id);
    try {
      if (track.storage_path) {
        await supabase.storage.from("user-assets").remove([track.storage_path]);
      }
      const { error: e } = await supabase.from("music_tracks").delete().eq("id", track.id);
      if (e) throw new Error(e.message);
      setTracks(ts => ts.filter(t => t.id !== track.id));
    } catch (e) { alert("Delete failed: " + e.message); }
    finally { setDeleting(null); }
  };

  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-1">Music Library</h1>
      <p className="text-[#888] text-lg mb-6">
        Manage background music tracks in Supabase Storage.
      </p>

      <UploadForm onUploaded={load} />

      {error && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-5">{error}</div>
      )}

      {loading ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : tracks.length === 0 ? (
        <div className="text-[#444] text-base py-16 text-center">
          No tracks yet. Upload one above.
        </div>
      ) : (
        <div className="bg-[#111118] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 text-xs text-[#555] border-b border-white/[0.06]">
            {tracks.length} track{tracks.length !== 1 ? "s" : ""}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[#555] uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Mood</th>
                  <th className="px-4 py-3">Energy</th>
                  <th className="px-4 py-3">BPM</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {tracks.map(track => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    toggling={toggling}
                    deleting={deleting}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
