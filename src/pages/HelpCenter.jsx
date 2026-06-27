/**
 * HelpCenter.jsx — public /help knowledge base. Searchable, grouped by category.
 * Mirrors the FAQ/landing dark styling. Linked from the footer and the Support page.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getSession } from "../services/auth/authService";
import { listHelpArticles } from "../services/help/helpService";
import AuthModal from "../ui/AuthModal";

const CSS = `
  .helpp *, .helpp *::before, .helpp *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .helpp { --bg:#0F0E1A; --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.04); --yellow:#f5c518; --text:#f5f5fb; --muted:#c4c4d4; --dim:#9a9aae; --font-display:'Bebas Neue',sans-serif; --font-body:'Outfit',sans-serif; --font-mono:'JetBrains Mono',monospace; --container:1380px;
    background:var(--bg); color:var(--text); font-family:var(--font-body); min-height:100vh; -webkit-font-smoothing:antialiased; }
  .helpp .container { max-width:var(--container); margin:0 auto; padding:0 40px; }
  @media (max-width:768px){ .helpp .container { padding:0 20px; } }
  .helpp .nav { position:fixed; top:0; left:0; right:0; z-index:200; background:rgba(15,14,26,0.92); backdrop-filter:blur(20px); border-bottom:1px solid var(--border2); height:60px; }
  .helpp .nav-inner { max-width:var(--container); margin:0 auto; padding:0 40px; height:60px; display:flex; align-items:center; justify-content:space-between; }
  @media (max-width:768px){ .helpp .nav-inner { padding:0 20px; } }
  .helpp .nav-logo { display:flex; align-items:center; gap:10px; text-decoration:none; background:none; border:none; cursor:pointer; }
  .helpp .nav-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .helpp .nav-link { font-family:var(--font-body); font-size:15px; color:var(--muted); text-decoration:none; padding:7px 14px; border-radius:6px; transition:color 0.2s; background:none; border:none; cursor:pointer; }
  .helpp .nav-link:hover { color:var(--text); }
  .helpp .btn-yellow { font-family:var(--font-body); font-size:15px; font-weight:700; color:#0F0E1A; background:var(--yellow); border:none; border-radius:7px; padding:9px 18px; cursor:pointer; transition:opacity 0.2s; }
  .helpp .btn-yellow:hover { opacity:0.85; }
  .helpp .help-hero { padding:118px 0 18px; }
  .helpp .section-label { font-family:var(--font-mono); font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--yellow); margin-bottom:20px; display:flex; align-items:center; gap:12px; }
  .helpp .section-label::before { content:''; width:24px; height:1px; background:var(--yellow); }
  .helpp .section-h { font-family:var(--font-display); font-size:clamp(46px,5vw,96px); line-height:0.93; color:var(--text); letter-spacing:-0.5px; }
  .helpp .section-h .yellow { color:var(--yellow); }
  .helpp .search { margin:26px 0 8px; max-width:620px; }
  .helpp .search input { width:100%; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; color:var(--text); font-family:var(--font-body); font-size:16px; padding:15px 18px; outline:none; }
  .helpp .search input:focus { border-color:rgba(245,197,24,0.4); }
  .helpp .help-body { padding:30px 0 90px; }
  .helpp .cat { margin-bottom:38px; }
  .helpp .cat-h { font-family:var(--font-mono); font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--yellow); margin-bottom:14px; }
  .helpp .a-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px; }
  @media (max-width:560px){ .helpp .a-grid { grid-template-columns:1fr; } }
  .helpp .a-card { display:block; text-decoration:none; border:1px solid var(--border); border-radius:12px; padding:18px 20px; transition:border-color 0.2s, transform 0.2s, background 0.2s; background:rgba(255,255,255,0.015); }
  .helpp .a-card:hover { border-color:rgba(245,197,24,0.3); transform:translateY(-2px); background:rgba(255,255,255,0.03); }
  .helpp .a-title { font-size:16px; font-weight:700; color:var(--text); }
  .helpp .a-excerpt { font-size:14px; color:var(--dim); margin-top:5px; line-height:1.5; }
  .helpp .empty { color:var(--dim); font-size:15px; padding:30px 0; }
  .helpp .footer { border-top:1px solid var(--border2); padding:48px 0; }
  .helpp .footer-inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:24px; }
  .helpp .footer-links { display:flex; gap:28px; flex-wrap:wrap; }
  .helpp .footer-link { font-family:var(--font-body); font-size:14px; color:var(--dim); text-decoration:none; cursor:pointer; background:none; border:none; transition:color 0.2s; }
  .helpp .footer-link:hover { color:var(--muted); }
  .helpp .footer-copy { font-family:var(--font-mono); font-size:12px; color:var(--dim); letter-spacing:1px; }
`;

export default function HelpCenter() {
  const navigate = useNavigate();
  const [session, setSession]   = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [articles, setArticles] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => { getSession().then(setSession).catch(() => {}); }, []);
  useEffect(() => { listHelpArticles().then(d => setArticles(d.articles)).catch(() => setArticles([])); }, []);

  const handleCTA = () => { if (session) navigate("/dashboard"); else setAuthOpen(true); };

  const filtered = useMemo(() => {
    const list = articles || [];
    const term = q.trim().toLowerCase();
    const matched = !term ? list : list.filter(a =>
      a.title.toLowerCase().includes(term) ||
      (a.excerpt || "").toLowerCase().includes(term) ||
      (a.category || "").toLowerCase().includes(term));
    const byCat = {};
    for (const a of matched) (byCat[a.category] ||= []).push(a);
    return byCat;
  }, [articles, q]);

  const cats = Object.keys(filtered);

  return (
    <div className="helpp">
      <style>{CSS}</style>

      <nav className="nav">
        <div className="nav-inner">
          <button className="nav-logo" onClick={() => navigate("/")}>
            <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
          </button>
          <div className="nav-right">
            <a href="/about" className="nav-link">About Us</a>
            <a href="/faq" className="nav-link">FAQ</a>
            <a href="/#pricing" className="nav-link">Pricing</a>
            {!session && <button className="nav-link" onClick={() => setAuthOpen(true)}>Log in</button>}
            <button className="btn-yellow" onClick={handleCTA}>{session ? "Go to Dashboard" : "Get Started"}</button>
          </div>
        </div>
      </nav>

      <section className="help-hero">
        <div className="container">
          <div className="section-label">Help Center</div>
          <h1 className="section-h">How can we <span className="yellow">help?</span></h1>
          <div className="search">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles…" autoFocus />
          </div>
        </div>
      </section>

      <section className="help-body">
        <div className="container">
          {articles == null ? (
            <div className="empty">Loading…</div>
          ) : cats.length === 0 ? (
            <div className="empty">
              {q ? "No articles match your search." : "No articles yet — check back soon."}
              {" "}Still need help? <Link to="/support" style={{ color: "#f5c518", textDecoration: "none" }}>Contact support</Link>.
            </div>
          ) : (
            cats.map(cat => (
              <div className="cat" key={cat}>
                <div className="cat-h">{cat}</div>
                <div className="a-grid">
                  {filtered[cat].map(a => (
                    <Link key={a.slug} to={`/help/${a.slug}`} className="a-card">
                      <div className="a-title">{a.title}</div>
                      {a.excerpt && <div className="a-excerpt">{a.excerpt}</div>}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
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
              <a href="/help" className="footer-link">Help Center</a>
              <a href="/faq" className="footer-link">FAQ</a>
              <a href="/terms" className="footer-link">Terms</a>
              <a href="/privacy" className="footer-link">Privacy</a>
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
