import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

/**
 * AnnouncementCenter — admin composer for broadcast notifications. Targets all users,
 * specific users, or a segment; previews reach; test-sends to self; sends now or schedules.
 * Persists a campaign (announcements table) and a broadcast_announcement job fans it out.
 */

const T = { bg: "#0d0d14", surface: "#13131c", border: "rgba(255,255,255,0.09)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

const CATEGORY_META = {
  news:        { icon: "📣", severity: "info",    label: "News / Update" },
  promo:       { icon: "🎁", severity: "success", label: "Promo / Offer" },
  maintenance: { icon: "🛠️", severity: "warning", label: "Maintenance" },
  warning:     { icon: "⚠️", severity: "warning", label: "Warning / Policy" },
  tip:         { icon: "💡", severity: "info",    label: "Tip" },
};
const SEV_COLOR = { info: "#7c5cfc", success: "#34d399", warning: "#f59e0b", error: "#ef4444" };

const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 };

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const map = {
    queued:    { c: "#f5c518", l: "Queued" },
    scheduled: { c: "#7c5cfc", l: "Scheduled" },
    sending:   { c: "#38bdf8", l: "Sending" },
    sent:      { c: "#34d399", l: "Sent" },
    failed:    { c: "#ef4444", l: "Failed" },
    draft:     { c: "#8896a8", l: "Draft" },
  };
  const s = map[status] || map.draft;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: `${s.c}22`, color: s.c }}>{s.l}</span>;
}

