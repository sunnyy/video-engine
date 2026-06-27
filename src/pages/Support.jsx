import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import { createTicket, listMyTickets, getMyTicket, replyToTicket, closeTicket, submitCsat } from "../services/support/supportService";

const T = { bg: "#090b11", surface: "#0e1018", surface2: "#14141e", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc" };

const CATEGORIES = [
  { id: "technical", label: "Technical / Bug" },
  { id: "billing",   label: "Billing & Credits" },
  { id: "quality",   label: "Video Quality" },
  { id: "account",   label: "Account" },
  { id: "other",     label: "Other" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const STATUS = {
  open:            { label: "Open",                c: "#f5c518" },
  in_progress:     { label: "In progress",         c: "#38bdf8" },
  waiting_on_user: { label: "Awaiting your reply",  c: "#a78bfa" },
  resolved:        { label: "Resolved",            c: "#34d399" },
  closed:          { label: "Closed",              c: "#8896a8" },
};

function relTime(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.open;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: `${s.c}22`, color: s.c, whiteSpace: "nowrap" }}>{s.label}</span>;
}

const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, color: T.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
const btnPrimary = { padding: "11px 18px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnGhost = { padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.03)", color: T.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };

// Reusable message composer with an optional screenshot.
function Composer({ onSend, sending, placeholder }) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const submit = async () => {
    if (!body.trim() || sending) return;
    await onSend(body.trim(), file);
    setBody(""); setFile(null);
  };
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={placeholder} rows={3}
        style={{ ...inputStyle, resize: "vertical", background: "transparent", border: "none", padding: 0 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => fileRef.current?.click()} style={btnGhost}>📎 {file ? "Change image" : "Attach screenshot"}</button>
          {file && <span style={{ fontSize: 12, color: T.faint, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name} <button onClick={() => setFile(null)} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer" }}>✕</button></span>}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
        <button onClick={submit} disabled={sending || !body.trim()} style={{ ...btnPrimary, opacity: sending || !body.trim() ? 0.5 : 1 }}>{sending ? "Sending…" : "Send"}</button>
      </div>
    </div>
  );
}

// CSAT — shown once a ticket is resolved/closed; one rating per ticket.
function CsatBlock({ ticket, onRated }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  if (ticket.csat_rating) {
    return (
      <div style={{ padding: "14px 16px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 14, textAlign: "center", color: T.muted, fontSize: 13 }}>
        Thanks for your feedback — you rated this <span style={{ color: "#f5c518" }}>{"★".repeat(ticket.csat_rating)}{"☆".repeat(5 - ticket.csat_rating)}</span>
      </div>
    );
  }
  const submit = async () => {
    if (!rating || busy) return;
    setBusy(true);
    try { await submitCsat(ticket.id, { rating, comment: comment.trim() }); onRated?.(); } catch { /* ignore */ }
    setBusy(false);
  };
  return (
    <div style={{ padding: 16, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 14, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>How was our support?</div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: rating ? 12 : 0 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, lineHeight: 1, color: (hover || rating) >= n ? "#f5c518" : "#3a3a48" }}>★</button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment (optional)" maxLength={500} style={{ ...inputStyle, margin: "0 0 10px" }} />
          <button onClick={submit} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.5 : 1 }}>{busy ? "Submitting…" : "Submit rating"}</button>
        </>
      )}
    </div>
  );
}

