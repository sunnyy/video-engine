import { useNavigate } from "react-router-dom";

export default function LayoutEditor() {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16, color: "#888", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 32 }}>🚧</div>
      <div style={{ fontSize: 18, color: "#ccc" }}>Layout Editor unavailable</div>
      <div style={{ fontSize: 14 }}>The beat-based editor has been removed.</div>
      <button onClick={() => navigate("/admin/layouts")} style={{ marginTop: 8, padding: "8px 20px", background: "#7c5cfc", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" }}>
        Back to Layouts
      </button>
    </div>
  );
}
