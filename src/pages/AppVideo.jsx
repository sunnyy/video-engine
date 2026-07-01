/**
 * AppVideo.jsx — standalone App Promo Video service.
 * Paste an App Store / Play Store link → we fetch the app's info, screenshots and reviews → write a
 * script → design + voice + build an editable promo timeline. Forked from SaaS/Promo (never edits it).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { useCreditsStore } from "../store/useCreditsStore";
import { showToast } from "../ui/Toast";
import { planAppScript, createAppVideo } from "../services/ai/appVideo/generateAppVideo";
import { CREDIT_COSTS } from "../core/utils/creditCosts";
import { VoiceLanguageField } from "../ui/fields/voiceLanguage.jsx";
import { OrientationField } from "../ui/fields/orientation.jsx";
import { DurationField } from "../ui/fields/duration.jsx";

const T = { bg: "#0a0a10", surface: "#13131c", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", accent: "#7c5cfc" };

const LENGTHS = [
  { id: 15, label: "Short (~15s)", scenes: 1 },
  { id: 30, label: "Standard (~30s)", scenes: 3 },
  { id: 45, label: "Long (~45s)", scenes: 5 },
];
const DUR_OPTS = LENGTHS.map((l) => ({ id: l.id, label: `~${l.id}s` }));

const costFor = (sc) => CREDIT_COSTS.promo_video?.[sc] ?? CREDIT_COSTS.promo_video?.[3] ?? 120;

export default function AppVideo() {
  const navigate = useNavigate();
  const fetchCredits = useCreditsStore((s) => s.fetchCredits);

  const [appUrl, setAppUrl] = useState("");
  const [lengthId, setLengthId] = useState(30);
  const [format, setFormat] = useState("9:16");
  const [language, setLanguage] = useState("en");
  const [voiceId, setVoiceId] = useState(null);
  const [notes, setNotes] = useState("");
  const [script, setScript] = useState("");      // reviewed/edited script (optional)
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState(null);

  const sceneCount = (LENGTHS.find((l) => l.id === lengthId) || LENGTHS[1]).scenes;
  const estCost = costFor(sceneCount);
  const opts = () => ({ app_url: appUrl.trim(), target_duration: lengthId, format_ratio: format, language, voice_id: voiceId, notes });

  async function handleReview() {
    if (!appUrl.trim() || busy) return;
    setBusy(true); setError(null); setPhase("Reading the app listing & writing your script…");
    try {
      const { full_script } = await planAppScript(opts());
      setScript(full_script || "");
      setReviewing(true);
    } catch (e) {
      setError(e?.message || "Couldn't fetch that app — check the link.");
    } finally { setBusy(false); setPhase(""); }
  }

  async function handleCreate() {
    if (!appUrl.trim() || busy) return;
    setBusy(true); setError(null);
    setPhase(reviewing ? "Designing your promo…" : "Fetching the app & building your promo…");
    try {
      const body = { ...opts(), ...(reviewing && script.trim() ? { script: script.trim() } : {}) };
      const result = await createAppVideo(body);
      fetchCredits?.();
      if (result?.incomplete && result.projectId) {
        showToast(result.message || "Saved — finish it shortly from Projects.");
        navigate("/projects");
        return;
      }
      const pid = result?.project?.editor_project_id;
      if (!pid) throw new Error("No video was produced — please try again.");
      navigate(`/video-editor/${pid}`, { state: { from: "/app-video" } });
    } catch (e) {
      setError(e?.code === "NO_CREDITS" ? "Not enough credits for this video." : (e?.message || "Something went wrong. Please try again."));
    } finally { setBusy(false); setPhase(""); }
  }

  const field = { width: "100%", padding: "10px 12px", borderRadius: 10, background: T.surface, color: T.text, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
  const lbl = { fontSize: 12, fontWeight: 700, color: T.muted, display: "block", marginBottom: 6 };

  return (
    <AppLayout>
      <style>{`@keyframes av-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 90px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0 }}>
            App Promo Video <span style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "3px 8px", borderRadius: 7, verticalAlign: "middle", marginLeft: 8 }}>BETA</span>
          </h1>
          <p style={{ color: T.muted, fontSize: 14, margin: "8px 0 28px", lineHeight: 1.5 }}>
            Paste your App Store or Play Store link. We pull the app's screenshots, info and reviews and turn them into a polished promo video — ready to edit.
          </p>

          <label style={lbl}>App Store / Play Store link</label>
          <input value={appUrl} onChange={(e) => { setAppUrl(e.target.value); setReviewing(false); }} disabled={busy}
            placeholder="https://apps.apple.com/us/app/…  or  https://play.google.com/store/apps/details?id=…"
            style={{ ...field, marginBottom: 16 }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <DurationField value={lengthId} onChange={setLengthId} options={DUR_OPTS} accent={T.accent} />
            <OrientationField value={format} onChange={setFormat} accent={T.accent} />
            <VoiceLanguageField language={language} onLanguageChange={setLanguage} voiceId={voiceId} onVoiceChange={setVoiceId} accent={T.accent} />
          </div>

          <label style={lbl}>Angle / notes <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy}
            placeholder="e.g. focus on the offline mode, or target busy parents" style={{ ...field, marginBottom: 16 }} />

          {reviewing && (
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Review & edit the script</label>
              <textarea value={script} onChange={(e) => setScript(e.target.value)} disabled={busy} rows={6}
                style={{ ...field, resize: "vertical", lineHeight: 1.5 }} />
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Edit freely — this exact text is what the voiceover will say.</div>
            </div>
          )}

          {error && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 12 }}>
            {!reviewing && (
              <button onClick={handleReview} disabled={!appUrl.trim() || busy}
                style={{ flex: "0 0 auto", padding: "13px 18px", borderRadius: 12, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", color: T.text, fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: (!appUrl.trim() || busy) ? "default" : "pointer" }}>
                Review script first
              </button>
            )}
            <button onClick={handleCreate} disabled={!appUrl.trim() || busy}
              style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", fontWeight: 800, fontSize: 15, fontFamily: "inherit", cursor: (!appUrl.trim() || busy) ? "default" : "pointer", background: (!appUrl.trim() || busy) ? "rgba(124,92,252,0.4)" : T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {busy ? (
                <>
                  <span style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "av-spin 0.8s linear infinite" }} />
                  {phase || "Working…"}
                </>
              ) : (reviewing ? `Create video · ~${estCost} credits` : `Generate video · ~${estCost} credits`)}
            </button>
          </div>
          {busy && <div style={{ marginTop: 10, fontSize: 12, color: T.muted, textAlign: "center" }}>This takes a minute or two — keep this tab open.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
