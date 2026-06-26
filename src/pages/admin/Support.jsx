import { useEffect, useRef, useState } from "react";
import AdminLayout from "./AdminLayout";
import { uploadUserAsset } from "../../services/assets/uploadUserAsset";
import { adminListTickets, adminGetTicket, adminReply, adminSetStatus, adminListCanned, adminCreateCanned, adminDeleteCanned } from "../../services/support/supportService";

const T = { surface: "#13131c", surface2: "#181820", border: "rgba(255,255,255,0.09)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

const CAT_LABEL = { technical: "Technical / Bug", billing: "Billing & Credits", quality: "Video Quality", account: "Account", other: "Other" };
const STATUSES  = ["open", "in_progress", "waiting_on_user", "resolved", "closed"];
const PRIORITIES = ["low", "normal", "high"];
const STATUS = {
  open:            { label: "Open",                c: "#f5c518" },
  in_progress:     { label: "In progress",         c: "#38bdf8" },
  waiting_on_user: { label: "Awaiting user",        c: "#a78bfa" },
  resolved:        { label: "Resolved",            c: "#34d399" },
  closed:          { label: "Closed",              c: "#8896a8" },
};
const PRIO_C = { low: "#8896a8", normal: "#38bdf8", high: "#f87171" };
const SLA_HOURS = { high: 4, normal: 24, low: 72 };
function overdueHours(t) {
  if (!["open", "in_progress"].includes(t.status)) return 0;
  const over = Date.now() - (new Date(t.last_message_at).getTime() + (SLA_HOURS[t.priority] ?? 24) * 3600000);
  return over > 0 ? Math.floor(over / 3600000) : 0;
}
function Stars({ n }) {
  return <span style={{ color: "#f5c518", fontSize: 12 }}>{"★".repeat(n)}<span style={{ color: "#3a3a48" }}>{"☆".repeat(5 - n)}</span></span>;
}

function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}
function Badge({ status }) {
  const s = STATUS[status] || STATUS.open;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: `${s.c}22`, color: s.c, whiteSpace: "nowrap" }}>{s.label}</span>;
}

const selStyle = { padding: "7px 10px", borderRadius: 8, background: "#0b0b10", border: `1px solid ${T.border}`, color: T.text, fontSize: 13, fontFamily: "inherit", cursor: "pointer" };
const btnGhost = { padding: "8px 13px", borderRadius: 9, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", color: T.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnPrimary = { padding: "10px 18px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };

