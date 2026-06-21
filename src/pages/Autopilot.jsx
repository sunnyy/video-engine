import { useEffect, useState } from "react";
import AppLayout from "../ui/AppLayout";
import { serverFetch } from "../services/serverApi";

/**
 * Autopilot — the AutoPilot hub: a settings panel + a THIN calendar that visualizes
 * scheduler state (it is NOT the source of truth). Upcoming slots are derived from
 * settings; in-flight items come from jobs; done/awaiting from published_posts.
 * Edits go through backend APIs (settings + actions) — no drag-and-drop of internal jobs.
 */

const T = { bg: "#090b11", surface: "#0e1018", surface2: "#14141e", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

const PLATFORMS = [
  { id: "youtube", label: "YouTube", ready: true },
  { id: "tiktok", label: "TikTok", ready: false },
  { id: "instagram", label: "Instagram", ready: false },
  { id: "linkedin", label: "LinkedIn", ready: false },
  { id: "x", label: "X", ready: false },
];

const STATUS_COLOR = {
  awaiting_approval: "#f59e0b", queued: "#8896a8", running: "#38bdf8",
  published: "#22c55e", failed: "#f87171",
};
const STAGE_LABEL = { generate_video: "Generating", render_timeline: "Rendering", publish_post: "Publishing" };

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

export default function Autopilot() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()));

  const load = async () => {
    const d = await serverFetch("/api/autopilot/calendar").then(r => r.json());
    setData(d);
    setForm({
      enabled: d.settings.enabled, auto_publish: d.settings.auto_publish !== false,
      niches: (d.settings.niches || []).join(", "),
      platforms: d.settings.platforms || [],
      posts_per_day: d.settings.posts_per_day || 1,
      posting_times: (d.settings.posting_times || []).join(", "),
      orientation: d.settings.orientation || "9:16",
      language: d.settings.language || "en",
      audience: d.settings.audience || "",
      tone: d.settings.tone || "",
    });
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const act = async (path, body) => {
    setBusy(path);
    try { await serverFetch(`/api/autopilot/${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined }); await load(); }
    catch (_) {} finally { setBusy(""); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await serverFetch("/api/autopilot/settings", { method: "PUT", body: JSON.stringify({
        enabled: form.enabled, auto_publish: form.auto_publish,
        niches: form.niches.split(",").map(s => s.trim()).filter(Boolean),
        platforms: form.platforms,
        posts_per_day: Math.max(1, parseInt(form.posts_per_day, 10) || 1),
        posting_times: form.posting_times.split(",").map(s => s.trim()).filter(Boolean),
        orientation: form.orientation, language: form.language,
        audience: form.audience || null, tone: form.tone || null,
      }) });
      await load();
    } catch (_) {} finally { setSaving(false); }
  };

  if (!data || !form) return <AppLayout><div style={{ flex: 1, background: T.bg, color: T.faint, padding: 40 }}>Loading AutoPilot…</div></AppLayout>;

  // ── Build per-day buckets for the visible month ──
  const byDay = {};
  for (const iso of data.upcoming) (byDay[dayKey(iso)] ||= { upcoming: [], posts: [] }).upcoming.push(iso);
  for (const p of data.posts) (byDay[dayKey(p.published_at || p.created_at)] ||= { upcoming: [], posts: [] }).posts.push(p);

  const first = new Date(month);
  const startPad = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

  const sel = byDay[selectedDay] || { upcoming: [], posts: [] };
  const awaitingByProject = {};
  for (const p of data.posts) if (p.status === "awaiting_approval") (awaitingByProject[p.project_id] ||= []).push(p);

  const fieldStyle = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit" };
  const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4, display: "block" };
  const btn = (bg) => ({ background: bg, border: "none", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" });

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 24px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0 }}>AutoPilot</h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: T.faint }}>{data.queued} topics queued</span>
              <button onClick={() => act("generate-now")} disabled={busy} style={btn(T.accent)}>Generate now</button>
              {data.settings.enabled
                ? <button onClick={() => act("pause")} disabled={busy} style={btn("#3a3a52")}>Pause</button>
                : <button onClick={() => act("resume")} disabled={busy} style={btn("#22c55e")}>Resume</button>}
            </div>
          </div>
          <div style={{ fontSize: 13, color: data.settings.enabled ? "#22c55e" : T.faint, marginBottom: 22 }}>
            {data.settings.enabled ? "● Active — videos generate and post automatically" : "○ Paused"}
          </div>

          {/* In-flight strip */}
          {data.active.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
              {data.active.map(j => (
                <span key={j.id} style={{ fontSize: 12, color: T.text, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 20, padding: "5px 12px" }}>
                  <span style={{ color: "#38bdf8" }}>●</span> {STAGE_LABEL[j.type] || j.type}{j.type === "render_timeline" && j.progress ? ` ${j.progress}%` : ""}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1.6fr)", gap: 24, alignItems: "start" }}>

            {/* ── Settings ── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Settings</div>

              <div><span style={lbl}>Niche(s) — comma separated</span><input style={fieldStyle} value={form.niches} onChange={e => setForm(f => ({ ...f, niches: e.target.value }))} placeholder="ai tools, productivity" /></div>

              <div>
                <span style={lbl}>Platforms</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PLATFORMS.map(p => {
                    const on = form.platforms.includes(p.id);
                    return (
                      <button key={p.id} disabled={!p.ready}
                        onClick={() => setForm(f => ({ ...f, platforms: on ? f.platforms.filter(x => x !== p.id) : [...f.platforms, p.id] }))}
                        style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: p.ready ? "pointer" : "not-allowed", fontFamily: "inherit", border: `1px solid ${on ? T.accent + "88" : T.border}`, background: on ? `${T.accent}22` : "rgba(255,255,255,0.03)", color: p.ready ? (on ? "#fff" : T.muted) : T.faint }}>
                        {p.label}{!p.ready && " · soon"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><span style={lbl}>Posts / day</span><input type="number" min="1" max="5" style={fieldStyle} value={form.posts_per_day} onChange={e => setForm(f => ({ ...f, posts_per_day: e.target.value }))} /></div>
                <div style={{ flex: 1 }}><span style={lbl}>Orientation</span>
                  <select style={fieldStyle} value={form.orientation} onChange={e => setForm(f => ({ ...f, orientation: e.target.value }))}>
                    <option value="9:16">9:16</option><option value="1:1">1:1</option><option value="16:9">16:9</option>
                  </select>
                </div>
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

              <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                <button onClick={save} disabled={saving} style={btn(T.accent)}>{saving ? "Saving…" : "Save settings"}</button>
                <button onClick={() => act("skip-next")} disabled={busy} style={btn("#3a3a52")}>Skip next topic</button>
                <button onClick={() => act("regenerate-next")} disabled={busy} style={btn("#3a3a52")}>Regenerate topic</button>
              </div>
            </div>

            {/* ── Calendar ── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ ...btn("transparent"), color: T.muted }}>‹</button>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{month.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
                <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ ...btn("transparent"), color: T.muted }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: T.faint, fontWeight: 700, padding: "2px 0" }}>{d}</div>)}
                {cells.map((c, i) => {
                  if (!c) return <div key={i} />;
                  const k = dayKey(c);
                  const b = byDay[k] || { upcoming: [], posts: [] };
                  const isSel = k === selectedDay;
                  const isToday = k === dayKey(new Date());
                  return (
                    <button key={i} onClick={() => setSelectedDay(k)}
                      style={{ aspectRatio: "1", borderRadius: 8, border: `1px solid ${isSel ? T.accent + "88" : T.border}`, background: isSel ? `${T.accent}1c` : isToday ? "rgba(255,255,255,0.04)" : "transparent", color: T.text, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontFamily: "inherit", padding: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? T.accent : T.muted }}>{c.getDate()}</span>
                      <div style={{ display: "flex", gap: 2 }}>
                        {b.posts.slice(0, 3).map((p, j) => <span key={"p" + j} style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS_COLOR[p.status] || T.faint }} />)}
                        {b.upcoming.length > 0 && <span style={{ width: 5, height: 5, borderRadius: "50%", border: `1px solid ${T.muted}` }} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Day detail */}
              <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.muted, marginBottom: 10 }}>{new Date(selectedDay).toDateString()}</div>
                {sel.upcoming.length === 0 && sel.posts.length === 0 && <div style={{ fontSize: 12.5, color: T.faint }}>Nothing scheduled.</div>}
                {sel.upcoming.map((iso, j) => (
                  <div key={"u" + j} style={{ fontSize: 12.5, color: T.muted, padding: "6px 0", display: "flex", justifyContent: "space-between" }}>
                    <span>○ Upcoming post</span><span>{new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                ))}
                {sel.posts.map((p) => (
                  <div key={p.id} style={{ fontSize: 12.5, padding: "7px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                    <span style={{ color: T.text }}>
                      <span style={{ color: STATUS_COLOR[p.status] || T.faint }}>●</span> {p.platform}
                      <span style={{ color: T.faint, marginLeft: 6 }}>{p.status.replace("_", " ")}</span>
                    </span>
                    <span style={{ display: "flex", gap: 8 }}>
                      {p.platform_post_id && p.platform === "youtube" && <a href={`https://youtu.be/${p.platform_post_id}`} target="_blank" rel="noreferrer" style={{ color: T.accent, fontSize: 12 }}>view ↗</a>}
                      {p.status === "awaiting_approval" && <button onClick={() => act("approve", { projectId: p.project_id })} disabled={busy} style={{ ...btn("#f59e0b"), padding: "4px 10px", fontSize: 11.5 }}>Approve</button>}
                    </span>
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
