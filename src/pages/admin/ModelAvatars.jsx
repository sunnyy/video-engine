/**
 * ModelAvatars.jsx — Admin page for generating and managing AI model avatars
 * /admin/model-avatars
 */
import { useState, useEffect, useRef } from "react";
import { serverFetch } from "../../services/serverApi";
import AdminLayout from "./AdminLayout";

const THUMB_W = 160;
const THUMB_H = Math.round(THUMB_W * 16 / 9);

const GENDERS    = ["female", "male", "child_girl", "child_boy"];
const SKIN_TONES = ["light", "medium_light", "medium", "medium_dark", "dark"];
const AGE_GROUPS = ["adult", "teen", "child"];

const GENDER_COLORS = {
  female:      "#f472b6",
  male:        "#60a5fa",
  child_girl:  "#fb7185",
  child_boy:   "#34d399",
};

const DEFAULT_PROMPT = `Use the attached image only as loose inspiration for photographic quality, framing, realism level, styling tone, and overall production standard.

Do not copy the face, identity, bone structure, eye shape, nose shape, lips, hairstyle, skin tone, ethnicity, facial proportions, or recognizable traits from the reference.

Generate a completely new person with a distinctly different identity, unique facial structure, different bone proportions, original facial features, and a clearly separate appearance.

The result must feel inspired only by the production quality and visual polish of the reference — never by the person in it.

Avoid face similarity, identity carryover, same-person variations, or resemblance to the reference subject.

Create a highly realistic commercial portrait of a real human with natural skin texture, realistic pores, authentic asymmetry, lifelike eyes, subtle imperfections, and believable facial detail.

The person should look like a genuine photographed human, not AI-generated.

Avoid plastic skin, over-smoothing, uncanny symmetry, synthetic beauty, exaggerated perfection, or artificial facial features.

Professional commercial lighting, premium studio portrait, waist-up framing, clean composition, sharp focus, natural depth, photorealistic quality.

This generated person becomes the fixed identity for the shot.

Preserve the same identity consistently within this image: same face structure, same skin texture, same facial proportions, same hairstyle, same natural expression, and same overall appearance throughout the render.

Create a hyper-realistic candid lifestyle portrait of this person sitting at a cozy modern café with warm ambient lighting and soft brick walls in the background.

She is wearing a fitted black sleeveless top with beige trim detailing that naturally shows mild, realistic cleavage due to the fit of the garment, styled in a casual yet chic manner.

Her long straight hair falls naturally over her shoulders, and she gently tucks it behind her ear with one hand while looking toward camera with a soft, content smile.

Include subtle accessories like minimal bracelets for a natural everyday look.

Background should feature softly blurred café tables, warm hanging lights, and a relaxed social atmosphere.

Lighting should be warm and diffused, enhancing skin texture and maintaining realistic color tones.

Photography style: high-resolution candid portrait, shallow depth of field, sharp focus on subject, natural color grading, cozy modern aesthetic, premium lifestyle photography.`;