export default function Support() {
  const [filter, setFilter] = useState("");
  const [tickets, setTickets] = useState(null);
  const [counts, setCounts] = useState({});
  const [active, setActive] = useState(null);  // { ticket, messages }
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const [canned, setCanned] = useState([]);
  const [showCanned, setShowCanned] = useState(false);
  const [ncTitle, setNcTitle] = useState("");
  const [ncBody, setNcBody] = useState("");

  useEffect(() => { loadList(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { adminListCanned().then(d => setCanned(d.canned || [])).catch(() => {}); }, []);

  const rated = (tickets || []).filter(t => t.csat_rating);
  const avgCsat = rated.length ? (rated.reduce((a, t) => a + t.csat_rating, 0) / rated.length).toFixed(1) : null;

  async function addCanned() {
    if (!ncTitle.trim() || !ncBody.trim()) return;
    try { const d = await adminCreateCanned({ title: ncTitle.trim(), body: ncBody.trim() }); setCanned(c => [...c, d.canned].sort((a, b) => a.title.localeCompare(b.title))); setNcTitle(""); setNcBody(""); } catch { /* ignore */ }
  }
  async function removeCanned(id) {
    try { await adminDeleteCanned(id); setCanned(c => c.filter(x => x.id !== id)); } catch { /* ignore */ }
  }

  async function loadList() {
    setTickets(null);
    try { const d = await adminListTickets(filter); setTickets(d.tickets || []); setCounts(d.counts || {}); }
    catch { setTickets([]); }
  }
  async function open(id) {
    setActive(null);
    try { setActive(await adminGetTicket(id)); } catch { /* ignore */ }
  }
  async function send() {
    if (!reply.trim() || busy || !active) return;
    setBusy(true);
    try {
      let attachmentUrl = null;
      if (file) { try { attachmentUrl = (await uploadUserAsset(file, "image")).url; } catch { /* ignore */ } }
      await adminReply(active.ticket.id, { body: reply.trim(), attachmentUrl });
      setReply(""); setFile(null);
      setActive(await adminGetTicket(active.ticket.id));
      loadList();
    } catch { /* ignore */ }
    setBusy(false);
  }
  async function setMeta(patch) {
    if (!active) return;
    try { const { ticket } = await adminSetStatus(active.ticket.id, patch); setActive(a => ({ ...a, ticket: { ...a.ticket, ...ticket } })); loadList(); }
    catch { /* ignore */ }
  }

  const totalOpen = (counts.open || 0) + (counts.in_progress || 0) + (counts.waiting_on_user || 0);

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", color: T.text }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Support</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {avgCsat && <span style={{ fontSize: 13, color: T.muted }}>CSAT <b style={{ color: "#f5c518" }}>{avgCsat}/5</b> ({rated.length})</span>}
            <span style={{ fontSize: 13, color: T.muted }}>{totalOpen} active · {Object.values(counts).reduce((a, b) => a + b, 0)} total</span>
            <button onClick={() => setShowCanned(true)} style={btnGhost}>Canned replies</button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 20px" }}>User tickets and conversations.</p>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {[["", "All"], ...STATUSES.map(s => [s, STATUS[s].label])].map(([id, label]) => {
            const sel = filter === id;
            const n = id === "" ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[id] || 0);
            return (
              <button key={id || "all"} onClick={() => { setFilter(id); setActive(null); }}
                style={{ padding: "7px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${sel ? "rgba(124,92,252,0.55)" : T.border}`, background: sel ? "rgba(124,92,252,0.16)" : "rgba(255,255,255,0.03)", color: sel ? "#fff" : T.muted }}>
                {label} {n ? <span style={{ opacity: 0.7 }}>({n})</span> : null}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: active ? "minmax(280px, 0.8fr) 1.2fr" : "1fr", gap: 18, alignItems: "start" }}>
          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tickets === null ? <div style={{ color: T.faint, fontSize: 13 }}>Loading…</div>
              : tickets.length === 0 ? <div style={{ color: T.faint, fontSize: 13, padding: "20px 0" }}>No tickets.</div>
              : tickets.map(t => {
                const sel = active?.ticket?.id === t.id;
                return (
                  <button key={t.id} onClick={() => open(t.id)}
                    style={{ textAlign: "left", padding: "12px 14px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
                      background: sel ? "rgba(124,92,252,0.12)" : T.surface, border: `1px solid ${sel ? "rgba(124,92,252,0.4)" : T.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                      {overdueHours(t) > 0 && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#f87171", background: "rgba(248,113,113,0.14)", padding: "2px 7px", borderRadius: 99, whiteSpace: "nowrap" }}>OVERDUE {overdueHours(t)}h</span>}
                      <Badge status={t.status} />
                    </div>
                    <div style={{ fontSize: 11.5, color: T.faint, marginTop: 4 }}>
                      {t.user_email || "—"} · {CAT_LABEL[t.category] || t.category} · {relTime(t.last_message_at)}
                      {t.priority === "high" && <span style={{ color: PRIO_C.high, fontWeight: 700 }}> · HIGH</span>}
                      {t.csat_rating ? <> · <Stars n={t.csat_rating} /></> : null}
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Detail */}
          {active && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{active.ticket.subject}</h2>
                <button onClick={() => setActive(null)} style={{ background: "none", border: "none", color: T.faint, fontSize: 18, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>
                {active.ticket.user_email || "—"} · {CAT_LABEL[active.ticket.category] || active.ticket.category} · opened {relTime(active.ticket.created_at)}
              </div>

              {/* Controls */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}>Status
                  <select value={active.ticket.status} onChange={e => setMeta({ status: e.target.value })} style={selStyle}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}>Priority
                  <select value={active.ticket.priority} onChange={e => setMeta({ priority: e.target.value })} style={selStyle}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </div>

              {active.ticket.csat_rating ? (
                <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>User rated <Stars n={active.ticket.csat_rating} />{active.ticket.csat_comment ? ` — "${active.ticket.csat_comment}"` : ""}</div>
              ) : null}

              {/* Thread */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, maxHeight: 420, overflowY: "auto" }}>
                {active.messages.map(m => {
                  const admin = m.sender === "admin";
                  return (
                    <div key={m.id} style={{ alignSelf: admin ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                      <div style={{ fontSize: 11, color: T.faint, marginBottom: 4, textAlign: admin ? "right" : "left" }}>{admin ? "You (Support)" : "User"} · {relTime(m.created_at)}</div>
                      <div style={{ padding: "10px 13px", borderRadius: 11, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
                        background: admin ? "rgba(124,92,252,0.16)" : T.surface2, border: `1px solid ${admin ? "rgba(124,92,252,0.3)" : T.border}`, color: T.text }}>
                        {m.body}
                        {m.attachment_url && (
                          <a href={m.attachment_url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 8 }}>
                            <img src={m.attachment_url} alt="attachment" style={{ maxWidth: "100%", borderRadius: 8, border: `1px solid ${T.border}` }} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply */}
              <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12 }}>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply to the user…" rows={3}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 14, fontFamily: "inherit", lineHeight: 1.5 }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {canned.length > 0 && (
                      <select value="" onChange={e => { const c = canned.find(x => x.id === e.target.value); if (c) setReply(r => r ? `${r}\n\n${c.body}` : c.body); }} style={selStyle}>
                        <option value="">Insert canned…</option>
                        {canned.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    )}
                    <button onClick={() => fileRef.current?.click()} style={btnGhost}>📎 {file ? "Change" : "Attach"}</button>
                    {file && <span style={{ fontSize: 12, color: T.faint }}>{file.name}</span>}
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
                  </div>
                  <button onClick={send} disabled={busy || !reply.trim()} style={{ ...btnPrimary, opacity: busy || !reply.trim() ? 0.5 : 1 }}>{busy ? "Sending…" : "Send reply"}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canned replies manager */}
        {showCanned && (
          <div onClick={() => setShowCanned(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: "100%", maxHeight: "84vh", overflowY: "auto", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Canned replies</h2>
                <button onClick={() => setShowCanned(false)} style={{ background: "none", border: "none", color: T.faint, fontSize: 18, cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                {canned.length === 0 ? <div style={{ fontSize: 13, color: T.faint }}>No canned replies yet.</div>
                  : canned.map(c => (
                    <div key={c.id} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{c.title}</span>
                        <button onClick={() => removeCanned(c.id)} style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                      </div>
                      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 5, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.body}</div>
                    </div>
                  ))}
              </div>

              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>Add a canned reply</div>
                <input value={ncTitle} onChange={e => setNcTitle(e.target.value)} placeholder="Title (e.g. How credits work)" maxLength={80}
                  style={{ ...selStyle, width: "100%", padding: "10px 12px" }} />
                <textarea value={ncBody} onChange={e => setNcBody(e.target.value)} placeholder="Reply text…" rows={4}
                  style={{ ...selStyle, width: "100%", padding: "10px 12px", resize: "vertical", fontFamily: "inherit" }} />
                <button onClick={addCanned} disabled={!ncTitle.trim() || !ncBody.trim()} style={{ ...btnPrimary, alignSelf: "flex-start", opacity: !ncTitle.trim() || !ncBody.trim() ? 0.5 : 1 }}>Add</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
