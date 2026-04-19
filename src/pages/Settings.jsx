import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { signOut } from "../services/auth/authService";
import { deleteUserAccount } from "../services/auth/deleteAccount";
import { useCreditsStore } from "../store/useCreditsStore";
import { serverFetch } from "../services/serverApi";

/* ── Constants ── */
const NICHES = [
  "Entertainment","Gaming","Finance","Spiritual","Food","Sports",
  "Tech","Lifestyle","Education","Travel","Health","Comedy",
  "Business","Motivational","News","Music","Skincare",
];
const GOALS = [
  { value: "Grow My Audience",          label: "🚀 Grow My Audience" },
  { value: "Sell Products or Services", label: "💰 Sell Products or Services" },
  { value: "Educate and Inform",        label: "🎓 Educate and Inform" },
  { value: "Entertain People",          label: "🎭 Entertain People" },
];
const DURATIONS = [
  { value: "short",  label: "Short  (15–30 sec)" },
  { value: "medium", label: "Medium (30–60 sec)" },
  { value: "long",   label: "Long   (60+ sec)" },
];
const LANGUAGES = [
  { value: "english",  label: "English" },
  { value: "hindi",    label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
  { value: "tamil",    label: "Tamil" },
  { value: "telugu",   label: "Telugu" },
];

/* ── Icons ── */
const Icons = {
  folder:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  gallery:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/></svg>,
  box:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  credits:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  mic:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="21" x2="12" y2="17"/><line x1="9" y1="21" x2="15" y2="21"/></svg>,
  message:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

function NavItem({ icon, label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-[10px] px-3 py-[7px] rounded-[8px] text-left border-0 transition-all cursor-pointer"
      style={{
        background: active ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.04)" : "transparent",
        color:      active ? "#a78bfa" : hov ? "#d8d8ea" : "#9494a8",
      }}>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span className="text-[15px] font-medium flex-1" style={{ fontFamily: "'Syne',sans-serif" }}>{label}</span>
    </button>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="mb-5">
      <div className="px-3 mb-1 text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>{title}</div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[2px] mb-4" style={{ color: "#f5c518", fontFamily: "'JetBrains Mono',monospace" }}>
      {children}
    </h2>
  );
}

function Card({ children, danger }) {
  return (
    <div className="rounded-[14px] border p-6 flex flex-col gap-5"
      style={{ background: danger ? "rgba(239,68,68,0.03)" : "#111118", borderColor: danger ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)" }}>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className="relative shrink-0 cursor-pointer border-0 p-0 transition-all"
      style={{ width: 40, height: 22, borderRadius: 11, background: checked ? "#f5c518" : "rgba(255,255,255,0.1)" }}>
      <div className="absolute top-[3px] transition-all rounded-full"
        style={{ width: 16, height: 16, background: checked ? "#0b0b10" : "#55556a", left: checked ? 21 : 3 }} />
    </button>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold mb-2" style={{ color: "#8888a8", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-[9px] rounded-[8px] text-[14px] outline-none cursor-pointer"
        style={{ background: "#0b0b10", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>
        <option value="">— Not set —</option>
        {options.map(o => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Main ── */
export default function Settings() {
  const navigate = useNavigate();
  const { balance, fetchCredits } = useCreditsStore();

  const [user, setUser] = useState(null);

  // Preferences
  const [prefNiche,    setPrefNiche]    = useState("");
  const [prefGoal,     setPrefGoal]     = useState("");
  const [prefDuration, setPrefDuration] = useState("short");
  const [prefLanguage, setPrefLanguage] = useState("english");
  const [prefSaving,   setPrefSaving]   = useState(false);
  const [prefSaved,    setPrefSaved]    = useState(false);

  // Notifications (UI only)
  const [notifExport,  setNotifExport]  = useState(true);
  const [notifLow,     setNotifLow]     = useState(true);
  const [notifUpdates, setNotifUpdates] = useState(false);

  // Delete
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting,    setDeleting]    = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchCredits();
    serverFetch("/api/user/profile").then(r => r.json()).then(d => {
      if (d.niche)            setPrefNiche(Array.isArray(d.niche) ? d.niche[0] || "" : d.niche);
      if (d.goal)             setPrefGoal(d.goal);
      if (d.default_duration) setPrefDuration(d.default_duration);
      if (d.default_language) setPrefLanguage(d.default_language);
    }).catch(() => {});
  }, []);

  async function handleSavePrefs() {
    setPrefSaving(true);
    setPrefSaved(false);
    try {
      await serverFetch("/api/user/profile", {
        method: "POST",
        body: JSON.stringify({ niche: prefNiche || null, goal: prefGoal || null, default_duration: prefDuration, default_language: prefLanguage }),
      });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2500);
    } catch {} finally {
      setPrefSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteUserAccount();
      await signOut();
      navigate("/");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  const avatar = user?.user_metadata?.avatar_url;
  const name   = user?.user_metadata?.full_name || user?.user_metadata?.name || "—";
  const email  = user?.email || "—";

  return (
    <div className="flex min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col shrink-0 border-r" style={{ width: 220, borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
        <div className="px-4 py-5 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="flex flex-col gap-[2px] mb-5">
            <NavItem icon={Icons.folder}  label="Videos"  active={false} onClick={() => navigate("/dashboard")} />
            <NavItem icon={Icons.gallery} label="Images"     active={false} onClick={() => navigate("/image-generation")} />
            <NavItem icon={Icons.mic}     label="Transcribe" active={false} onClick={() => navigate("/transcription")} />
            <NavItem icon={Icons.box}     label="Assets"     active={false} onClick={() => navigate("/assets")} />
            <NavItem icon={Icons.credits} label="Credits" active={false} onClick={() => navigate("/credits")} />
          </div>
          <NavSection title="Account">
            <NavItem icon={Icons.settings} label="Settings" active={true}  onClick={() => {}} />
            <NavItem icon={Icons.message}  label="Feedback" active={false} onClick={() => navigate("/feedback")} />
          </NavSection>
        </nav>

        <div className="px-3 py-4 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-3 py-[7px] rounded-[8px] text-[14px] font-mono"
            style={{ background: "rgba(255,255,255,0.04)", color: balance !== null && balance < 10 ? "#f97316" : "#7c5cfc" }}>
            <span>⚡ Credits</span>
            <span className="font-bold">{balance ?? "—"}</span>
          </div>
          <button onClick={async () => { await signOut(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[15px] border-0 cursor-pointer transition-all text-left"
            style={{ background: "transparent", color: "#f87171" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main — all sections stacked ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] px-10 py-10 flex flex-col gap-10">

          {/* ── Profile ── */}
          <section>
            <SectionLabel>Profile</SectionLabel>
            <Card>
              <div className="flex items-center gap-5">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: "2px solid rgba(245,197,24,0.3)" }} />
                ) : (
                  <div className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-[24px] font-bold" style={{ background: "rgba(245,197,24,0.12)", color: "#f5c518", border: "2px solid rgba(245,197,24,0.3)" }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="text-[18px] font-bold text-[#e8e8f0] truncate" style={{ fontFamily: "'Syne',sans-serif" }}>{name}</div>
                  <div className="text-[14px] truncate" style={{ color: "#8888a8" }}>{email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-[11px]" style={{ color: "#606078", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>SIGNED IN VIA GOOGLE</span>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* ── Preferences ── */}
          <section>
            <SectionLabel>Preferences</SectionLabel>
            <Card>
              <SelectField label="Default Niche"          value={prefNiche}    onChange={setPrefNiche}    options={NICHES} />
              <SelectField label="Default Goal"           value={prefGoal}     onChange={setPrefGoal}     options={GOALS} />
              <SelectField label="Default Video Duration" value={prefDuration} onChange={setPrefDuration} options={DURATIONS} />
              <SelectField label="Default Language"       value={prefLanguage} onChange={setPrefLanguage} options={LANGUAGES} />
              <button onClick={handleSavePrefs} disabled={prefSaving}
                className="self-start px-5 py-2 rounded-[8px] text-[14px] font-bold border-0 cursor-pointer transition-all"
                style={{ background: prefSaved ? "rgba(34,197,94,0.2)" : "#f5c518", color: prefSaved ? "#22c55e" : "#0b0b10", opacity: prefSaving ? 0.7 : 1, fontFamily: "'Outfit',sans-serif" }}>
                {prefSaving ? "Saving…" : prefSaved ? "✓ Saved" : "Save Preferences"}
              </button>
            </Card>
          </section>

          {/* ── Notifications ── */}
          <section>
            <SectionLabel>Notifications</SectionLabel>
            <Card>
              {[
                { label: "Email me when video export is ready", sub: "Get notified when your render is done",     checked: notifExport,  set: setNotifExport },
                { label: "Email me when credits are low",       sub: "Alert when balance drops below 10 credits", checked: notifLow,     set: setNotifLow },
                { label: "Product updates and tips",            sub: "Occasional emails about new features",      checked: notifUpdates, set: setNotifUpdates },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-1">
                  <div>
                    <div className="text-[14px] font-medium" style={{ color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>{item.label}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>{item.sub}</div>
                  </div>
                  <Toggle checked={item.checked} onChange={item.set} />
                </div>
              ))}
              <div className="text-[11px] mt-1" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>NOTIFICATION BACKEND COMING SOON</div>
            </Card>
          </section>

          {/* ── Danger Zone ── */}
          <section>
            <SectionLabel>Danger Zone</SectionLabel>
            <Card danger>
              <div>
                <div className="text-[15px] font-bold mb-1" style={{ color: "#f87171", fontFamily: "'Syne',sans-serif" }}>Delete Account</div>
                <div className="text-[13px] mb-4" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
                  Permanently deletes your account, all videos, images, credits, and data. This action is irreversible and cannot be undone.
                </div>
                {!showConfirm ? (
                  <button onClick={() => setShowConfirm(true)}
                    className="px-4 py-2 rounded-[8px] text-[13px] font-semibold cursor-pointer border transition-all"
                    style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#f87171", fontFamily: "'Outfit',sans-serif" }}>
                    Delete My Account
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 p-4 rounded-[10px] border" style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <div className="text-[13px] font-semibold" style={{ color: "#f87171", fontFamily: "'Outfit',sans-serif" }}>
                      Type <span className="font-mono font-bold">DELETE</span> to confirm
                    </div>
                    <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                      placeholder="DELETE" className="w-full rounded-[8px] px-3 py-[9px] text-[14px] outline-none"
                      style={{ background: "#0b0b10", border: "1px solid rgba(239,68,68,0.3)", color: "#e8e8f0", fontFamily: "'JetBrains Mono',monospace" }} />
                    {deleteError && <div className="text-[12px]" style={{ color: "#f87171" }}>{deleteError}</div>}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowConfirm(false); setConfirmText(""); setDeleteError(""); }}
                        className="px-4 py-2 rounded-[7px] text-[13px] font-semibold cursor-pointer border transition-all"
                        style={{ background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
                        Cancel
                      </button>
                      <button onClick={handleDeleteAccount} disabled={confirmText !== "DELETE" || deleting}
                        className="px-4 py-2 rounded-[7px] text-[13px] font-bold border-0 transition-all"
                        style={{
                          background: confirmText === "DELETE" ? "#ef4444" : "rgba(239,68,68,0.2)",
                          color:      confirmText === "DELETE" ? "#fff" : "#f87171",
                          opacity:    deleting ? 0.6 : 1,
                          cursor:     confirmText !== "DELETE" || deleting ? "not-allowed" : "pointer",
                          fontFamily: "'Outfit',sans-serif",
                        }}>
                        {deleting ? "Deleting…" : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
