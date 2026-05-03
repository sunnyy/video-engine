import { useEffect, useRef, useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabase";
import { SFX_LIBRARY, SFX_KEYS } from "../../core/registries/sfxRegistry";

async function fetchUploaded() {
  const { data, error } = await supabase.from("sfx_tracks").select("*");
  if (error) throw new Error(error.message);
  return Object.fromEntries((data || []).map(r => [r.key, r]));
}

function SFXRow({ sfxKey, row, onDelete, onUpload, deleting, uploading }) {
  const [playing, setPlaying] = useState(false);
  const [file,    setFile]    = useState(null);
  const audioRef = useRef(null);
  const fileRef  = useRef(null);
  const sfx      = SFX_LIBRARY[sfxKey];
  const url      = row?.public_url || `/sfx/${sfxKey}.mp3`;
  const uploaded = !!row;

  const togglePlay = () => {
    if (playing) { audioRef.current?.pause(); setPlaying(false); return; }
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new window.Audio(url);
    audioRef.current.volume = 0.6;
    audioRef.current.play().catch(() => {});
    audioRef.current.onended = () => setPlaying(false);
    setPlaying(true);
  };

  const energyColor = sfx.energy === "high" ? "#f97316" : sfx.energy === "low" ? "#3b9eff" : "#888";

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
        <div className="text-sm font-mono text-[#a78bfa]">{sfxKey}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-white font-medium">{sfx.label}</div>
      </td>
      <td className="px-4 py-3 text-sm text-[#888]">{sfx.mood}</td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color: energyColor, background: energyColor + "22" }}>
          {sfx.energy}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[#888] font-mono">{sfx.duration}s</td>
      <td className="px-4 py-3">
        {uploaded ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]">Supabase</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#555]">Local only</span>
        )}
      </td>
      <td className="px-4 py-3">
        {uploaded ? (
          <button onClick={() => onDelete(sfxKey, row)} disabled={deleting === sfxKey}
            className="px-3 py-1 bg-[#f97316]/10 border border-[#f97316]/30 rounded-md text-[#f97316] text-xs cursor-pointer hover:bg-[#f97316]/20 transition-colors disabled:opacity-50">
            {deleting === sfxKey ? "…" : "Delete"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="audio/mpeg,audio/mp3,.mp3"
              onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
            {file ? (
              <button
                onClick={() => onUpload(sfxKey, file, () => { setFile(null); if (fileRef.current) fileRef.current.value = ""; })}
                disabled={uploading === sfxKey}
                className="px-3 py-1 bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 rounded-md text-[#a78bfa] text-xs cursor-pointer hover:bg-[#7c5cfc]/20 transition-colors disabled:opacity-50">
                {uploading === sfxKey ? "…" : "Upload"}
              </button>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-md text-[#555] text-xs cursor-pointer hover:text-[#aaa] transition-colors">
                Choose MP3
              </button>
            )}
            {file && <span className="text-[11px] text-[#555] truncate max-w-[90px]">{file.name}</span>}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function SFXLibrary() {
  const [uploaded,  setUploaded]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [deleting,  setDeleting]  = useState(null);
  const [uploading, setUploading] = useState(null);

  const load = async () => {
    setLoading(true); setError("");
    try { setUploaded(await fetchUploaded()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (sfxKey, file, onDone) => {
    setUploading(sfxKey);
    try {
      const storagePath = `sfx/${sfxKey}.mp3`;
      const { error: uploadErr } = await supabase.storage
        .from("user-assets")
        .upload(storagePath, file, { contentType: "audio/mpeg", upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage.from("user-assets").getPublicUrl(storagePath);
      const sfx = SFX_LIBRARY[sfxKey];

      const { error: upsertErr } = await supabase.from("sfx_tracks").upsert([{
        key:          sfxKey,
        title:        sfx.label,
        mood:         sfx.mood,
        energy:       sfx.energy,
        duration:     sfx.duration,
        storage_path: storagePath,
        public_url:   publicUrl,
        is_active:    true,
      }], { onConflict: "key" });
      if (upsertErr) throw new Error(upsertErr.message);

      onDone();
      await load();
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (sfxKey, row) => {
    if (!confirm(`Remove "${row.title}" from Supabase? Local fallback will still be used for preview.`)) return;
    setDeleting(sfxKey);
    try {
      if (row.storage_path) await supabase.storage.from("user-assets").remove([row.storage_path]);
      const { error: e } = await supabase.from("sfx_tracks").delete().eq("key", sfxKey);
      if (e) throw new Error(e.message);
      setUploaded(u => { const next = { ...u }; delete next[sfxKey]; return next; });
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const uploadedCount = Object.keys(uploaded).length;

  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-1">SFX Library</h1>
      <p className="text-[#888] text-lg mb-1">
        {SFX_KEYS.length} sounds in registry · {uploadedCount} uploaded to Supabase
      </p>
      <p className="text-[#555] text-sm mb-6">
        "Local only" = uses <code className="text-[#a78bfa]">public/sfx/</code> for browser preview only.
        Upload MP3s to Supabase so Railway renders can access them.
      </p>

      {error && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-5">{error}</div>
      )}

      {loading ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : (
        <div className="bg-[#111118] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-[#555] uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Mood</th>
                  <th className="px-4 py-3">Energy</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {SFX_KEYS.map(key => (
                  <SFXRow
                    key={key}
                    sfxKey={key}
                    row={uploaded[key] || null}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                    uploading={uploading}
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
