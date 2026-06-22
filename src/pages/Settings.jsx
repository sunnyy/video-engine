import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { signOut } from "../services/auth/authService";
import { deleteUserAccount } from "../services/auth/deleteAccount";
import { useCreditsStore } from "../store/useCreditsStore";
import { serverFetch } from "../services/serverApi";
import { NOTIFICATION_CATEGORIES } from "../config/notificationCategories";
import { getNotificationPrefs, saveNotificationPrefs } from "../services/notifications/prefsService";
import AppLayout from "../ui/AppLayout";

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
const LANGUAGES = [
  { value: "english",  label: "English" },
  { value: "hindi",    label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
  { value: "tamil",    label: "Tamil" },
  { value: "telugu",   label: "Telugu" },
];

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

export default function Settings() {
  const navigate = useNavigate();
  const { fetchCredits } = useCreditsStore();

  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(undefined); // undefined = loading

  const [prefNiche,    setPrefNiche]    = useState("");
  const [prefGoal,     setPrefGoal]     = useState("");
  const [prefLanguage, setPrefLanguage] = useState("english");
  const [prefSaving,   setPrefSaving]   = useState(false);
  const [prefSaved,    setPrefSaved]    = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({});

  const [deleteStep,        setDeleteStep]        = useState("idle"); // "idle" | "reason" | "confirm"
  const [deleteReason,      setDeleteReason]      = useState("");
  const [deleteReasonOther, setDeleteReasonOther] = useState("");
  const [confirmText,       setConfirmText]       = useState("");
  const [deleting,          setDeleting]          = useState(false);
  const [deleteError,       setDeleteError]       = useState("");
  const [avatarError,       setAvatarError]       = useState(false);

  const DELETE_REASONS = [
    "Too expensive / not worth it",
    "Missing features I need",
    "Found a better tool",
    "Only needed it temporarily",
    "Too complicated to use",
    "Video quality didn't meet expectations",
    "Other",
  ];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchCredits();
    serverFetch("/api/payments/subscription").then(r => r.json())
      .then(d => setSubscription(d.subscription || null))
      .catch(() => setSubscription(null));
    serverFetch("/api/user/profile").then(r => r.json()).then(d => {
      if (d.niche)            setPrefNiche(Array.isArray(d.niche) ? d.niche[0] || "" : d.niche);
      if (d.goal)             setPrefGoal(d.goal);
      if (d.default_language) setPrefLanguage(d.default_language);
    }).catch(() => {});
    getNotificationPrefs().then(setNotifPrefs).catch(() => {});
  }, []);

  // Toggle one channel for one category, persisting the whole prefs object.
  function setNotifChannel(categoryKey, channel, value) {
    setNotifPrefs(prev => {
      const next = { ...prev, [categoryKey]: { ...prev[categoryKey], [channel]: value } };
      saveNotificationPrefs(next).catch(() => {});
      return next;
    });
  }

  async function handleSavePrefs() {
    setPrefSaving(true);
    setPrefSaved(false);
    try {
      await serverFetch("/api/user/profile", {
        method: "POST",
        body: JSON.stringify({ niche: prefNiche || null, goal: prefGoal || null, default_language: prefLanguage }),
      });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2500);
    } catch {} finally {
      setPrefSaving(false);
    }
  }

  function resetDelete() {
    setDeleteStep("idle"); setDeleteReason(""); setDeleteReasonOther(""); setConfirmText(""); setDeleteError("");
  }

  async function handleDeleteAccount() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const reason       = deleteReason;
      const reasonDetail = deleteReason === "Other" ? deleteReasonOther : "";
      await deleteUserAccount({ reason, reasonDetail });
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
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] px-10 py-10 flex flex-col gap-10">

          {/* Profile */}
          <section>
            <SectionLabel>Profile</SectionLabel>
            <Card>
              <div className="flex items-center gap-5">
                {avatar && !avatarError ? (
                  <img src={avatar} alt={name} onError={() => setAvatarError(true)} className="w-16 h-16 rounded-full object-cover shrink-0" style={{ border: "2px solid rgba(245,197,24,0.3)" }} />
                ) : (
                  <div className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center text-[24px] font-bold" style={{ background: "rgba(245,197,24,0.12)", color: "#f5c518", border: "2px solid rgba(245,197,24,0.3)" }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="text-[18px] font-bold text-[#e8e8f0] truncate" style={{ fontFamily: "'Outfit',sans-serif" }}>{name}</div>
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

              {/* Membership */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
                <div className="text-[11px] font-bold uppercase tracking-[2px] mb-3" style={{ color: "#8888a8", fontFamily: "'JetBrains Mono',monospace" }}>Membership</div>
                {subscription === undefined ? (
                  <div className="text-[13px]" style={{ color: "#55556a" }}>Loading…</div>
                ) : subscription ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-[12px] font-bold" style={{ background: "rgba(245,197,24,0.12)", color: "#f5c518", fontFamily: "'JetBrains Mono',monospace" }}>
                        {subscription.plans?.name || "Plan"}
                      </span>
                      <span className="text-[12px]" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
                        {subscription.billing_cycle === "annual" ? "Annual" : "Monthly"} · {subscription.plans?.credits?.toLocaleString() || "—"} credits/month
                      </span>
                    </div>
                    {subscription.current_period_end && (
                      <div className="text-[12px]" style={{ color: "#55556a", fontFamily: "'Outfit',sans-serif" }}>
                        Renews {new Date(subscription.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                    <button onClick={() => navigate("/checkout?plan=" + (subscription.plans?.slug || ""))}
                      className="self-start px-3 py-1.5 rounded-[7px] text-[12px] font-semibold border transition-all cursor-pointer mt-1"
                      style={{ background: "transparent", borderColor: "rgba(245,197,24,0.3)", color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>
                      Upgrade Plan →
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="text-[13px]" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>No active plan — you're on free credits.</div>
                    <button onClick={() => navigate("/#pricing")}
                      className="self-start px-3 py-1.5 rounded-[7px] text-[12px] font-semibold border transition-all cursor-pointer"
                      style={{ background: "rgba(245,197,24,0.08)", borderColor: "rgba(245,197,24,0.3)", color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>
                      View Plans →
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* Notifications */}
          <section>
            <SectionLabel>Notifications</SectionLabel>
            <Card>
              {/* Column headers */}
              <div className="flex items-center gap-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex-1" />
                <div className="w-[64px] text-center text-[11px] font-bold uppercase tracking-[1px]" style={{ color: "#8888a8", fontFamily: "'JetBrains Mono',monospace" }}>In-app</div>
                <div className="w-[64px] text-center text-[11px] font-bold uppercase tracking-[1px]" style={{ color: "#8888a8", fontFamily: "'JetBrains Mono',monospace" }}>Email</div>
              </div>

              {NOTIFICATION_CATEGORIES.map(cat => {
                const c = notifPrefs[cat.key] || {};
                const inApp = c.in_app !== false;
                const email = c.email !== false;
                return (
                  <div key={cat.key} className="flex items-center gap-4 py-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium" style={{ color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>{cat.label}</div>
                      <div className="text-[12px] mt-0.5" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>{cat.description}</div>
                    </div>
                    {cat.locked ? (
                      <div className="text-[11px] font-semibold text-center" style={{ width: 144, color: "#55667a", fontFamily: "'Outfit',sans-serif" }}>Always on</div>
                    ) : (
                      <>
                        <div className="w-[64px] flex justify-center">
                          <Toggle checked={inApp} onChange={v => setNotifChannel(cat.key, "in_app", v)} />
                        </div>
                        <div className="w-[64px] flex justify-center">
                          <Toggle checked={email} onChange={v => setNotifChannel(cat.key, "email", v)} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </Card>
          </section>

          {/* Danger Zone */}
          <section>
            <SectionLabel>Danger Zone</SectionLabel>
            <Card danger>
              <div>
                <div className="text-[15px] font-bold mb-1" style={{ color: "#f87171", fontFamily: "'Outfit',sans-serif" }}>Delete Account</div>
                <div className="text-[13px] mb-4" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
                  Permanently deletes your account, all videos, images, credits, and data. This action is irreversible and cannot be undone.
                </div>
                {deleteStep === "idle" && (
                  <button onClick={() => setDeleteStep("reason")}
                    className="px-4 py-2 rounded-[8px] text-[13px] font-semibold cursor-pointer border transition-all"
                    style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#f87171", fontFamily: "'Outfit',sans-serif" }}>
                    Delete My Account
                  </button>
                )}

                {/* Step 1 — Reason */}
                {deleteStep === "reason" && (
                  <div className="flex flex-col gap-3 p-4 rounded-[10px] border" style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <div className="text-[13px] font-semibold" style={{ color: "#f87171", fontFamily: "'Outfit',sans-serif" }}>
                      Before you go — why are you leaving?
                    </div>
                    <div className="text-[12px]" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
                      Your feedback helps us improve. Please select a reason.
                    </div>
                    <div className="flex flex-col gap-2">
                      {DELETE_REASONS.map(r => (
                        <button key={r} onClick={() => setDeleteReason(r)}
                          className="w-full text-left px-3 py-[9px] rounded-[8px] text-[13px] border transition-all"
                          style={{
                            background:   deleteReason === r ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                            borderColor:  deleteReason === r ? "rgba(239,68,68,0.5)"  : "rgba(255,255,255,0.08)",
                            color:        deleteReason === r ? "#f87171"              : "#8888a8",
                            fontFamily:   "'Outfit',sans-serif",
                            cursor:       "pointer",
                          }}>
                          {deleteReason === r ? "● " : "○ "}{r}
                        </button>
                      ))}
                    </div>
                    {deleteReason === "Other" && (
                      <textarea value={deleteReasonOther} onChange={e => setDeleteReasonOther(e.target.value)}
                        placeholder="Tell us more (optional)…" rows={2}
                        className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none resize-none"
                        style={{ background: "#0b0b10", border: "1px solid rgba(239,68,68,0.2)", color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }} />
                    )}
                    <div className="flex gap-2 mt-1">
                      <button onClick={resetDelete}
                        className="px-4 py-2 rounded-[7px] text-[13px] font-semibold cursor-pointer border transition-all"
                        style={{ background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
                        Cancel
                      </button>
                      <button onClick={() => setDeleteStep("confirm")} disabled={!deleteReason}
                        className="px-4 py-2 rounded-[7px] text-[13px] font-bold border-0 transition-all"
                        style={{
                          background: deleteReason ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                          color:      deleteReason ? "#f87171"              : "#444",
                          cursor:     deleteReason ? "pointer"              : "not-allowed",
                          fontFamily: "'Outfit',sans-serif",
                        }}>
                        Continue →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2 — Final confirmation */}
                {deleteStep === "confirm" && (
                  <div className="flex flex-col gap-3 p-4 rounded-[10px] border" style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}>
                    <div className="text-[12px] px-3 py-2 rounded-[7px]" style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", fontFamily: "'Outfit',sans-serif" }}>
                      Reason: <span className="font-semibold">{deleteReason}</span>
                    </div>
                    <div className="text-[13px] font-semibold" style={{ color: "#f87171", fontFamily: "'Outfit',sans-serif" }}>
                      Type <span className="font-mono font-bold">DELETE</span> to permanently delete your account
                    </div>
                    <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                      placeholder="DELETE" className="w-full rounded-[8px] px-3 py-[9px] text-[14px] outline-none"
                      style={{ background: "#0b0b10", border: "1px solid rgba(239,68,68,0.3)", color: "#e8e8f0", fontFamily: "'JetBrains Mono',monospace" }} />
                    {deleteError && <div className="text-[12px]" style={{ color: "#f87171" }}>{deleteError}</div>}
                    <div className="flex gap-2">
                      <button onClick={resetDelete}
                        className="px-4 py-2 rounded-[7px] text-[13px] font-semibold cursor-pointer border transition-all"
                        style={{ background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
                        Cancel
                      </button>
                      <button onClick={handleDeleteAccount} disabled={confirmText !== "DELETE" || deleting}
                        className="px-4 py-2 rounded-[7px] text-[13px] font-bold border-0 transition-all"
                        style={{
                          background: confirmText === "DELETE" ? "#ef4444" : "rgba(239,68,68,0.2)",
                          color:      confirmText === "DELETE" ? "#fff"    : "#f87171",
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
    </AppLayout>
  );
}