const C = {
  card:  { background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" },
  inp:   { padding: "8px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  sel:   { padding: "8px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:   { fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnP:  { padding: "10px 22px", background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnG:  { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnS:  { padding: "7px 14px", background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  badge: (color) => ({ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${color}22`, color, border: `1px solid ${color}44` }),
};

/* ── MetadataForm ── */
function MetadataForm({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div>
        <label style={C.lbl}>Gender</label>
        <select value={value.gender} onChange={e => onChange({ ...value, gender: e.target.value })} style={C.sel}>
          <option value="">— select —</option>
          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <label style={C.lbl}>Skin Tone</label>
        <select value={value.skin_tone} onChange={e => onChange({ ...value, skin_tone: e.target.value })} style={C.sel}>
          <option value="">— select —</option>
          {SKIN_TONES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>
      <div>
        <label style={C.lbl}>Age Group</label>
        <select value={value.age_group} onChange={e => onChange({ ...value, age_group: e.target.value })} style={C.sel}>
          <option value="">— select —</option>
          {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label style={C.lbl}>Style Notes</label>
        <input type="text" placeholder="e.g. Indian, professional" value={value.style_notes} onChange={e => onChange({ ...value, style_notes: e.target.value })} style={C.inp} />
      </div>
    </div>
  );
}

/* ── AvatarCard ── */
function AvatarCard({ avatar, onToggle, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const gc = GENDER_COLORS[avatar.gender] || "#a78bfa";

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    setDeleting(true);
    try {
      await serverFetch(`/api/admin/model-avatars/${avatar.id}`, { method: "DELETE" });
      onDelete(avatar.id);
    } catch {} finally { setDeleting(false); }
  };

  return (
    <div style={{ ...C.card, opacity: avatar.is_active ? 1 : 0.5 }}>
      <div style={{ width: "100%", aspectRatio: "9/16", background: "#0b0b10", overflow: "hidden" }}>
        <img src={avatar.url} alt={avatar.gender} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={C.badge(gc)}>{avatar.gender}</span>
          <span style={C.badge("#a78bfa")}>{avatar.skin_tone?.replace("_", " ")}</span>
          <span style={C.badge("#f5c518")}>{avatar.age_group}</span>
        </div>
        {avatar.style_notes && (
          <div style={{ fontSize: 10, color: "#666", marginBottom: 8 }}>{avatar.style_notes}</div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onToggle(avatar.id, !avatar.is_active)}
            style={{ flex: 1, padding: "5px 0", fontSize: 10, fontWeight: 700, borderRadius: 6, cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)", background: avatar.is_active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", color: avatar.is_active ? "#22c55e" : "#666" }}
          >
            {avatar.is_active ? "Active" : "Inactive"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ padding: "5px 10px", fontSize: 10, borderRadius: 6, cursor: "pointer", border: confirming ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)", background: confirming ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)", color: confirming ? "#f87171" : "#555" }}
          >
            {deleting ? "…" : confirming ? "Sure?" : "✕"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══ Main Component ══════════════════════════════════════════════ */
export default function ModelAvatars() {
  // Avatar list
  const [avatars,      setAvatars]      = useState([]);
  const [listLoading,  setListLoading]  = useState(true);
  const [genderFilter, setGenderFilter] = useState("All");

  // Generate section
  const [genPrompt,    setGenPrompt]    = useState(DEFAULT_PROMPT);
  const [refUrl,       setRefUrl]       = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [genErr,       setGenErr]       = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [approving,    setApproving]    = useState(false);
  const [genMeta,      setGenMeta]      = useState({ gender: "", skin_tone: "", age_group: "", style_notes: "" });
  const [showGenMeta,  setShowGenMeta]  = useState(false);
  const genFileRef = useRef();

  // Upload section
  const [uploadUrl,      setUploadUrl]      = useState("");
  const [uploadMeta,     setUploadMeta]     = useState({ gender: "", skin_tone: "", age_group: "", style_notes: "" });
  const [uploadPreview,  setUploadPreview]  = useState("");
  const [uploadSaving,   setUploadSaving]   = useState(false);
  const [uploadUploading, setUploadUploading] = useState(false);  // file upload in progress
  const [uploadIsStored, setUploadIsStored] = useState(false);    // already in our storage
  const [uploadErr,      setUploadErr]      = useState("");
  const uploadFileRef = useRef();

  /* ── Fetch avatar list ── */
  useEffect(() => {
    serverFetch("/api/admin/model-avatars")
      .then(r => r.json())
      .then(d => setAvatars(d.avatars || []))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []);

  /* ── Server-side file upload to system-assets (bypasses client RLS) ── */
  async function uploadFileToStorage(file, prefix = "models/uploads") {
    const form = new FormData();
    form.append("file", file);
    form.append("prefix", prefix);
    const res = await serverFetch("/api/admin/upload-system-asset", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  /* ── Generate section handlers ── */
  async function handleGenRefFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFileToStorage(file);
      setRefUrl(url);
    } catch (err) { setGenErr(err.message); }
  }

  async function handleGenerate() {
    if (!refUrl || !genPrompt.trim()) { setGenErr("Reference photo and prompt are required."); return; }
    setGenerating(true); setGenErr(""); setGeneratedUrl(""); setShowGenMeta(false);
    try {
      const res  = await serverFetch("/api/admin/model-avatars/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageUrl: refUrl, prompt: genPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGeneratedUrl(data.imageUrl);
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
  }

  async function handleApproveGen() {
    const { gender, skin_tone, age_group } = genMeta;
    if (!gender || !skin_tone || !age_group) { setGenErr("Please fill in all metadata fields."); return; }
    setApproving(true);
    try {
      const res  = await serverFetch("/api/admin/model-avatars/approve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageUrl: generatedUrl, ...genMeta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      setAvatars(prev => [data.avatar, ...prev]);
      setGeneratedUrl(""); setShowGenMeta(false); setGenMeta({ gender: "", skin_tone: "", age_group: "", style_notes: "" });
    } catch (e) { setGenErr(e.message); }
    setApproving(false);
  }

  /* ── Upload section handlers ── */
  async function handleUploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPreview(URL.createObjectURL(file));
    setUploadUrl(""); setUploadIsStored(false); setUploadErr("");
    setUploadUploading(true);
    try {
      const url = await uploadFileToStorage(file);
      setUploadUrl(url);
      setUploadIsStored(true);
    } catch (err) { setUploadErr(err.message); }
    finally { setUploadUploading(false); }
  }

  async function handleUploadSave() {
    const { gender, skin_tone, age_group } = uploadMeta;
    if (!uploadUrl || !gender || !skin_tone || !age_group) { setUploadErr("Image and all metadata fields are required."); return; }
    setUploadSaving(true); setUploadErr("");
    try {
      // If not yet in our storage (pasted external URL), proxy it first
      let finalUrl = uploadUrl;
      if (!uploadIsStored) {
        const proxyRes  = await serverFetch("/api/admin/model-avatars/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: uploadUrl }) });
        const proxyData = await proxyRes.json();
        if (!proxyRes.ok) throw new Error(proxyData.error || "Upload failed");
        finalUrl = proxyData.imageUrl;
      }

      const approveRes  = await serverFetch("/api/admin/model-avatars/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: finalUrl, ...uploadMeta }) });
      const approveData = await approveRes.json();
      if (!approveRes.ok) throw new Error(approveData.error || "Save failed");

      setAvatars(prev => [approveData.avatar, ...prev]);
      setUploadUrl(""); setUploadPreview(""); setUploadIsStored(false);
      setUploadMeta({ gender: "", skin_tone: "", age_group: "", style_notes: "" });
    } catch (e) { setUploadErr(e.message); }
    setUploadSaving(false);
  }

  /* ── Avatar list handlers ── */
  function handleToggle(id, is_active) {
    serverFetch(`/api/admin/model-avatars/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_active }),
    }).catch(() => {});
    setAvatars(prev => prev.map(a => a.id === id ? { ...a, is_active } : a));
  }

  function handleDelete(id) {
    setAvatars(prev => prev.filter(a => a.id !== id));
  }

  const FILTER_TABS = ["All", "Female", "Male", "Children"];
  const filteredAvatars = avatars.filter(a => {
    if (genderFilter === "All")      return true;
    if (genderFilter === "Female")   return a.gender === "female";
    if (genderFilter === "Male")     return a.gender === "male";
    if (genderFilter === "Children") return a.gender === "child_girl" || a.gender === "child_boy";
    return true;
  });

  /* ══ Render ══════════════════════════════════════════════════ */
  return (
    <AdminLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#e8e8f0", margin: 0, fontFamily: "'Outfit',sans-serif" }}>
            Model Avatars
          </h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
            Generate and manage AI model references used in Product Ad Studio
          </p>
        </div>

        {/* ── Section 1: Generate ── */}
        <section style={{ ...C.card, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", marginBottom: 16 }}>Generate New Avatar</div>

          <div style={{ display: "grid", gridTemplateColumns: generatedUrl ? "1fr auto" : "1fr", gap: 20 }}>
            <div>
              {/* Prompt */}
              <div style={{ marginBottom: 14 }}>
                <label style={C.lbl}>Generation Prompt</label>
                <textarea
                  value={genPrompt}
                  onChange={e => setGenPrompt(e.target.value)}
                  rows={5}
                  style={{ ...C.inp, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>

              {/* Reference photo */}
              <div style={{ marginBottom: 14 }}>
                <label style={C.lbl}>Reference Photo</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Paste image URL…"
                    value={refUrl}
                    onChange={e => setRefUrl(e.target.value)}
                    style={{ ...C.inp, flex: 1 }}
                  />
                  <button onClick={() => genFileRef.current?.click()} style={{ ...C.btnG, whiteSpace: "nowrap", flexShrink: 0 }}>
                    Upload File
                  </button>
                </div>
                <input ref={genFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleGenRefFile} />
                {refUrl && (
                  <img src={refUrl} alt="reference" style={{ marginTop: 8, height: 60, borderRadius: 6, objectFit: "cover" }} />
                )}
              </div>

              {genErr && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>✕ {genErr}</div>}

              <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnP, opacity: generating ? 0.6 : 1 }}>
                {generating ? "Generating…" : "Generate Avatar"}
              </button>
            </div>

            {/* Generated preview */}
            {generatedUrl && (
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: THUMB_W, height: THUMB_H, borderRadius: 8, overflow: "hidden", background: "#0b0b10", marginBottom: 10 }}>
                  <img src={generatedUrl} alt="generated" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => setShowGenMeta(true)} style={C.btnS}>✓ Approve</button>
                  <button onClick={() => { setGeneratedUrl(""); setShowGenMeta(false); }} style={{ ...C.btnG, padding: "7px 14px", fontSize: 12 }}>✕ Reject</button>
                  <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, padding: "7px 14px", fontSize: 12, opacity: generating ? 0.5 : 1 }}>↺ Regen</button>
                </div>
              </div>
            )}
          </div>

          {/* Approve metadata form */}
          {showGenMeta && generatedUrl && (
            <div style={{ marginTop: 20, padding: 16, background: "#0d0d14", borderRadius: 10, border: "1px solid rgba(124,92,252,0.2)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 12 }}>Avatar Metadata</div>
              <MetadataForm value={genMeta} onChange={setGenMeta} />
              <button
                onClick={handleApproveGen}
                disabled={approving}
                style={{ ...C.btnP, marginTop: 14, opacity: approving ? 0.6 : 1 }}
              >
                {approving ? "Saving…" : "Save Avatar"}
              </button>
            </div>
          )}
        </section>

        {/* ── Section 2: Direct Upload ── */}
        <section style={{ ...C.card, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", marginBottom: 16 }}>Direct Upload</div>

          <div style={{ display: "grid", gridTemplateColumns: uploadPreview ? "1fr auto" : "1fr", gap: 20 }}>
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={C.lbl}>Image</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Paste image URL…"
                    value={uploadUrl}
                    onChange={e => { setUploadUrl(e.target.value); setUploadPreview(e.target.value); }}
                    style={{ ...C.inp, flex: 1 }}
                  />
                  <button onClick={() => uploadFileRef.current?.click()} style={{ ...C.btnG, whiteSpace: "nowrap", flexShrink: 0 }}>
                    Upload File
                  </button>
                </div>
                <input ref={uploadFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUploadFile} />
              </div>

              <MetadataForm value={uploadMeta} onChange={setUploadMeta} />

              {uploadUploading && <div style={{ color: "#a78bfa", fontSize: 12, margin: "10px 0" }}>Uploading image…</div>}
              {uploadErr && <div style={{ color: "#f87171", fontSize: 12, margin: "10px 0" }}>✕ {uploadErr}</div>}

              <button onClick={handleUploadSave} disabled={uploadSaving || uploadUploading} style={{ ...C.btnP, marginTop: 14, opacity: (uploadSaving || uploadUploading) ? 0.6 : 1 }}>
                {uploadSaving ? "Saving…" : "Save Avatar"}
              </button>
            </div>

            {uploadPreview && (
              <div style={{ width: THUMB_W, height: THUMB_H, borderRadius: 8, overflow: "hidden", background: "#0b0b10", flexShrink: 0 }}>
                <img src={uploadPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
          </div>
        </section>

        {/* ── Section 3: Avatar Grid ── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0" }}>
              Avatars {avatars.length > 0 && `(${avatars.length})`}
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {FILTER_TABS.map(f => (
                <button
                  key={f}
                  onClick={() => setGenderFilter(f)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: genderFilter === f ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.04)",
                    border:     `1px solid ${genderFilter === f ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.08)"}`,
                    color:      genderFilter === f ? "#a78bfa" : "#666",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {listLoading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 13 }}>Loading…</div>
          )}

          {!listLoading && filteredAvatars.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#444", fontSize: 13 }}>
              No avatars yet — generate or upload one above
            </div>
          )}

          {!listLoading && filteredAvatars.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {filteredAvatars.map(avatar => (
                <AvatarCard
                  key={avatar.id}
                  avatar={avatar}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </AdminLayout>
  );
}
