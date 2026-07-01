/**
 * FAQ.jsx — standalone Frequently Asked Questions page.
 * Mirrors the landing page's dark premium styling. Linked from the footer.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../services/auth/authService";
import AuthModal from "../ui/AuthModal";

const FAQS = [
  {
    q: "How is Vidquence different from other AI video tools?",
    a: "Most tools give you plain text over stock footage. Vidquence is a full AI production studio — every beat of your video gets its own layout, visual design, pacing, and narrative intent. Beyond auto-generated videos, you get a complete creative suite: Product Video Ads, Poster Studio, Thumbnail Generator, Banner Design, Voice Studio, Virtual Try-On, and more — all in one platform.",
  },
  {
    q: "What are credits and how are they used?",
    a: "Credits power every AI action on the platform — video generation, product ads, posters, thumbnails, voiceovers, and more. Each action has a listed credit cost. Check the Credits page for current costs on each service.",
  },
  {
    q: "What services are included?",
    a: "Six video services — Prompt to Video, SaaS Video, Product Video, Social to Video, Typography Video, and Auto Captions — plus a full creative suite: AI Images, Product Poster, Banner Design, Thumbnail Generator, Virtual Try-On, Voice Studio (TTS), and Speech to Text. Every video is fully editable in the built-in editor, and Automation can generate and auto-publish to your socials on a schedule. All in one dashboard.",
  },
  {
    q: "What niches and languages are supported?",
    a: "17 niches including entertainment, gaming, finance, spiritual, food, sports, tech, lifestyle, education, travel, health, skincare, comedy, motivational, news, music, and business. Videos support multilingual scripts and voiceovers including Hindi, English, Arabic, French, Spanish, Portuguese, Urdu, and Turkish.",
  },
  {
    q: "Can I use my own footage and images?",
    a: "Yes. Upload your own images, videos, or talking head footage directly in the editor. For talking head videos, upload your recorded clip and the AI builds the full video around it with captions, layouts, and music. The AI features are optional — the editor works with whatever assets you bring.",
  },
  {
    q: "Can I edit the video after it's generated?",
    a: "Fully. Every element of every beat is editable — change text, swap visuals, adjust timing, change transitions, add overlays, update captions, swap background music, and add sound effects. The AI produces a production-ready starting point. You have complete control from there.",
  },
  {
    q: "Does Product Video Ads work for any product?",
    a: "Yes — clothing, fashion, wearables (watches, earphones, shoes), beauty products, food, gadgets, and more. For clothing, the system uses AI model avatars to show the product being worn. For other products, it generates cinematic product photography shots. Upload one product photo and get a full video ad with multiple scenes, transitions, and background music.",
  },
  {
    q: "Is there a free plan?",
    a: "There's no free tier — every account starts on a paid plan. Each video uses real AI compute, so a paid entry point keeps generation fast and high-quality for everyone. The Starter plan is $29/month for 600 credits, with no long-term commitment — cancel anytime.",
  },
  {
    q: "What are the plan limits?",
    a: "Starter includes 600 credits per month, Pro 1,500, and Max 4,000. Every plan unlocks every service on the platform; Automation & auto-publish are available on Pro and Max. Check the pricing section for current rates.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings at any time. You keep your remaining credits until the end of your billing period. No cancellation fees.",
  },
];

const CSS = `
  .faqp *, .faqp *::before, .faqp *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .faqp { --bg:#0F0E1A; --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.04); --yellow:#f5c518; --yellow-dim:rgba(245,197,24,0.10); --text:#f5f5fb; --muted:#c4c4d4; --dim:#9a9aae; --font-display:'Bebas Neue',sans-serif; --font-body:'Outfit',sans-serif; --font-mono:'JetBrains Mono',monospace; --container:1380px;
    background:var(--bg); color:var(--text); font-family:var(--font-body); min-height:100vh; -webkit-font-smoothing:antialiased; }
  .faqp .container { max-width:var(--container); margin:0 auto; padding:0 40px; }
  @media (max-width:768px){ .faqp .container { padding:0 20px; } }

  .faqp .nav { position:fixed; top:0; left:0; right:0; z-index:200; background:rgba(15,14,26,0.92); backdrop-filter:blur(20px); border-bottom:1px solid var(--border2); height:60px; }
  .faqp .nav-inner { max-width:var(--container); margin:0 auto; padding:0 40px; height:60px; display:flex; align-items:center; justify-content:space-between; }
  @media (max-width:768px){ .faqp .nav-inner { padding:0 20px; } }
  .faqp .nav-logo { display:flex; align-items:center; gap:10px; text-decoration:none; background:none; border:none; cursor:pointer; }
  .faqp .nav-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .faqp .nav-link { font-family:var(--font-body); font-size:15px; color:var(--muted); text-decoration:none; padding:7px 14px; border-radius:6px; transition:color 0.2s; }
  .faqp .nav-link:hover { color:var(--text); }
  .faqp .btn-yellow { font-family:var(--font-body); font-size:15px; font-weight:700; color:#0F0E1A; background:var(--yellow); border:none; border-radius:7px; padding:9px 18px; cursor:pointer; transition:opacity 0.2s; }
  .faqp .btn-yellow:hover { opacity:0.85; }

  .faqp .faq-hero { padding:128px 0 24px; }
  .faqp .section-label { font-family:var(--font-mono); font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--yellow); margin-bottom:20px; display:flex; align-items:center; gap:12px; }
  .faqp .section-label::before { content:''; width:24px; height:1px; background:var(--yellow); }
  .faqp .section-h { font-family:var(--font-display); font-size:clamp(46px,5vw,104px); line-height:0.93; color:var(--text); letter-spacing:-0.5px; }
  .faqp .section-h .yellow { color:var(--yellow); }

  .faqp .faq-list { max-width:820px; margin:18px 0 0; padding-bottom:90px; }

  .faqp .footer { border-top:1px solid var(--border2); padding:48px 0; }
  .faqp .footer-inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:24px; }
  .faqp .footer-links { display:flex; gap:28px; flex-wrap:wrap; }
  .faqp .footer-link { font-family:var(--font-body); font-size:14px; color:var(--dim); text-decoration:none; cursor:pointer; background:none; border:none; transition:color 0.2s; }
  .faqp .footer-link:hover { color:var(--muted); }
  .faqp .footer-copy { font-family:var(--font-mono); font-size:12px; color:var(--dim); letter-spacing:1px; }
`;

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "22px 0", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, color: "#f5f5fb", fontWeight: 500, lineHeight: 1.5 }}>{q}</span>
        <span style={{ color: "#f5c518", fontSize: 22, flexShrink: 0, fontWeight: 300, lineHeight: 1, width: 24, textAlign: "center" }}>{open ? "−" : "+"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 14, fontFamily: "'Outfit',sans-serif", fontSize: 15, color: "#c4c4d4", lineHeight: 1.75 }}>{a}</div>
      )}
    </div>
  );
}

export default function FAQ() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => { getSession().then(setSession).catch(() => {}); }, []);

  const handleCTA = () => {
    if (session) { navigate("/dashboard"); return; }
    setAuthOpen(true);
  };

  return (
    <div className="faqp">
      <style>{CSS}</style>

      <nav className="nav">
        <div className="nav-inner">
          <button className="nav-logo" onClick={() => navigate("/")}>
            <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
          </button>
          <div className="nav-right">
            <a href="/about" className="nav-link">About Us</a>
            <a href="/#samples" className="nav-link">Samples</a>
            <a href="/#services" className="nav-link">Services</a>
            <a href="/#pricing" className="nav-link">Pricing</a>
            {!session && (
              <button className="nav-link" onClick={() => setAuthOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Log in</button>
            )}
            <button className="btn-yellow" onClick={handleCTA}>{session ? "Go to Dashboard" : "Get Started"}</button>
          </div>
        </div>
      </nav>

      <section className="faq-hero">
        <div className="container">
          <div className="section-label">Questions</div>
          <h1 className="section-h">
            Things people
            <br />
            <span className="yellow">actually ask.</span>
          </h1>
          <div className="faq-list">
            {FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <button className="nav-logo" onClick={() => navigate("/")}>
              <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
            </button>
            <div className="footer-links">
              <a href="/about" className="footer-link">About</a>
              <a href="/faq" className="footer-link">FAQ</a>
              <a href="/terms" className="footer-link">Terms</a>
              <a href="/privacy" className="footer-link">Privacy</a>
              <a href="/refunds" className="footer-link">Refunds</a>
              <a href="/cookies" className="footer-link">Cookies</a>
            </div>
            <a href="mailto:hello@vidquence.com" className="footer-link">hello@vidquence.com</a>
            <div className="footer-copy">© 2026 VIDQUENCE</div>
          </div>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
