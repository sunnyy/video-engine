/**
 * Markdown.jsx — a tiny, dependency-free, XSS-safe markdown renderer for Help Center articles.
 *
 * Renders to React elements (never dangerouslySetInnerHTML), so any raw HTML in the source is
 * shown as literal text. Supports: # ## ### headings, **bold**, *italic*, `code`, [links](url),
 * - / * bullet lists, 1. ordered lists, > blockquotes, ``` fenced code, --- rules, paragraphs.
 * Deliberately small — enough for admin-authored docs, not a full CommonMark engine.
 */

// Inline: bold, italic, code, links. Returns an array of strings / React nodes.
function renderInline(text, keyBase) {
  const nodes = [];
  // Order matters: code first (so ** inside code isn't parsed), then links, bold, italic.
  const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-i${i++}`;
    if (tok.startsWith("`")) {
      nodes.push(<code key={key} style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 5, fontSize: "0.92em", fontFamily: "'JetBrains Mono',monospace" }}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("[")) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      const href = mm[2];
      const external = /^https?:\/\//.test(href);
      nodes.push(<a key={key} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} style={{ color: "#f5c518", textDecoration: "none" }}>{mm[1]}</a>);
    } else if (tok.startsWith("**")) {
      nodes.push(<strong key={key} style={{ color: "#e8eaf0" }}>{tok.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ source = "", style }) {
  const lines = String(source).replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0, key = 0;

  const h = { 1: { fontSize: 26, fontWeight: 800, margin: "28px 0 12px" },
              2: { fontSize: 20, fontWeight: 800, margin: "24px 0 10px" },
              3: { fontSize: 16, fontWeight: 700, margin: "20px 0 8px" } };

  while (i < lines.length) {
    let line = lines[i];

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { buf.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push(
        <pre key={key++} style={{ background: "#0b0d14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px", overflowX: "auto", fontSize: 13, lineHeight: 1.5, fontFamily: "'JetBrains Mono',monospace", color: "#cdd3e0" }}>
          {buf.join("\n")}
        </pre>
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") { i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "24px 0" }} />);
      i++; continue;
    }

    // Headings
    const hm = /^(#{1,3})\s+(.*)$/.exec(line);
    if (hm) {
      const level = hm[1].length;
      const Tag = `h${level}`;
      blocks.push(<Tag key={key++} style={{ color: "#f3f4f8", ...h[level] }}>{renderInline(hm[2], `h${key}`)}</Tag>);
      i++; continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) { buf.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      blocks.push(
        <blockquote key={key++} style={{ borderLeft: "3px solid rgba(245,197,24,0.5)", margin: "14px 0", padding: "4px 0 4px 16px", color: "#aab2c2" }}>
          {renderInline(buf.join(" "), `bq${key}`)}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; }
      blocks.push(
        <ul key={key++} style={{ margin: "10px 0", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((it, k) => <li key={k} style={{ lineHeight: 1.6 }}>{renderInline(it, `ul${key}-${k}`)}</li>)}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++; }
      blocks.push(
        <ol key={key++} style={{ margin: "10px 0", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((it, k) => <li key={k} style={{ lineHeight: 1.6 }}>{renderInline(it, `ol${key}-${k}`)}</li>)}
        </ol>
      );
      continue;
    }

    // Paragraph (gather consecutive non-blank, non-special lines)
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,3}\s|\s*[-*]\s|\s*\d+\.\s|>|```|---+$)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    blocks.push(<p key={key++} style={{ margin: "10px 0", lineHeight: 1.7 }}>{renderInline(buf.join(" "), `p${key}`)}</p>);
  }

  return <div style={{ color: "#c4ccda", fontSize: 15, ...style }}>{blocks}</div>;
}
