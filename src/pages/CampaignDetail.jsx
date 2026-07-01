import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { serverFetch } from "../services/serverApi";
import { VISUAL_STYLE_OPTIONS } from "../services/ai/shared/visualStyles.js";
import { VoiceLanguageField } from "../ui/fields/voiceLanguage.jsx";
import { OrientationField } from "../ui/fields/orientation.jsx";
import { DurationField } from "../ui/fields/duration.jsx";
import { StyleField } from "../ui/fields/style.jsx";

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
  const [tab, setTab] = useState("settings");
  const [vidPage, setVidPage] = useState(0);

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
        language: form.language, voice_id: form.voice_id,
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
  // Serialize retries: disable ALL Retry buttons while any publish is in flight (a queued/running
  // publish_post, or a retry we just fired) so a user can't mass-click Retry across many failed
  // posts and stack a pile of uploads at once.
  const publishing = busy.startsWith("retry-") || (data.active || []).some(j => j.type === "publish_post");
  const fieldStyle = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit" };
  const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4, display: "block" };
  const opt = { background: T.surface, color: T.text };
  const btn = (bg, dis = false) => ({ background: bg, border: "none", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: dis ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: dis ? 0.55 : 1, transition: "opacity 0.15s, filter 0.15s", display: "inline-flex", alignItems: "center", gap: 6 });
  // Live label while an action is in flight, so each button shows it was clicked.
  const ACTING = { "run-once": "Starting…", start: "Starting…", resume: "Resuming…", pause: "Pausing…", stop: "Stopping…", delete: "Deleting…" };
  const spin = <span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "vqspin 0.6s linear infinite" }} />;
  const connectedAccounts = accounts.filter(a => a.status === "connected");
  const panel = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 };
  const panelHead = { fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 };

  const publishedCount = data.posts.filter(p => p.status === "published").length;

  // Paginated Videos list (topic + status). Server returns newest-first, up to 200.
  const PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(data.posts.length / PER_PAGE));
  const page = Math.min(vidPage, totalPages - 1);
  const pagePosts = data.posts.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  // One video row — leads with the topic (project name), with platform · status beneath.
  const postRow = (p) => (
    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.projects?.name || "Untitled video"}</div>
        <div style={{ fontSize: 11.5, color: T.faint, marginTop: 3 }}>
          <span style={{ color: POST_COLOR[p.status] || T.faint }}>●</span> {p.platform}
          <span style={{ marginLeft: 6 }}>{p.status.replace("_", " ")}</span>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {p.platform_post_id && p.platform === "youtube"
          ? <a href={`https://youtu.be/${p.platform_post_id}`} target="_blank" rel="noreferrer" style={{ color: T.accent, fontSize: 12 }}>view ↗</a>
          : (p.status === "failed" || p.status === "deferred") && <button onClick={() => retryPost(p.id)} disabled={publishing} title={publishing ? "A publish is in progress — wait for it to finish" : "Re-publish this video"} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted, padding: "4px 10px", fontSize: 11.5, opacity: publishing ? 0.45 : 1, cursor: publishing ? "not-allowed" : "pointer" }}>{busy === `retry-${p.id}` ? "Retrying…" : "Retry"}</button>}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 80px" }}>

          <button onClick={() => nav("/automation")} style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 14, fontFamily: "inherit" }}>‹ Automation</button>

          {/* Header + lifecycle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onFocus={e => (e.currentTarget.style.borderBottomColor = T.border)}
                onBlur={e => { e.currentTarget.style.borderBottomColor = "transparent"; const v = form.name.trim(); if (v && v !== c.name) save(); }}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                size={Math.max(8, (form.name || "").length + 1)}
                title="Click to rename"
                style={{ fontSize: 24, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0, background: "transparent", border: "none", borderBottom: "1px solid transparent", outline: "none", padding: "0 0 2px" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <style>{`@keyframes vqspin { to { transform: rotate(360deg); } }`}</style>
              <button onClick={() => act("run-once")} disabled={!!busy || generating} style={btn(generating ? "#3a3a52" : T.accent, !!busy || generating)}>
                {busy === "run-once" ? <>{spin} Starting…</> : generating ? "Generating…" : "Run once"}
              </button>
              {(c.status === "draft" || c.status === "stopped") && <button onClick={() => act("start")} disabled={!!busy} style={btn("#22c55e", !!busy)}>{busy === "start" ? <>{spin} Starting…</> : "Start"}</button>}
              {c.status === "active" && <button onClick={() => act("pause")} disabled={!!busy} style={btn("#3a3a52", !!busy)}>{busy === "pause" ? <>{spin} Pausing…</> : "Pause"}</button>}
              {c.status === "paused" && <button onClick={() => act("resume")} disabled={!!busy} style={btn("#22c55e", !!busy)}>{busy === "resume" ? <>{spin} Resuming…</> : "Resume"}</button>}
              {(c.status === "active" || c.status === "paused") && <button onClick={() => act("stop")} disabled={!!busy} style={btn("#3a3a52", !!busy)}>{busy === "stop" ? <>{spin} Stopping…</> : "Stop"}</button>}
              <button onClick={remove} disabled={!!busy} style={{ ...btn("transparent", !!busy), border: `1px solid ${busy === "delete" ? "#f8717188" : T.border}`, color: "#f87171" }}>{busy === "delete" ? <>{spin} Deleting…</> : "Delete"}</button>
            </div>
          </div>

          {/* Overview strip — campaign pulse, always visible */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginBottom: 18 }}>
            {[
              { label: "Status",        value: st.label, color: st.color },
              { label: "Posts / day",   value: c.posts_per_day || 1 },
              { label: "Topics queued", value: data.queued ?? 0 },
              { label: "Published",     value: publishedCount },
              { label: "Auto-publish",  value: c.auto_publish !== false ? "On" : "Off" },
            ].map(s => (
              <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color || T.text, marginTop: 4, fontFamily: "'Outfit',sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
            {[["settings", "Settings"], ["videos", "Videos"], ["activity", "Activity"]].map(([key, label]) => {
              const on = tab === key;
              return (
                <button key={key} onClick={() => setTab(key)} style={{ background: "none", border: "none", borderBottom: `2px solid ${on ? T.accent : "transparent"}`, color: on ? T.text : T.muted, fontSize: 13.5, fontWeight: 700, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", marginBottom: -1 }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Videos tab ── */}
          {tab === "videos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.active.length > 0 && (
                <div style={panel}>
                  <div style={panelHead}>In progress</div>
                  {data.active.map(j => (
                    <div key={j.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <span style={{ fontSize: 12.5, color: T.text }}>
                        <span style={{ color: j.status === "running" ? "#38bdf8" : T.faint }}>●</span> {STAGE_LABEL[j.type] || j.type}
                        {j.type === "render_timeline" && j.progress ? ` ${j.progress}%` : ""}
                        <span style={{ color: T.faint, marginLeft: 6 }}>{j.status}</span>
                      </span>
                      {(j.status === "queued" || j.status === "running") && <button onClick={() => act("cancel-job", { body: { jobId: j.id } })} disabled={busy} style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: T.muted, padding: "4px 10px", fontSize: 11.5 }}>{j.status === "running" ? "Abort" : "Cancel"}</button>}
                    </div>
                  ))}
                </div>
              )}

              {data.posts.length > 0 && (
                <div style={panel}>
                  <div style={panelHead}>Videos <span style={{ color: T.faint, fontWeight: 600 }}>· {data.posts.length}</span></div>
                  {pagePosts.map(postRow)}
                  {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                      <button onClick={() => setVidPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: page === 0 ? T.faint : T.muted, padding: "5px 12px", fontSize: 12, cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.5 : 1 }}>‹ Prev</button>
                      <span style={{ fontSize: 12, color: T.faint }}>Page {page + 1} of {totalPages}</span>
                      <button onClick={() => setVidPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        style={{ ...btn("transparent"), border: `1px solid ${T.border}`, color: page >= totalPages - 1 ? T.faint : T.muted, padding: "5px 12px", fontSize: 12, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.5 : 1 }}>Next ›</button>
                    </div>
                  )}
                </div>
              )}

              {data.posts.length === 0 && data.active.length === 0 && (
                <div style={panel}><div style={{ fontSize: 12.5, color: T.faint }}>Nothing yet. Start the campaign or hit Run once.</div></div>
              )}
            </div>
          )}

          {/* ── Settings tab ── */}
          {tab === "settings" && (
            <div style={panel}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "22px 16px" }}>
                <div style={{ gridColumn: "span 2" }}><span style={lbl}>Niche(s) — comma separated</span><input style={fieldStyle} value={form.niches} onChange={e => setForm(f => ({ ...f, niches: e.target.value }))} placeholder="ai tools, productivity" /></div>

                <div style={{ gridColumn: "1 / -1" }}>
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

                <div><span style={lbl}>Posts / day</span>
                  <select style={fieldStyle} value={form.posts_per_day} onChange={e => setForm(f => ({ ...f, posts_per_day: e.target.value }))}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} style={opt}>{n}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}><span style={lbl}>Posting times — "HH:MM", comma-separated (blank = AI decides)</span><input style={fieldStyle} value={form.posting_times} onChange={e => setForm(f => ({ ...f, posting_times: e.target.value }))} placeholder="09:00, 18:00" /></div>
                <div><span style={lbl}>Privacy</span>
                  <select style={fieldStyle} value={form.privacy} onChange={e => setForm(f => ({ ...f, privacy: e.target.value }))}>
                    <option value="public" style={opt}>Public</option><option value="unlisted" style={opt}>Unlisted</option><option value="private" style={opt}>Private</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <VoiceLanguageField language={form.language} onLanguageChange={(id2) => setForm(f => ({ ...f, language: id2 }))} voiceId={form.voice_id} onVoiceChange={(id2) => setForm(f => ({ ...f, voice_id: id2 }))} accent={T.accent} />
                  <DurationField value={Number(form.target_duration)} onChange={(v) => setForm(f => ({ ...f, target_duration: v }))} options={DURATIONS} accent={T.accent} />
                  <OrientationField value={form.orientation} onChange={(v) => setForm(f => ({ ...f, orientation: v }))} accent={T.accent} />
                  <StyleField value={form.style_id} onChange={(v) => setForm(f => ({ ...f, style_id: v || "auto" }))} options={VISUAL_STYLE_OPTIONS} accent={T.accent} />
                </div>

                <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.auto_publish} onChange={e => setForm(f => ({ ...f, auto_publish: e.target.checked }))} />
                  Auto-publish (off = render then wait for your approval)
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
                <button onClick={save} disabled={saving} style={btn(T.accent)}>{saving ? "Saving…" : "Save settings"}</button>
                <button onClick={() => act("topics/skip-next")} disabled={busy} style={btn("#3a3a52")}>Skip next topic</button>
                {msg && <span style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? "#22c55e" : "#f87171" }}>{msg.text}</span>}
              </div>
            </div>
          )}

          {/* ── Activity tab ── */}
          {tab === "activity" && (
            <div style={panel}>
              {data.events.length === 0 ? <div style={{ fontSize: 12.5, color: T.faint }}>No activity yet.</div>
                : data.events.slice(0, 40).map(e => (
                  <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 12, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: POST_COLOR[e.status] || (e.status === "ok" ? "#22c55e" : e.status === "fail" ? "#f87171" : "#8896a8"), flexShrink: 0 }} />
                    <span style={{ color: T.text, fontWeight: 600, width: 110, flexShrink: 0 }}>{e.action}</span>
                    <span style={{ color: T.faint, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message || e.entity || ""}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
