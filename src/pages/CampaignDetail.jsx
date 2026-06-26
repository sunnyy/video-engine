import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { serverFetch } from "../services/serverApi";
import { VISUAL_STYLE_OPTIONS } from "../services/ai/shared/visualStyles.js";
import { LanguageVoicePicker } from "../ui/LanguageVoicePicker.jsx";

/**
 * CampaignDetail — one campaign's cockpit: settings editor + lifecycle controls + its video
 * list (in queue / in progress / published) + activity feed. Live parts auto-refresh while
 * work is in flight; the settings form is loaded once so polling never clobbers edits.
 */

const T = { bg: "#090b11", surface: "#0e1018", surface2: "#14141e", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };
const DURATIONS = [{ id: 15, label: "15s" }, { id: 30, label: "30s" }, { id: 45, label: "45s" }, { id: 60, label: "60s" }];
// Mirror of the server's MAX_POSTS_PER_DAY default — the backend clamps regardless, this just
// keeps the picker honest and blocks a tampered <select> before it ever reaches the API.
const MAX_POSTS_PER_DAY = 5;
const STATUS = { draft: { label: "Draft", color: "#8896a8" }, active: { label: "Active", color: "#22c55e" }, paused: { label: "Paused", color: "#f59e0b" }, stopped: { label: "Stopped", color: "#f87171" } };
const STAGE_LABEL = { generate_video: "Generating", render_timeline: "Rendering", publish_post: "Publishing" };
const POST_COLOR = { awaiting_approval: "#f59e0b", queued: "#8896a8", running: "#38bdf8", published: "#22c55e", failed: "#f87171" };

