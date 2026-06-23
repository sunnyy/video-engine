import { useState, useEffect } from "react";
import EditorModal from "./EditorModal";
import { serverFetch } from "../../../services/serverApi";
import { showToast } from "../../Toast";

/**
 * PublishModal — post an already-rendered video straight to the user's connected social
 * accounts. Title/caption/hashtags pre-fill from the project's generated publish copy
 * (Prompt-to-Video). Enqueues a publish_post per selected account; the worker uploads.
 */

const T = { surface: "#14141e", border: "rgba(255,255,255,0.1)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };
const BRAND = { youtube: "#FF0000", tiktok: "#141417", instagram: "#E1306C", linkedin: "#0A66C2", x: "#141417" };

export default function PublishModal({ name, initialPublish, publishedAccounts = {}, onSubmit, onClose }) {
  const [accounts, setAccounts] = useState(null);
  const [selected, setSelected] = useState([]);
  const [title, setTitle] = useState((initialPublish?.title || name || "").slice(0, 100));
  const [caption, setCaption] = useState(initialPublish?.description || "");
  const [hashtags, setHashtags] = useState((initialPublish?.hashtags || []).join(" "));
  const [privacy, setPrivacy] = useState("public");

  useEffect(() => {
    serverFetch("/api/social/accounts").then(r => r.json()).then(d => {
      const connected = (d.accounts || []).filter(a => a.status === "connected");
      setAccounts(connected);
      setSelected(connected.map(a => a.id)); // default: all connected selected
    }).catch(() => setAccounts([]));
  }, []);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return ""; } };
  // Re-publish guard: are any of the selected accounts ones this video already went to?
  const reposting = selected.some((id) => publishedAccounts[id]);

  // Hand accounts + metadata to the TopBar, which renders (with progress, Export disabled)
  // then publishes. The modal just collects intent.
  const publish = () => {
    if (!selected.length) { showToast("Select at least one account."); return; }
    const tags = hashtags.split(/[\s,]+/).map(h => h.replace(/^#/, "").trim()).filter(Boolean);
    const hashLine = tags.map(t => `#${t}`).join(" ");
    const metadata = {
      title: title.slice(0, 100),
      description: [caption.trim(), hashLine].filter(Boolean).join("\n\n"),
      tags,
      privacyStatus: privacy,
    };
    onSubmit({ accountIds: selected, metadata });
    onClose();
  };

  const field = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13.5, padding: "9px 11px", outline: "none", fontFamily: "inherit" };
  const label = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" };

  return (
    <EditorModal title="Publish to social" onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Accounts */}
        <div>
          <span style={label}>Publish to</span>
          {accounts === null ? <div style={{ fontSize: 13, color: T.faint }}>Loading accounts…</div>
            : accounts.length === 0 ? (
              <div style={{ fontSize: 13, color: T.muted, padding: "12px 14px", border: `1px dashed ${T.border}`, borderRadius: 10 }}>
                No connected accounts. <a href="/connections" style={{ color: T.accent }}>Connect a social account →</a>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {accounts.map(a => {
                  const on = selected.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => toggle(a.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
                        border: `1.5px solid ${on ? T.accent + "99" : T.border}`, background: on ? `${T.accent}22` : "rgba(255,255,255,0.03)", color: on ? T.text : T.muted }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: BRAND[a.platform] || T.faint, flexShrink: 0 }} />
                      {a.platform} · {a.display_name || "account"}
                      {publishedAccounts[a.id] && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#34d399", background: "rgba(34,197,94,0.14)", borderRadius: 5, padding: "1px 6px", marginLeft: 2 }}>
                          ✓ posted {fmtDate(publishedAccounts[a.id])}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
        </div>

        <div><span style={label}>Title</span><input style={field} value={title} maxLength={100} onChange={e => setTitle(e.target.value)} /></div>
        <div><span style={label}>Caption</span><textarea style={{ ...field, minHeight: 90, resize: "vertical" }} value={caption} onChange={e => setCaption(e.target.value)} placeholder="A short caption that drives the watch…" /></div>
        <div><span style={label}>Hashtags</span><input style={field} value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#ai #productivity" /></div>

        <div>
          <span style={label}>Visibility</span>
          <select style={field} value={privacy} onChange={e => setPrivacy(e.target.value)}>
            <option value="public" style={{ background: T.surface }}>Public</option>
            <option value="unlisted" style={{ background: T.surface }}>Unlisted</option>
            <option value="private" style={{ background: T.surface }}>Private</option>
          </select>
        </div>

        {reposting && (
          <div style={{ fontSize: 12, color: "#fbbf24", lineHeight: 1.5, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "9px 12px" }}>
            ⚠ You've already published this video to {selected.filter((id) => publishedAccounts[id]).length === 1 ? "one of these accounts" : "some of these accounts"}. Publishing again will create a duplicate post.
          </div>
        )}

        <div style={{ fontSize: 11.5, color: T.faint, lineHeight: 1.5 }}>
          We'll render your current video, then publish it — you'll get a notification when it's live. You can keep editing meanwhile.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${T.border}`, color: T.muted, fontWeight: 700, fontSize: 13, padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={publish} disabled={!(accounts && accounts.length)} style={{ background: !(accounts && accounts.length) ? "#3a3a52" : reposting ? "#d97706" : "#22c55e", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 22px", borderRadius: 8, cursor: (accounts && accounts.length) ? "pointer" : "default", fontFamily: "inherit" }}>
            {reposting ? "Publish again" : "Render & Publish"}
          </button>
        </div>
      </div>
    </EditorModal>
  );
}
