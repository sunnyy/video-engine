/**
 * HelpArticle.jsx — public /help/:slug article page. Renders markdown via the safe Markdown renderer.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getSession } from "../services/auth/authService";
import { getHelpArticle } from "../services/help/helpService";
import Markdown from "../ui/Markdown";
import AuthModal from "../ui/AuthModal";

const CSS = `
  .helpa *, .helpa *::before, .helpa *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .helpa { --bg:#0F0E1A; --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.04); --yellow:#f5c518; --text:#f5f5fb; --muted:#c4c4d4; --dim:#9a9aae; --font-display:'Bebas Neue',sans-serif; --font-body:'Outfit',sans-serif; --font-mono:'JetBrains Mono',monospace; --container:1380px;
    background:var(--bg); color:var(--text); font-family:var(--font-body); min-height:100vh; -webkit-font-smoothing:antialiased; }
  .helpa .container { max-width:var(--container); margin:0 auto; padding:0 40px; }
  @media (max-width:768px){ .helpa .container { padding:0 20px; } }
  .helpa .nav { position:fixed; top:0; left:0; right:0; z-index:200; background:rgba(15,14,26,0.92); backdrop-filter:blur(20px); border-bottom:1px solid var(--border2); height:60px; }
  .helpa .nav-inner { max-width:var(--container); margin:0 auto; padding:0 40px; height:60px; display:flex; align-items:center; justify-content:space-between; }
  @media (max-width:768px){ .helpa .nav-inner { padding:0 20px; } }
  .helpa .nav-logo { display:flex; align-items:center; gap:10px; text-decoration:none; background:none; border:none; cursor:pointer; }
  .helpa .nav-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .helpa .nav-link { font-family:var(--font-body); font-size:15px; color:var(--muted); text-decoration:none; padding:7px 14px; border-radius:6px; transition:color 0.2s; background:none; border:none; cursor:pointer; }
  .helpa .nav-link:hover { color:var(--text); }
  .helpa .btn-yellow { font-family:var(--font-body); font-size:15px; font-weight:700; color:#0F0E1A; background:var(--yellow); border:none; border-radius:7px; padding:9px 18px; cursor:pointer; transition:opacity 0.2s; }
  .helpa .btn-yellow:hover { opacity:0.85; }
  .helpa .wrap { max-width:780px; margin:0 auto; padding:112px 0 90px; }
  .helpa .crumb { font-family:var(--font-body); font-size:14px; color:var(--dim); text-decoration:none; }
  .helpa .crumb:hover { color:var(--muted); }
  .helpa .cat { font-family:var(--font-mono); font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--yellow); margin:22px 0 10px; }
  .helpa .title { font-family:var(--font-body); font-weight:800; font-size:34px; line-height:1.15; color:var(--text); letter-spacing:-0.01em; }
  .helpa .meta { font-size:13px; color:var(--dim); margin-top:10px; }
  .helpa .article-body { margin-top:26px; }
  .helpa .helpful { margin-top:48px; padding:22px 24px; border:1px solid var(--border); border-radius:14px; background:rgba(255,255,255,0.02); }
  .helpa .helpful-h { font-size:15px; font-weight:700; color:var(--text); }
  .helpa .helpful-p { font-size:14px; color:var(--dim); margin-top:6px; line-height:1.6; }
  .helpa .helpful a { color:var(--yellow); text-decoration:none; }
  .helpa .footer { border-top:1px solid var(--border2); padding:48px 0; }
  .helpa .footer-inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:24px; }
  .helpa .footer-links { display:flex; gap:28px; flex-wrap:wrap; }
  .helpa .footer-link { font-family:var(--font-body); font-size:14px; color:var(--dim); text-decoration:none; cursor:pointer; background:none; border:none; }
  .helpa .footer-link:hover { color:var(--muted); }
  .helpa .footer-copy { font-family:var(--font-mono); font-size:12px; color:var(--dim); letter-spacing:1px; }
`;

export default function HelpArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [session, setSession]   = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [article, setArticle]   = useState(undefined); // undefined = loading, null = not found

  useEffect(() => { getSession().then(setSession).catch(() => {}); }, []);
  useEffect(() => {
    setArticle(undefined);
    getHelpArticle(slug).then(d => setArticle(d.article)).catch(() => setArticle(null));
    window.scrollTo(0, 0);
  }, [slug]);

  const handleCTA = () => { if (session) navigate("/dashboard"); else setAuthOpen(true); };
  const updated = article?.updated_at ? new Date(article.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <div className="helpa">
      <style>{CSS}</style>

      <nav className="nav">
        <div className="nav-inner">
          <button className="nav-logo" onClick={() => navigate("/")}>
            <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
          </button>
          <div className="nav-right">
            <a href="/help" className="nav-link">Help Center</a>
            <a href="/faq" className="nav-link">FAQ</a>
            <button className="btn-yellow" onClick={handleCTA}>{session ? "Go to Dashboard" : "Get Started"}</button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="wrap">
          <Link to="/help" className="crumb">← All articles</Link>

          {article === undefined ? (
            <div className="meta" style={{ marginTop: 30 }}>Loading…</div>
          ) : article === null ? (
            <>
              <div className="title" style={{ marginTop: 22 }}>Article not found</div>
              <p className="meta">This article may have been moved or unpublished. <Link to="/help" style={{ color: "#f5c518", textDecoration: "none" }}>Back to Help Center</Link>.</p>
            </>
          ) : (
            <>
              <div className="cat">{article.category}</div>
              <h1 className="title">{article.title}</h1>
              {updated && <div className="meta">Updated {updated}</div>}
              <div className="article-body">
                <Markdown source={article.body} />
              </div>
              <div className="helpful">
                <div className="helpful-h">Still need help?</div>
                <div className="helpful-p">
                  Can't find what you're looking for? <Link to="/support">Open a support ticket</Link> and our team will help you out.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <button className="nav-logo" onClick={() => navigate("/")}>
              <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
            </button>
            <div className="footer-links">
              <a href="/help" className="footer-link">Help Center</a>
              <a href="/faq" className="footer-link">FAQ</a>
              <a href="/terms" className="footer-link">Terms</a>
              <a href="/privacy" className="footer-link">Privacy</a>
            </div>
            <div className="footer-copy">© 2026 VIDQUENCE</div>
          </div>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