export default function CampaignDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState("");

  const refresh = async () => {
    const d = await serverFetch(`/api/automation/campaigns/${id}`).then(r => r.json());
    setData(d);
    return d;
  };
  const load = async () => {
    const d = await refresh();
    const c = d.campaign;
    setForm({
      name: c.name || "", niches: (c.niches || []).join(", "), audience: c.audience || "", tone: c.tone || "",
      language: c.language || "en", voice_id: c.voice_id || null, style_id: c.style_id || "auto",
      target_duration: c.target_duration || 40, orientation: c.orientation || "9:16",
      posts_per_day: c.posts_per_day || 1, posting_times: (c.posting_times || []).join(", "),
      privacy: c.privacy || "public", auto_publish: c.auto_publish !== false,
      target_accounts: c.target_accounts || [],
    });
  };
  useEffect(() => { load().catch(() => {}); serverFetch("/api/social/accounts").then(r => r.json()).then(d => setAccounts(d.accounts || [])).catch(() => {}); }, [id]);

  // Auto-refresh the live parts while a job is in flight (form is untouched).
  const activeCount = data?.active?.length || 0;
  useEffect(() => {
    if (activeCount === 0) return;
    const t = setInterval(() => { refresh().catch(() => {}); }, 4000);
    return () => clearInterval(t);
  }, [activeCount]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      // Guard against a tampered <select> (e.g. an extra option added via dev tools).
      const perDay = parseInt(form.posts_per_day, 10) || 1;
      if (perDay < 1 || perDay > MAX_POSTS_PER_DAY) throw new Error(`Posts / day must be between 1 and ${MAX_POSTS_PER_DAY}.`);
      const res = await serverFetch(`/api/automation/campaigns/${id}`, { method: "PUT", body: JSON.stringify({
        name: form.name, niches: form.niches.split(",").map(s => s.trim()).filter(Boolean),
        audience: form.audience || null, tone: form.tone || null, language: form.language, voice_id: form.voice_id,
        style_id: form.style_id, target_duration: parseInt(form.target_duration, 10) || 40, orientation: form.orientation,
        posts_per_day: Math.max(1, Math.min(MAX_POSTS_PER_DAY, perDay)),
        posting_times: form.posting_times.split(",").map(s => s.trim()).filter(Boolean),
        privacy: form.privacy, auto_publish: form.auto_publish, target_accounts: form.target_accounts,
      }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Save failed (${res.status})`);
      await refresh();
      setMsg({ ok: true, text: "Saved ✓" });
    } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setSaving(false); }
  };

  const act = async (action, opts = {}) => {
    setBusy(action);
    try { await serverFetch(`/api/automation/campaigns/${id}/${action}`, { method: "POST", body: opts.body ? JSON.stringify(opts.body) : undefined }); await refresh(); }
    catch (_) {} finally { setBusy(""); }
  };
  // Retry a failed/deferred publish. Gives instant feedback: the row flips to "queued" and the
  // button shows "Retrying…" immediately; the enqueued publish_post then drives the 4s auto-refresh
  // (publish_post is an inflight type) until it shows published. Errors surface in the message bar.
  const retryPost = async (postId) => {
    setBusy(`retry-${postId}`);
    setData(d => d ? { ...d, posts: d.posts.map(x => x.id === postId ? { ...x, status: "queued", error: null } : x) } : d);
    try {
      const res = await serverFetch(`/api/automation/campaigns/${id}/retry-post`, { method: "POST", body: JSON.stringify({ postId }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Retry failed"); }
      setMsg({ ok: true, text: "Re-publishing… this can take a moment." });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    await refresh().catch(() => {});
    setBusy("");
  };

  const remove = async () => {
    if (!window.confirm("Delete this campaign? Queued videos will be cancelled.")) return;
    setBusy("delete");
    try { await serverFetch(`/api/automation/campaigns/${id}`, { method: "DELETE" }); nav("/automation"); }
    catch (_) { setBusy(""); }
  };

  if (!data || !form) return <AppLayout><div style={{ flex: 1, background: T.bg, color: T.faint, padding: 40 }}>Loading…</div></AppLayout>;

  const c = data.campaign;
  const st = STATUS[c.status] || STATUS.draft;
  const generating = (data.active || []).some(j => j.type === "generate_video"); // a video is already being made
  const fieldStyle = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit" };
  const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4, display: "block" };
  const opt = { background: T.surface, color: T.text };
  const btn = (bg) => ({ background: bg, border: "none", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" });
  const connectedAccounts = accounts.filter(a => a.status === "connected");

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px 80px" }}>

          <button onClick={() => nav("/automation")} style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 14, fontFamily: "inherit" }}>‹ Automation</button>

          {/* Header + lifecycle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0 }}>{c.name}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}1c`, padding: "3px 10px", borderRadius: 20 }}>{st.label}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => act("run-once")} disabled={busy || generating} style={btn(generating ? "#3a3a52" : T.accent)}>{generating ? "Generating…" : "Run once"}</button>
              {(c.status === "draft" || c.status === "stopped") && <button onClick={() => act("start")} disabled={busy} style={btn("#22c55e")}>Start</button>}
              {c.status === "active" && <button onClick={() => act("pause")} disabled={busy} style={btn("#3a3a52")}>Pause</button>}
              {c.status === "paused" && <button onClick={() => act("resume")} disabled={busy} style={btn("#22c55e")}>Resume</button>}
              {(c.status === "active" || c.status === "paused") && <button onClick={() => act("stop")} disabled={busy} style={btn("#3a3a52")}>Stop</button>}
              <button onClick={remove} disabled={busy} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: "#f87171" }}>Delete</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 24, alignItems: "start" }}>

            {/* ── Settings ── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Settings</div>

              <div><span style={lbl}>Campaign name</span><input style={fieldStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><span style={lbl}>Niche(s) — comma separated</span><input style={fieldStyle} value={form.niches} onChange={e => setForm(f => ({ ...f, niches: e.target.value }))} placeholder="ai tools, productivity" /></div>

              <div>
                <span style={lbl}>Publish to</span>
                {connectedAccounts.length === 0
                  ? <div style={{ fontSize: 12, color: T.faint }}>No connected accounts — add one under Automation → Social Accounts.</div>
                  : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {connectedAccounts.map(a => {
                        const on = form.target_accounts.includes(a.id);
                        return (
                          <button key={a.id} onClick={() => setForm(f => ({ ...f, target_accounts: on ? f.target_accounts.filter(x => x !== a.id) : [...f.target_accounts, a.id] }))}
                            style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? T.accent + "88" : T.border}`, background: on ? `${T.accent}22` : "rgba(255,255,255,0.03)", color: on ? "#fff" : T.muted }}>
                            {a.platform} · {a.display_name || "account"}
                          </button>
                        );
                      })}
                    </div>}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><span style={lbl}>Posts / day</span>
                  <select style={fieldStyle} value={form.posts_per_day} onChange={e => setForm(f => ({ ...f, posts_per_day: e.target.value }))}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} style={opt}>{n}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}><span style={lbl}>Privacy</span>
                  <select style={fieldStyle} value={form.privacy} onChange={e => setForm(f => ({ ...f, privacy: e.target.value }))}>
                    <option value="public" style={opt}>Public</option><option value="unlisted" style={opt}>Unlisted</option><option value="private" style={opt}>Private</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><span style={lbl}>Duration</span>
                  <select style={fieldStyle} value={form.target_duration} onChange={e => setForm(f => ({ ...f, target_duration: e.target.value }))}>
                    {DURATIONS.map(d => <option key={d.id} value={d.id} style={opt}>{d.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}><span style={lbl}>Orientation</span>
                  <select style={fieldStyle} value={form.orientation} onChange={e => setForm(f => ({ ...f, orientation: e.target.value }))}>
                    <option value="9:16" style={opt}>9:16</option><option value="1:1" style={opt}>1:1</option><option value="16:9" style={opt}>16:9</option>
                  </select>
                </div>
              </div>

              <div><span style={lbl}>Visual style</span>
                <select style={fieldStyle} value={form.style_id} onChange={e => setForm(f => ({ ...f, style_id: e.target.value }))}>
                  {VISUAL_STYLE_OPTIONS.map(s => <option key={s.id} value={s.id} style={opt}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <span style={lbl}>Voice &amp; language</span>
                <LanguageVoicePicker language={form.language} onLanguageChange={(id2) => setForm(f => ({ ...f, language: id2 }))} voiceId={form.voice_id} onVoiceChange={(id2) => setForm(f => ({ ...f, voice_id: id2 }))} accentColor={T.accent} border={T.border} />
              </div>

              <div><span style={lbl}>Posting times — comma "HH:MM" (blank = AI decides)</span><input style={fieldStyle} value={form.posting_times} onChange={e => setForm(f => ({ ...f, posting_times: e.target.value }))} placeholder="09:00, 18:00" /></div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><span style={lbl}>Audience (optional)</span><input style={fieldStyle} value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} /></div>
                <div style={{ flex: 1 }}><span style={lbl}>Tone (optional)</span><input style={fieldStyle} value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} /></div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text, cursor: "pointer" }}>
                <input type="checkbox" checked={form.auto_publish} onChange={e => setForm(f => ({ ...f, auto_publish: e.target.checked }))} />
                Auto-publish (off = render then wait for your approval)
              </label>

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 2 }}>
                <button onClick={save} disabled={saving} style={btn(T.accent)}>{saving ? "Saving…" : "Save settings"}</button>
                <button onClick={() => act("topics/skip-next")} disabled={busy} style={btn("#3a3a52")}>Skip next topic</button>
              </div>
              {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? "#22c55e" : "#f87171" }}>{msg.text}</div>}
            </div>

            {/* ── Videos + activity ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>Videos <span style={{ color: T.faint, fontWeight: 600 }}>· {data.queued} topics queued</span></div>

                {/* In flight */}
                {data.active.length > 0 && data.active.map(j => (
                  <div key={j.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <span style={{ fontSize: 12.5, color: T.text }}>
                      <span style={{ color: j.status === "running" ? "#38bdf8" : T.faint }}>●</span> {STAGE_LABEL[j.type] || j.type}
                      {j.type === "render_timeline" && j.progress ? ` ${j.progress}%` : ""}
                      <span style={{ color: T.faint, marginLeft: 6 }}>{j.status}</span>
                    </span>
                    {(j.status === "queued" || j.status === "running") && <button onClick={() => act("cancel-job", { body: { jobId: j.id } })} disabled={busy} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted, padding: "4px 10px", fontSize: 11.5 }}>{j.status === "running" ? "Abort" : "Cancel"}</button>}
                  </div>
                ))}

                {/* Published */}
                {data.posts.length === 0 && data.active.length === 0 && <div style={{ fontSize: 12.5, color: T.faint }}>Nothing yet. Start the campaign or hit Run once.</div>}
                {data.posts.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <span style={{ fontSize: 12.5, color: T.text }}>
                      <span style={{ color: POST_COLOR[p.status] || T.faint }}>●</span> {p.platform}
                      <span style={{ color: T.faint, marginLeft: 6 }}>{p.status.replace("_", " ")}</span>
                    </span>
                    {p.platform_post_id && p.platform === "youtube"
                      ? <a href={`https://youtu.be/${p.platform_post_id}`} target="_blank" rel="noreferrer" style={{ color: T.accent, fontSize: 12 }}>view ↗</a>
                      : (p.status === "failed" || p.status === "deferred") && <button onClick={() => retryPost(p.id)} disabled={busy === `retry-${p.id}`} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted, padding: "4px 10px", fontSize: 11.5, opacity: busy === `retry-${p.id}` ? 0.6 : 1 }}>{busy === `retry-${p.id}` ? "Retrying…" : "Retry"}</button>}
                  </div>
                ))}
              </div>

              {/* Activity */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>Activity</div>
                {data.events.length === 0 ? <div style={{ fontSize: 12.5, color: T.faint }}>No activity yet.</div>
                  : data.events.slice(0, 20).map(e => (
                    <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: POST_COLOR[e.status] || (e.status === "ok" ? "#22c55e" : e.status === "fail" ? "#f87171" : "#8896a8"), flexShrink: 0 }} />
                      <span style={{ color: T.text, fontWeight: 600, width: 88, flexShrink: 0 }}>{e.action}</span>
                      <span style={{ color: T.faint, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message || e.entity || ""}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
