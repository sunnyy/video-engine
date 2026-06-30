import { signInWithGoogle } from "../services/auth/authService";
import { showToast } from "../ui/Toast";

const handleGoogleSignIn = async () => {
  try { await signInWithGoogle(); }
  catch (e) { showToast(e.message || "Sign-in failed — please try again."); }
};

/**
 * Auth — branded two-panel sign-in. Left: marketing/brand panel (desktop only).
 * Right: the sign-in card. Mirrors the landing page's dark premium styling.
 */

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const CSS = `
  .authp *, .authp *::before, .authp *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .authp { --bg:#0F0E1A; --card:#13131f; --border:rgba(255,255,255,0.08); --yellow:#f5c518; --text:#f5f5fb; --muted:#c4c4d4; --dim:#9a9aae;
    --font-head:'Montserrat',sans-serif; --font-body:'Outfit',sans-serif; --font-mono:'JetBrains Mono',monospace;
    min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--font-body); -webkit-font-smoothing:antialiased; }
  .authp .auth-grid { min-height:100vh; display:grid; grid-template-columns:1.1fr 1fr; }
  @media (max-width:900px){ .authp .auth-grid { grid-template-columns:1fr; } }

  /* ── Left marketing panel ── */
  .authp .auth-aside { position:relative; overflow:hidden; padding:44px 52px; display:flex; flex-direction:column; justify-content:space-between;
    border-right:1px solid var(--border); background:linear-gradient(160deg,#13111d 0%,#0d0c16 60%,#0a0910 100%); }
  @media (max-width:900px){ .authp .auth-aside { display:none; } }
  .authp .auth-aside-bg { position:absolute; inset:0; pointer-events:none;
    background:
      radial-gradient(circle at 18% 12%, rgba(245,197,24,0.12), transparent 42%),
      radial-gradient(circle at 90% 90%, rgba(124,92,252,0.12), transparent 45%),
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size:auto, auto, 54px 54px, 54px 54px; mask-image:radial-gradient(ellipse 90% 80% at 30% 30%, #000 50%, transparent 100%); }
  .authp .auth-logo { position:relative; z-index:1; display:inline-flex; }
  .authp .auth-logo img { height:42px; width:auto; }
  .authp .auth-aside-body { position:relative; z-index:1; }
  .authp .auth-rating { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); margin-bottom:26px; }
  .authp .auth-rating .stars { color:var(--yellow); letter-spacing:2px; }
  .authp .auth-rating strong { color:var(--text); font-weight:800; }
  .authp .auth-headline { font-family:var(--font-head); font-weight:700; font-size:clamp(32px,3.4vw,46px); line-height:1.1; letter-spacing:-0.02em; color:var(--text); margin-bottom:28px; max-width:14ch; }
  .authp .auth-headline span { color:var(--yellow); }
  .authp .auth-points { list-style:none; display:flex; flex-direction:column; gap:16px; }
  .authp .auth-points li { display:flex; align-items:flex-start; gap:12px; font-size:15px; color:var(--muted); line-height:1.5; }
  .authp .auth-points li::before { content:''; flex-shrink:0; width:6px; height:6px; border-radius:50%; background:var(--yellow); margin-top:8px; box-shadow:0 0 12px rgba(245,197,24,0.6); }
  .authp .auth-aside-foot { position:relative; z-index:1; font-family:var(--font-mono); font-size:12px; color:var(--dim); letter-spacing:1px; }

  /* ── Right sign-in panel ── */
  .authp .auth-main { position:relative; display:flex; align-items:center; justify-content:center; padding:40px 24px; }
  .authp .auth-back { position:absolute; top:24px; left:28px; font-size:13px; color:var(--dim); text-decoration:none; transition:color 0.2s; }
  .authp .auth-back:hover { color:var(--text); }
  .authp .auth-card { width:100%; max-width:400px; text-align:center; }
  .authp .auth-card-logo { height:52px; width:auto; margin:0 auto 22px; display:block; }
  @media (min-width:901px){ .authp .auth-card-logo { display:none; } }
  .authp .auth-title { font-family:var(--font-head); font-weight:700; font-size:26px; letter-spacing:-0.02em; color:var(--text); margin-bottom:8px; }
  .authp .auth-sub { font-size:14px; color:var(--dim); margin-bottom:30px; }
  .authp .auth-google { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:13px 18px; border-radius:11px;
    background:#fff; color:#1a1a22; border:none; font-family:var(--font-body); font-size:15px; font-weight:700; cursor:pointer; transition:transform 0.15s, box-shadow 0.2s; }
  .authp .auth-google:hover { transform:translateY(-1px); box-shadow:0 14px 34px rgba(0,0,0,0.4); }
  .authp .auth-perk { margin-top:18px; font-family:var(--font-mono); font-size:12px; letter-spacing:0.5px; color:var(--yellow); }
  .authp .auth-divider { display:flex; align-items:center; gap:14px; margin:26px 0; color:var(--dim); font-size:12px; }
  .authp .auth-divider::before, .authp .auth-divider::after { content:''; flex:1; height:1px; background:var(--border); }
  .authp .auth-legal { font-size:12px; color:var(--dim); line-height:1.6; }
  .authp .auth-legal a { color:var(--muted); text-decoration:none; }
  .authp .auth-legal a:hover { color:var(--text); text-decoration:underline; }
`;

export default function Auth() {
  return (
    <div className="authp">
      <style>{CSS}</style>
      <div className="auth-grid">

        {/* Marketing panel (desktop) */}
        <aside className="auth-aside">
          <div className="auth-aside-bg" />
          <a href="/" className="auth-logo">
            <img src="/assets/images/logo.png" alt="Vidquence" />
          </a>
          <div className="auth-aside-body">
            <div className="auth-rating">
              <span className="stars">★★★★★</span>
              <strong>4.8</strong>
              <span>· Trusted by <strong>1,500+</strong> creators</span>
            </div>
            <h1 className="auth-headline">The only video tool you'll ever <span>need.</span></h1>
            <ul className="auth-points">
              <li>Prompt an idea — get a finished, edited video in minutes.</li>
              <li>Six video tools plus a full image &amp; audio suite.</li>
              <li>Auto-publish to YouTube, Instagram, TikTok &amp; more.</li>
            </ul>
          </div>
          <div className="auth-aside-foot">© 2026 Vidquence</div>
        </aside>

        {/* Sign-in panel */}
        <main className="auth-main">
          <a href="/" className="auth-back">← Back to home</a>
          <div className="auth-card">
            <img className="auth-card-logo" src="/assets/images/favicon.png" alt="Vidquence" />
            <h2 className="auth-title">Welcome to Vidquence</h2>
            <p className="auth-sub">Sign in to start creating — free to begin.</p>

            <button className="auth-google" onClick={handleGoogleSignIn}>
              {GoogleIcon}
              Continue with Google
            </button>

            <div className="auth-perk">✦ Every service, one subscription · Cancel anytime</div>

            <div className="auth-divider">Secure sign-in via Google</div>

            <div className="auth-legal">
              By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
