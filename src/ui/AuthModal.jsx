import { useEffect } from "react";
import { createPortal } from "react-dom";
import { signInWithGoogle } from "../services/auth/authService";

/**
 * AuthModal — a compact sign-in popup (Google OAuth). Rendered via portal so it can be
 * opened from anywhere (landing CTAs, hero chatbox, service cards). Self-contained styling
 * so it doesn't depend on the host page's CSS variables.
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
  @keyframes vqAuthOverlayIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes vqAuthCardIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .vq-auth-overlay { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 24px;
    background: rgba(6,6,12,0.72); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: vqAuthOverlayIn 0.18s ease; }
  .vq-auth-modal { position: relative; width: 100%; max-width: 400px; padding: 38px 34px 30px; text-align: center;
    background: #13131f; border: 1px solid rgba(255,255,255,0.09); border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,0.55);
    font-family: 'Outfit', sans-serif; animation: vqAuthCardIn 0.2s cubic-bezier(0.2,0.8,0.2,1); }
  .vq-auth-glow { position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: radial-gradient(circle at 50% 0%, rgba(245,197,24,0.12), transparent 60%); }
  .vq-auth-close { position: absolute; top: 14px; right: 16px; background: none; border: none; color: #6b6b80; font-size: 22px; line-height: 1; cursor: pointer; transition: color 0.2s; }
  .vq-auth-close:hover { color: #e8e8f0; }
  .vq-auth-logo { position: relative; height: 50px; width: auto; margin: 0 auto 20px; display: block; }
  .vq-auth-title { position: relative; font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 24px; letter-spacing: -0.02em; color: #f5f5fb; margin: 0 0 8px; }
  .vq-auth-sub { position: relative; font-size: 14px; color: #9a9aae; margin: 0 0 28px; }
  .vq-auth-google { position: relative; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 13px 18px; border-radius: 11px;
    background: #fff; color: #1a1a22; border: none; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s; }
  .vq-auth-google:hover { transform: translateY(-1px); box-shadow: 0 14px 34px rgba(0,0,0,0.4); }
  .vq-auth-perk { position: relative; margin-top: 18px; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.5px; color: #f5c518; }
  .vq-auth-divider { position: relative; display: flex; align-items: center; gap: 14px; margin: 24px 0; color: #6b6b80; font-size: 12px; }
  .vq-auth-divider::before, .vq-auth-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.09); }
  .vq-auth-legal { position: relative; font-size: 12px; color: #6b6b80; line-height: 1.6; }
  .vq-auth-legal a { color: #9a9aae; text-decoration: none; }
  .vq-auth-legal a:hover { color: #f5f5fb; text-decoration: underline; }
`;

export default function AuthModal({ open, onClose, next = null }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="vq-auth-overlay" onClick={onClose}>
      <style>{CSS}</style>
      <div className="vq-auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vq-auth-glow" />
        <button className="vq-auth-close" onClick={onClose} aria-label="Close">×</button>
        <img className="vq-auth-logo" src="/assets/images/favicon.png" alt="Vidquence" />
        <h2 className="vq-auth-title">Welcome to Vidquence</h2>
        <p className="vq-auth-sub">Sign in to start creating — free to begin.</p>

        <button className="vq-auth-google" onClick={() => signInWithGoogle(next)}>
          {GoogleIcon}
          Continue with Google
        </button>

        <div className="vq-auth-perk">✦ Free credits on signup · No credit card required</div>

        <div className="vq-auth-divider">Secure sign-in via Google</div>

        <div className="vq-auth-legal">
          By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
        </div>
      </div>
    </div>,
    document.body,
  );
}
