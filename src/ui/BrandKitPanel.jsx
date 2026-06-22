import { useEffect, useRef, useState } from "react";
import { serverFetch } from "../services/serverApi";

/**
 * BrandKitPanel — the brand-kit form (logo, channel name, CTA, website, colors), with no
 * page chrome. Used by the standalone /brand-kit page and the Automation "Brand Kit" tab.
 * Self-contained: fetches and saves on its own.
 */

const T = { surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };
const EMPTY = { logo_url: "", channel_name: "", cta_text: "", website: "", primary_color: "#7c5cfc", secondary_color: "#22d3ee" };

export default function BrandKitPanel() {
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    serverFetch("/api/brand-kit").then(r => r.json()).then(d => {
      if (d?.brandKit) setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(d.brandKit).filter(([k]) => k in EMPTY)) });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await serverFetch("/api/brand-kit/logo", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Upload failed");
      set("logo_url", d.url);
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await serverFetch("/api/brand-kit", { method: "PUT", body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      setSaved(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const field = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, padding: "10px 12px", outline: "none", fontFamily: "inherit" };
  const label = { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6, display: "block" };

  if (loading) return <div style={{ color: T.faint, fontSize: 14 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 620 }}>
      <div>
        <span style={label}>Logo</span>
        <div onClick={() => !uploading && fileRef.current?.click()}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, border: `1.5px dashed ${form.logo_url ? T.accent + "66" : T.border}`, cursor: uploading ? "default" : "pointer", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 10, background: "#0a0a12", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {form.logo_url ? <img src={form.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 22, opacity: 0.4 }}>🖼</span>}
          </div>
          <span style={{ fontSize: 13, color: form.logo_url ? T.text : T.muted }}>
            {uploading ? "Uploading…" : form.logo_url ? "Logo set — click to replace" : "Upload a logo (PNG with transparency works best)"}
          </span>
          {form.logo_url && <button onClick={(e) => { e.stopPropagation(); set("logo_url", ""); }} style={{ marginLeft: "auto", fontSize: 12, color: T.faint, background: "none", border: "none", cursor: "pointer" }}>Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} style={{ display: "none" }} />
        </div>
      </div>

      <div><span style={label}>Channel name</span><input style={field} value={form.channel_name} onChange={(e) => set("channel_name", e.target.value)} placeholder="e.g. Vidquence" /></div>
      <div><span style={label}>Call to action (closing line)</span><input style={field} value={form.cta_text} onChange={(e) => set("cta_text", e.target.value)} placeholder="e.g. Follow for more" /></div>
      <div><span style={label}>Website (optional)</span><input style={field} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></div>

      <div style={{ display: "flex", gap: 16 }}>
        {[["Primary color", "primary_color"], ["Secondary color", "secondary_color"]].map(([lbl, key]) => (
          <div key={key} style={{ flex: 1 }}>
            <span style={label}>{lbl}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="color" value={form[key] || "#000000"} onChange={(e) => set(key, e.target.value)}
                style={{ width: 42, height: 42, padding: 0, border: `1px solid ${T.border}`, borderRadius: 8, background: "none", cursor: "pointer" }} />
              <input style={{ ...field, flex: 1 }} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder="#7c5cfc" />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: T.faint, marginTop: -8 }}>Colors are saved for upcoming features — videos currently use the logo and closing CTA.</div>

      {error && <div style={{ padding: "10px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: "#f87171" }}>{error}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
        <button onClick={save} disabled={saving}
          style={{ background: T.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 26px", borderRadius: 10, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
          {saving ? "Saving…" : "Save Brand Kit"}
        </button>
        {saved && <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>Saved ✓</span>}
      </div>
    </div>
  );
}
