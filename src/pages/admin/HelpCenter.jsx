import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import Markdown from "../../ui/Markdown";
import {
  adminListHelpArticles, adminCreateHelpArticle, adminUpdateHelpArticle, adminDeleteHelpArticle,
} from "../../services/help/helpService";

const input = { width: "100%", background: "#0b0b10", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, padding: "9px 11px", fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
const label = { fontSize: 11, color: "#888", marginBottom: 5, display: "block", fontWeight: 600 };

const BLANK = { title: "", slug: "", category: "General", excerpt: "", body: "", status: "draft", sortOrder: 0 };

function Editor({ initial, onSaved, onDeleted, onCancel }) {
  const [form, setForm]   = useState(() => ({
    title: initial?.title || "", slug: initial?.slug || "", category: initial?.category || "General",
    excerpt: initial?.excerpt || "", body: initial?.body || "", status: initial?.status || "draft",
    sortOrder: initial?.sort_order ?? 0,
  }));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const editing = !!initial?.id;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) { setErr("Title is required."); return; }
    setBusy(true); setErr("");
    try {
      const payload = { title: form.title, slug: form.slug, category: form.category, excerpt: form.excerpt, body: form.body, status: form.status, sortOrder: form.sortOrder };
      const { article } = editing ? await adminUpdateHelpArticle(initial.id, payload) : await adminCreateHelpArticle(payload);
      onSaved(article, editing);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`Delete "${initial.title}"? This can't be undone.`)) return;
    setBusy(true);
    try { await adminDeleteHelpArticle(initial.id); onDeleted(initial.id); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#e8e8f0" }}>{editing ? "Edit article" : "New article"}</div>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div><label style={label}>Title</label><input style={input} value={form.title} onChange={e => set("title", e.target.value)} placeholder="How credits work" /></div>
        <div><label style={label}>Category</label><input style={input} value={form.category} onChange={e => set("category", e.target.value)} placeholder="Billing" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div><label style={label}>Slug {editing ? "" : "(auto from title if blank)"}</label><input style={{ ...input, fontFamily: "'JetBrains Mono',monospace" }} value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="how-credits-work" /></div>
        <div><label style={label}>Sort order (lower = first)</label><input style={input} type="number" value={form.sortOrder} onChange={e => set("sortOrder", e.target.value)} /></div>
      </div>
      <div><label style={label}>Excerpt (shown in the list + search)</label><input style={input} value={form.excerpt} onChange={e => set("excerpt", e.target.value)} placeholder="A short one-line summary." /></div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <label style={{ ...label, marginBottom: 0 }}>Body (Markdown)</label>
          <button onClick={() => setPreview(p => !p)} style={{ background: "none", border: "none", color: "#7c5cfc", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{preview ? "Edit" : "Preview"}</button>
        </div>
        {preview ? (
          <div style={{ background: "#0b0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px", minHeight: 220 }}>
            <Markdown source={form.body || "_Nothing to preview yet._"} />
          </div>
        ) : (
          <textarea style={{ ...input, minHeight: 220, resize: "vertical", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6 }} value={form.body} onChange={e => set("body", e.target.value)}
            placeholder={"## Heading\n\nSome text with **bold**, *italic*, `code` and a [link](https://example.com).\n\n- bullet one\n- bullet two"} />
        )}
        <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>Supports # headings, **bold**, *italic*, `code`, [links](url), - lists, 1. lists, &gt; quotes, ``` code blocks.</div>
      </div>

      {err && <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["draft", "published"].map(s => (
            <button key={s} onClick={() => set("status", s)} style={{
              ...input, width: "auto", cursor: "pointer", padding: "8px 16px",
              background: form.status === s ? (s === "published" ? "rgba(34,197,94,0.15)" : "rgba(245,197,24,0.12)") : "#0b0b10",
              color: form.status === s ? (s === "published" ? "#22c55e" : "#f5c518") : "#888", fontWeight: 700, textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {editing && <button onClick={remove} disabled={busy} style={{ background: "none", border: "1px solid rgba(248,113,113,0.4)", color: "#f87171", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>}
          <button onClick={save} disabled={busy} style={{ background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit" }}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

export default function HelpCenter() {
  const [articles, setArticles] = useState(null);
  const [error, setError]       = useState("");
  const [editing, setEditing]   = useState(null); // article object, BLANK for new, or null

  useEffect(() => { adminListHelpArticles().then(d => setArticles(d.articles)).catch(e => setError(e.message)); }, []);

  function onSaved(article, wasEditing) {
    setArticles(list => {
      const l = list || [];
      return wasEditing ? l.map(a => a.id === article.id ? article : a) : [article, ...l];
    });
    setEditing(null);
  }
  function onDeleted(id) {
    setArticles(list => (list || []).filter(a => a.id !== id));
    setEditing(null);
  }

  return (
    <AdminLayout>
      <div style={{ padding: "28px 32px", color: "#e8e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Help Center</h1>
            <p style={{ fontSize: 13.5, color: "#888", marginTop: 6 }}>Public knowledge base at <a href="/help" target="_blank" rel="noreferrer" style={{ color: "#7c5cfc" }}>/help</a>. Only published articles are visible.</p>
          </div>
          {!editing && <button onClick={() => setEditing(BLANK)} style={{ background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ New article</button>}
        </div>

        {error && <div style={{ marginTop: 20, color: "#f87171" }}>{error}</div>}

        {editing ? (
          <div style={{ marginTop: 20 }}>
            <Editor initial={editing.id ? editing : null} onSaved={onSaved} onDeleted={onDeleted} onCancel={() => setEditing(null)} />
          </div>
        ) : (
          <div style={{ marginTop: 20, background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.6fr", gap: 12, padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <div>Title</div><div>Category</div><div>Status</div><div style={{ textAlign: "right" }}>Views</div>
            </div>
            {articles == null ? (
              <div style={{ padding: "32px 18px", textAlign: "center", color: "#666" }}>Loading…</div>
            ) : articles.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center", color: "#666" }}>No articles yet. Create your first one.</div>
            ) : articles.map(a => (
              <div key={a.id} onClick={() => setEditing(a)} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.6fr", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13, alignItems: "center", cursor: "pointer" }}>
                <div style={{ fontWeight: 600, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                <div style={{ color: "#9494a8" }}>{a.category}</div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: a.status === "published" ? "rgba(34,197,94,0.12)" : "rgba(245,197,24,0.12)", color: a.status === "published" ? "#22c55e" : "#f5c518" }}>{a.status}</span>
                </div>
                <div style={{ textAlign: "right", color: "#9494a8" }}>{a.views}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
