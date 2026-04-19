/**
 * Section.jsx — reusable section block for legal pages.
 */
export default function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{
        fontSize: 20, fontWeight: 700, color: "#fff",
        marginBottom: 16, paddingBottom: 10,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        letterSpacing: "0.02em",
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.65)" }}>
        {children}
      </div>
    </div>
  );
}

export function P({ children }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}

export function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 20, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ color: "rgba(255,255,255,0.65)" }}>{item}</li>
      ))}
    </ul>
  );
}

export function Highlight({ children }) {
  return (
    <div style={{
      background: "rgba(124,92,252,0.08)",
      border: "1px solid rgba(124,92,252,0.2)",
      borderRadius: 10,
      padding: "14px 20px",
      marginBottom: 16,
      fontSize: 14,
      color: "rgba(255,255,255,0.75)",
      lineHeight: 1.7,
    }}>
      {children}
    </div>
  );
}

export function ContactBlock({ email }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "20px 24px",
      marginTop: 16,
    }}>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Contact</div>
      <div style={{ fontSize: 15, color: "#e8e8f0", fontWeight: 500 }}>PX Galaxy Studio</div>
      <a href={`mailto:${email}`} style={{ color: "#7c5cfc", fontSize: 14, display: "block", marginTop: 8 }}>{email}</a>
    </div>
  );
}