export default function Support() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState("list");          // list | new | thread
  const [tickets, setTickets] = useState(null);
  const [active, setActive] = useState(null);         // { ticket, messages }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // new-ticket form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [message, setMessage] = useState("");
  const [newFile, setNewFile] = useState(null);
  const newFileRef = useRef(null);

  useEffect(() => {
    const t = params.get("t");
    if (t) openTicket(t);
    else loadList();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadList() {
    setView("list");
    try { const d = await listMyTickets(); setTickets(d.tickets || []); } catch { setTickets([]); }
  }
  async function openTicket(id) {
    setErr(""); setView("thread"); setActive(null);
    try { setActive(await getMyTicket(id)); } catch (e) { setErr(e.message); setView("list"); }
  }

  async function uploadIf(file) {
    if (!file) return null;
    try { return (await uploadUserAsset(file, "image")).url; } catch { return null; }
  }

  async function submitNew() {
    if (!subject.trim() || !message.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const attachmentUrl = await uploadIf(newFile);
      const { ticket } = await createTicket({ subject: subject.trim(), category, message: message.trim(), attachmentUrl });
      setSubject(""); setMessage(""); setCategory("technical"); setNewFile(null);
      await openTicket(ticket.id);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function sendReply(body, file) {
    if (!active) return;
    setBusy(true);
    try {
      const attachmentUrl = await uploadIf(file);
      await replyToTicket(active.ticket.id, { body, attachmentUrl });
      setActive(await getMyTicket(active.ticket.id));
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function onClose() {
    if (!active) return;
    await closeTicket(active.ticket.id).catch(() => {});
    setActive(await getMyTicket(active.ticket.id));
  }

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>

          {/* ── LIST ── */}
          {view === "list" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0 }}>Help & Support</h1>
                  <p style={{ fontSize: 13.5, color: T.muted, marginTop: 6 }}>Open a ticket and we'll get back to you by email and here.</p>
                </div>
                <button onClick={() => { setView("new"); setErr(""); }} style={btnPrimary}>New ticket</button>
              </div>

              <a href="/help" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textDecoration: "none", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 22 }}>
                <span style={{ fontSize: 13.5, color: T.text }}>📚 Browse the <strong>Help Center</strong> — many questions are answered there instantly.</span>
                <span style={{ fontSize: 13, color: T.accent, fontWeight: 700, whiteSpace: "nowrap" }}>Open →</span>
              </a>

              {tickets === null ? (
                <div style={{ color: T.faint, fontSize: 13 }}>Loading…</div>
              ) : tickets.length === 0 ? (
                <div style={{ padding: "56px 0", textAlign: "center", color: T.faint, fontSize: 14 }}>No tickets yet. Click “New ticket” to ask us anything.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tickets.map(t => (
                    <button key={t.id} onClick={() => openTicket(t.id)}
                      style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", padding: "14px 16px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: "inherit" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                        <div style={{ fontSize: 12, color: T.faint, marginTop: 3 }}>{CAT_LABEL[t.category] || t.category} · {relTime(t.last_message_at)}</div>
                      </div>
                      <StatusBadge status={t.status} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── NEW ── */}
          {view === "new" && (
            <>
              <button onClick={loadList} style={{ ...btnGhost, marginBottom: 18 }}>← All tickets</button>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 18px" }}>New ticket</h1>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" maxLength={160} style={inputStyle} />
                <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue or question…" rows={6} style={{ ...inputStyle, resize: "vertical" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => newFileRef.current?.click()} style={btnGhost}>📎 {newFile ? "Change image" : "Attach screenshot"}</button>
                  {newFile && <span style={{ fontSize: 12, color: T.faint }}>{newFile.name} <button onClick={() => setNewFile(null)} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer" }}>✕</button></span>}
                  <input ref={newFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setNewFile(e.target.files?.[0] || null)} />
                </div>
                {err && <div style={{ fontSize: 13, color: "#f87171" }}>{err}</div>}
                <button onClick={submitNew} disabled={busy || !subject.trim() || !message.trim()} style={{ ...btnPrimary, alignSelf: "flex-start", opacity: busy || !subject.trim() || !message.trim() ? 0.5 : 1 }}>
                  {busy ? "Submitting…" : "Submit ticket"}
                </button>
              </div>
            </>
          )}

          {/* ── THREAD ── */}
          {view === "thread" && (
            <>
              <button onClick={loadList} style={{ ...btnGhost, marginBottom: 18 }}>← All tickets</button>
              {!active ? (
                <div style={{ color: T.faint, fontSize: 13 }}>Loading…</div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
                    <div style={{ minWidth: 0 }}>
                      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0 }}>{active.ticket.subject}</h1>
                      <div style={{ fontSize: 12.5, color: T.faint, marginTop: 5 }}>{CAT_LABEL[active.ticket.category] || active.ticket.category} · opened {relTime(active.ticket.created_at)}</div>
                    </div>
                    <StatusBadge status={active.ticket.status} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                    {active.messages.map(m => {
                      const mine = m.sender === "user";
                      return (
                        <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                          <div style={{ fontSize: 11, color: T.faint, marginBottom: 4, textAlign: mine ? "right" : "left" }}>{mine ? "You" : "Support"} · {relTime(m.created_at)}</div>
                          <div style={{ padding: "11px 14px", borderRadius: 12, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap",
                            background: mine ? "rgba(124,92,252,0.16)" : T.surface, border: `1px solid ${mine ? "rgba(124,92,252,0.3)" : T.border}`, color: T.text }}>
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

                  {err && <div style={{ fontSize: 13, color: "#f87171", marginBottom: 10 }}>{err}</div>}

                  {["resolved", "closed"].includes(active.ticket.status) && (
                    <CsatBlock ticket={active.ticket} onRated={() => openTicket(active.ticket.id)} />
                  )}

                  {active.ticket.status === "closed" ? (
                    <div style={{ padding: "14px 16px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, color: T.faint, fontSize: 13, textAlign: "center" }}>
                      This ticket is closed. Open a new ticket if you still need help.
                    </div>
                  ) : (
                    <>
                      <Composer onSend={sendReply} sending={busy} placeholder="Write a reply…" />
                      <button onClick={onClose} style={{ ...btnGhost, marginTop: 12 }}>Mark as resolved & close</button>
                    </>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