export default function AnnouncementCenter() {
  // composer
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [link, setLink]         = useState("");
  const [category, setCategory] = useState("news");

  // audience
  const [audType, setAudType]   = useState("all"); // all | users | segment
  const [users, setUsers]       = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [seg, setSeg] = useState({ plan: "", maxBalance: "", inactiveDays: "", signupAfter: "" });

  // delivery
  const [email, setEmail] = useState(false);

  // schedule
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // ui
  const [count, setCount]   = useState(null);
  const [busy, setBusy]     = useState("");
  const [msg, setMsg]       = useState("");
  const [err, setErr]       = useState("");
  const [history, setHistory] = useState([]);

  const meta = CATEGORY_META[category];

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { if (audType === "users" && !users.length) loadUsers(); }, [audType]); // eslint-disable-line react-hooks/exhaustive-deps
  // Any audience change invalidates a previously computed count.
  useEffect(() => { setCount(null); }, [audType, selectedIds, seg]);

  async function loadUsers() {
    try {
      const res = await serverFetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) setUsers(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }

  async function loadHistory() {
    try {
      const res = await serverFetch("/api/admin/announcements");
      const data = await res.json();
      if (res.ok) setHistory(data.announcements || []);
    } catch { /* ignore */ }
  }

  function buildAudience() {
    if (audType === "users") return { type: "users", userIds: selectedIds };
    if (audType === "segment") {
      const s = {};
      if (seg.plan) s.plan = seg.plan;
      if (seg.maxBalance !== "") s.maxBalance = Number(seg.maxBalance);
      if (seg.inactiveDays !== "") s.inactiveDays = Number(seg.inactiveDays);
      if (seg.signupAfter) s.signupAfter = seg.signupAfter;
      return { type: "segment", segment: s };
    }
    return { type: "all" };
  }

  function validate() {
    if (!title.trim()) return "Title is required.";
    if (audType === "users" && selectedIds.length === 0) return "Select at least one user.";
    if (scheduleOn && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) return "Pick a future schedule time.";
    return "";
  }

  async function previewCount() {
    setErr(""); setMsg(""); setBusy("count");
    try {
      const res = await serverFetch("/api/admin/announcements/preview-count", { method: "POST", body: JSON.stringify({ audience: buildAudience() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCount(data.count);
    } catch (e) { setErr(e.message); }
    setBusy("");
  }

  async function testSend() {
    const v = validate(); if (v && !v.includes("user") && !v.includes("schedule")) { setErr(v); return; }
    if (!title.trim()) { setErr("Title is required."); return; }
    setErr(""); setMsg(""); setBusy("test");
    try {
      const res = await serverFetch("/api/admin/announcements/test", { method: "POST", body: JSON.stringify({ title, body, link, category, email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(email ? "Test sent to you — check the bell and your inbox." : "Test notification sent to you — check the bell.");
    } catch (e) { setErr(e.message); }
    setBusy("");
  }

  async function send() {
    const v = validate(); if (v) { setErr(v); return; }
    setErr(""); setMsg(""); setBusy("send");
    try {
      const res = await serverFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title, body, link, category, audience: buildAudience(), scheduledAt: scheduleOn ? scheduledAt : null, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(scheduleOn ? "Announcement scheduled." : "Announcement is sending — users will receive it shortly.");
      setTitle(""); setBody(""); setLink(""); setSelectedIds([]); setCount(null); setScheduleOn(false); setScheduledAt(""); setEmail(false);
      loadHistory();
    } catch (e) { setErr(e.message); }
    setBusy("");
  }

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const list = q ? users.filter(u => (u.email || "").toLowerCase().includes(q)) : users;
    return list.slice(0, 200);
  }, [users, userSearch]);

  function toggleUser(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", color: T.text }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Announcements</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 24px" }}>Broadcast an in-app notification to your users — and optionally email them too (for legal/policy updates).</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
          {/* ── Composer ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(CATEGORY_META).map(([id, m]) => (
                    <button key={id} onClick={() => setCategory(id)}
                      style={{ padding: "7px 12px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        border: `1px solid ${category === id ? "rgba(124,92,252,0.55)" : T.border}`,
                        background: category === id ? "rgba(124,92,252,0.16)" : "rgba(255,255,255,0.03)",
                        color: category === id ? "#fff" : T.muted }}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="What's new?" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Message</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={400} placeholder="One or two lines of detail…" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <label style={labelStyle}>Link (optional, in-app path)</label>
                <input value={link} onChange={e => setLink(e.target.value)} placeholder="/credits" style={inputStyle} />
              </div>
            </div>

            {/* ── Audience ── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={labelStyle}>Audience</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["all", "Everyone"], ["users", "Specific users"], ["segment", "Segment"]].map(([id, lbl]) => (
                  <button key={id} onClick={() => setAudType(id)}
                    style={{ flex: 1, padding: "9px 10px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      border: `1px solid ${audType === id ? "rgba(124,92,252,0.55)" : T.border}`,
                      background: audType === id ? "rgba(124,92,252,0.16)" : "rgba(255,255,255,0.03)",
                      color: audType === id ? "#fff" : T.muted }}>
                    {lbl}
                  </button>
                ))}
              </div>

              {audType === "users" && (
                <div>
                  <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by email…" style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ fontSize: 11, color: T.faint, marginBottom: 8 }}>{selectedIds.length} selected{users.length > 200 ? " · showing first 200 matches" : ""}</div>
                  <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 10 }}>
                    {filteredUsers.map(u => (
                      <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", fontSize: 12.5 }}>
                        <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleUser(u.id)} />
                        <span style={{ flex: 1, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                        <span style={{ fontSize: 11, color: T.faint }}>{u.plan || "Free"}</span>
                      </label>
                    ))}
                    {filteredUsers.length === 0 && <div style={{ padding: 16, fontSize: 12, color: T.faint, textAlign: "center" }}>No users.</div>}
                  </div>
                </div>
              )}

              {audType === "segment" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Plan</label>
                    <select value={seg.plan} onChange={e => setSeg({ ...seg, plan: e.target.value })} style={inputStyle}>
                      <option value="">Any</option>
                      <option value="free">Free (no active plan)</option>
                      <option value="paid">Paid (any active plan)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Max credit balance</label>
                    <input type="number" min="0" value={seg.maxBalance} onChange={e => setSeg({ ...seg, maxBalance: e.target.value })} placeholder="e.g. 20" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Inactive for (days)</label>
                    <input type="number" min="0" value={seg.inactiveDays} onChange={e => setSeg({ ...seg, inactiveDays: e.target.value })} placeholder="e.g. 14" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Signed up after</label>
                    <input type="date" value={seg.signupAfter} onChange={e => setSeg({ ...seg, signupAfter: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={previewCount} disabled={busy === "count"}
                  style={{ padding: "8px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", color: T.text }}>
                  {busy === "count" ? "Counting…" : "Preview reach"}
                </button>
                {count != null && <span style={{ fontSize: 13, color: T.text }}>Will reach <b style={{ color: T.accent }}>{count}</b> user{count === 1 ? "" : "s"}.</span>}
              </div>
            </div>

            {/* ── Delivery ── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer" }}>
                <input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} />
                Also send by email
              </label>
              <p style={{ fontSize: 11.5, color: T.faint, margin: 0, lineHeight: 1.5 }}>
                In-app bell is always delivered. Turn this on to also email the audience — use it for legal/policy
                updates (Privacy, Terms) that everyone must be notified of, or important product news.
              </p>
            </div>

            {/* ── Schedule ── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer" }}>
                <input type="checkbox" checked={scheduleOn} onChange={e => setScheduleOn(e.target.checked)} />
                Schedule for later
              </label>
              {scheduleOn && <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={inputStyle} />}
            </div>

            {(err || msg) && <div style={{ fontSize: 13, color: err ? "#ef4444" : "#34d399" }}>{err || msg}</div>}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={testSend} disabled={!!busy}
                style={{ padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", color: T.text }}>
                {busy === "test" ? "Sending…" : "Test send to me"}
              </button>
              <button onClick={send} disabled={!!busy}
                style={{ padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", border: "none", background: T.accent, color: "#fff", flex: 1 }}>
                {busy === "send" ? "Working…" : scheduleOn ? "Schedule announcement" : "Send announcement"}
              </button>
            </div>
          </div>

          {/* ── Live preview ── */}
          <div style={{ position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8 }}>Preview</div>
              <div style={{ background: "#111118", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18, lineHeight: 1.2 }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title || "Your title appears here"}</div>
                  {body && <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{body}</div>}
                  <div style={{ fontSize: 10.5, color: T.faint, marginTop: 5 }}>just now</div>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_COLOR[meta.severity], marginTop: 5 }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── History ── */}
        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>Recent announcements</h2>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            {history.length === 0 ? (
              <div style={{ padding: 24, fontSize: 13, color: T.faint, textAlign: "center" }}>No announcements yet.</div>
            ) : history.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 16 }}>{a.icon || "📣"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: T.faint }}>{(a.audience?.type || "all")} · {a.scheduled_at ? `scheduled ${fmtDate(a.scheduled_at)}` : fmtDate(a.created_at)}</div>
                </div>
                {a.email && <span title={`${a.email_count ?? 0} emailed`} style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", background: "rgba(56,189,248,0.14)", padding: "2px 8px", borderRadius: 99 }}>✉ {a.email_count ?? 0}</span>}
                <span style={{ fontSize: 12, color: T.muted }}>{a.sent_count} sent</span>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
