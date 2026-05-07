/**
 * Samples.jsx
 * Admin section for managing LandingPage service samples (images & videos).
 */
import { useEffect, useState, useRef } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

const SAMPLES_PER_PAGE = 20;

const SERVICES = [
  { key: "ai_videos", label: "AI Videos", icon: "🎬" },
  { key: "product_ads", label: "Product Ads", icon: "🛍️" },
  { key: "virtual_tryon", label: "Virtual Try-On", icon: "👗" },
  { key: "social_posts", label: "Social Posts", icon: "📱" },
  { key: "thumbnails", label: "Thumbnails", icon: "🖼" },
  { key: "posters", label: "Posters", icon: "🎨" },
  { key: "voiceover", label: "Voice Studio", icon: "🎙" },
  { key: "captions", label: "Caption Studio", icon: "💬" },
  { key: "transcription", label: "Speech to Text", icon: "📝" },
];

async function safeJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(`Server ${res.status}: ${text.slice(0, 120)}`);
  try { return JSON.parse(text); } catch { throw new Error("Invalid server response"); }
}

function SampleForm({ sample, onClose, onSaved }) {
  const isEdit = !!sample?.id;
  const [form, setForm] = useState(
    isEdit
      ? { type: sample.type || "image", src: sample.src || "", poster: sample.poster || "", service_key: sample.service_key || "", orientation: sample.orientation || "horizontal" }
      : { type: "image", src: "", poster: "", service_key: "", orientation: "horizontal" }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const posterInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileUpload = async (file, isPoster = false) => {
    if (!file || !form.service_key) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("service_key", form.service_key);
      fd.append("type", isPoster ? form.type : (file.type.startsWith("video") ? "video" : "image"));
      const res = await serverFetch("/api/admin/samples/upload", { method: "POST", body: fd });
      const d = await safeJson(res);
      if (isPoster) set("poster", d.url);
      else set("src", d.url);
    } catch (e) {
      setError("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.src || !form.service_key) {
      setError("Source URL and Service are required.");
      return;
    }
    if (form.type === "video" && !form.poster) {
      setError("Poster URL is required for video samples.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      const res = isEdit
        ? await serverFetch(`/api/admin/samples/${sample.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await serverFetch("/api/admin/samples", { method: "POST", body: JSON.stringify(payload) });
      await safeJson(res);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const F = "w-full px-3 py-2.5 bg-[#0d0d14] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#7c5cfc] transition-colors";
  const L = "text-xs text-[#888] font-medium mb-1";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000] p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#16161f] border border-white/10 rounded-2xl p-7 w-full max-w-[500px] flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{isEdit ? "Edit Sample" : "Add Sample"}</h3>
          <button type="button" onClick={onClose} className="text-[#555] hover:text-white text-xl cursor-pointer bg-transparent border-0">✕</button>
        </div>

        <div className="flex flex-col">
          <label className={L}>Service *</label>
          <select className={F} value={form.service_key} onChange={e => set("service_key", e.target.value)}>
            <option value="">Select a service</option>
            {SERVICES.map(s => (
              <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col flex-1">
            <label className={L}>Type *</label>
            <select className={F} value={form.type} onChange={e => set("type", e.target.value)}>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div className="flex flex-col flex-1">
            <label className={L}>Orientation *</label>
            <select className={F} value={form.orientation} onChange={e => set("orientation", e.target.value)}>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
              <option value="square">Square</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className={L}>Upload Source File</label>
          <input
            type="file"
            accept={form.type === "video" ? "video/*" : "image/*"}
            ref={fileInputRef}
            onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            disabled={uploading || !form.service_key}
            className="text-sm text-[#aaa]"
          />
          {uploading && <div className="text-xs text-[#7c5cfc] mt-1">Uploading...</div>}
        </div>

        <div className="flex flex-col">
          <label className={L}>Or Source URL</label>
          <input className={F} value={form.src} onChange={e => set("src", e.target.value)} placeholder="https://..." />
        </div>

        {form.type === "video" && (
          <>
            <div className="flex flex-col">
              <label className={L}>Upload Poster Image</label>
              <input
                type="file"
                accept="image/*"
                ref={posterInputRef}
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
                disabled={uploading || !form.service_key}
                className="text-sm text-[#aaa]"
              />
            </div>
            <div className="flex flex-col">
              <label className={L}>Or Poster URL</label>
              <input className={F} value={form.poster} onChange={e => set("poster", e.target.value)} placeholder="https://..." />
            </div>
          </>
        )}

        {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg px-4 py-2.5 text-[#f97316] text-sm">{error}</div>}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-transparent border border-white/10 rounded-lg text-[#888] text-sm cursor-pointer hover:bg-white/5">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || uploading}
            className="px-5 py-2 bg-[#7c5cfc] rounded-lg text-white font-semibold text-sm cursor-pointer disabled:opacity-50 hover:bg-[#6d4de8] transition-colors">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Sample"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Samples() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadSamples = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: SAMPLES_PER_PAGE });
      if (serviceFilter !== "all") params.set("service_key", serviceFilter);
      const res = await serverFetch(`/api/admin/samples?${params}`);
      const d = await safeJson(res);
      setSamples(d.samples || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSamples(); }, [serviceFilter]);

  const handleDelete = async (sample) => {
    if (!confirm(`Delete this sample?`)) return;
    setDeleting(sample.id);
    try {
      await serverFetch(`/api/admin/samples/${sample.id}`, { method: "DELETE" });
      setSamples(s => s.filter(x => x.id !== sample.id));
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const serviceLabels = { all: "All Services", ...Object.fromEntries(SERVICES.map(s => [s.key, s.label])) };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-1 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">Service Samples</h1>
        <button onClick={() => setModal({})}
          className="px-5 py-2.5 bg-[#7c5cfc]/20 border border-[#7c5cfc]/40 rounded-xl text-[#a78bfa] font-semibold text-sm cursor-pointer hover:bg-[#7c5cfc]/30 transition-colors">
          + Add Sample
        </button>
      </div>
      <p className="text-[#888] text-lg mb-6">Manage images and videos displayed on the landing page for each service. Files are stored in the <code>system-assets/samples</code> bucket.</p>

      <div className="flex gap-2 items-center mb-5 flex-wrap">
        <span className="text-sm text-[#666]">Filter:</span>
        {Object.entries(serviceLabels).map(([k, label]) => (
          <button key={k} onClick={() => setServiceFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors
              ${serviceFilter === k ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/40 text-[#a78bfa]" : "bg-transparent border-white/[0.07] text-[#555] hover:text-[#aaa]"}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-5">{error}</div>}

      {loading ? (
        <div className="text-[#666] text-base animate-pulse">Loading samples…</div>
      ) : samples.length === 0 ? (
        <div className="text-[#444] text-base bg-[#111118] border border-white/[0.06] rounded-2xl px-7 py-10 text-center">
          No samples yet. Click "Add Sample" to create one.
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ flexWrap: "nowrap" }}>
          {samples.filter(s => s.src).map(s => (
            <div key={s.id} className="bg-[#111118] border border-white/[0.06] rounded-xl overflow-hidden group relative flex-shrink-0" style={{ width: 200 }}>
              <div className="w-full aspect-video bg-[#0d0d14] flex items-center justify-center overflow-hidden">
                {s.type === "video" ? (
                  <video src={s.src} poster={s.poster} muted loop playsInline
                    className="w-full h-full object-contain" onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                    onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
                ) : (
                  <img src={s.src} alt="" className="w-full h-full object-contain" loading="lazy" />
                )}
              </div>
              <div className="p-3">
                <div className="text-xs text-[#aaa] uppercase tracking-wider">{serviceLabels[s.service_key] || s.service_key}</div>
                <div className="text-xs text-[#555] mt-1">{s.type === "video" ? "📹 Video" : "🖼 Image"}</div>
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => setModal({ sample: s })}
                  className="px-3 py-1.5 bg-white/10 rounded-lg text-white text-xs cursor-pointer hover:bg-white/20">
                  Edit
                </button>
                <button onClick={() => handleDelete(s)} disabled={deleting === s.id}
                  className="px-3 py-1.5 bg-[#f97316]/20 border border-[#f97316]/40 rounded-lg text-[#f97316] text-xs cursor-pointer hover:bg-[#f97316]/30 disabled:opacity-50">
                  {deleting === s.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <SampleForm
          sample={modal.sample || null}
          onClose={() => setModal(null)}
          onSaved={loadSamples}
        />
      )}
    </AdminLayout>
  );
}