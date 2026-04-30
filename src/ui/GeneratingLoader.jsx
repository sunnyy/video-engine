export default function GeneratingLoader({ message = "Generating…", hint = null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <style>{`
        @keyframes gl-spin    { to { transform: rotate(360deg); } }
        @keyframes gl-rspin   { to { transform: rotate(-360deg); } }
        @keyframes gl-pulse   { 0%,100% { transform:scale(1);   opacity:.9; } 50% { transform:scale(1.3); opacity:.55; } }
        @keyframes gl-ripple  { 0%   { transform:scale(.55); opacity:.55; }  100% { transform:scale(2.3); opacity:0; } }
        @keyframes gl-bounce  { 0%,70%,100% { transform:translateY(0);   opacity:.25; }
                                35%         { transform:translateY(-5px); opacity:1;   } }
      `}</style>

      {/* Icon assembly */}
      <div style={{ position: "relative", width: 72, height: 72 }}>
        {/* Ripple rings */}
        <div style={{
          position: "absolute", inset: -6, borderRadius: "50%",
          border: "1px solid rgba(124,92,252,0.35)",
          animation: "gl-ripple 2.2s ease-out infinite",
        }} />
        <div style={{
          position: "absolute", inset: -6, borderRadius: "50%",
          border: "1px solid rgba(124,92,252,0.2)",
          animation: "gl-ripple 2.2s ease-out .75s infinite",
        }} />

        {/* Outer spinner — purple arc */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "2.5px solid rgba(124,92,252,0.1)",
          borderTopColor: "#7c5cfc",
          borderRightColor: "rgba(124,92,252,0.45)",
          animation: "gl-spin 1.1s linear infinite",
        }} />

        {/* Inner counter-spinner — yellow arc */}
        <div style={{
          position: "absolute", inset: 11, borderRadius: "50%",
          border: "2px solid rgba(245,197,24,0.08)",
          borderBottomColor: "#f5c518",
          borderLeftColor: "rgba(245,197,24,0.3)",
          animation: "gl-rspin 1.6s linear infinite",
        }} />

        {/* Center ✦ */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: "#7c5cfc",
          animation: "gl-pulse 2s ease-in-out infinite",
          filter: "drop-shadow(0 0 7px rgba(124,92,252,0.65))",
        }}>✦</div>
      </div>

      {/* Message + bouncing dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 13, color: "#9494a8" }}>{message}</span>
        <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {[0, 0.18, 0.36].map((d, i) => (
            <span key={i} style={{
              width: 4, height: 4, borderRadius: "50%",
              background: "#7c5cfc", display: "block",
              animation: `gl-bounce 1.3s ease-in-out ${d}s infinite`,
            }} />
          ))}
        </span>
      </div>

      {hint && <div style={{ fontSize: 11, color: "#444" }}>{hint}</div>}
    </div>
  );
}
