import React from "react";

export default function Header() {
  return (
    <div
      style={{
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid #eee",
        background: "#fff",
        marginBottom: "20px"
      }}
    >
      <div style={{ fontWeight: 700 }}>Video Engine</div>

      <button
        style={{
          background: "#ffcc00",
          border: "none",
          padding: "10px 20px",
          borderRadius: 8,
          fontWeight: 600,
        }}
      >
        Export
      </button>
    </div>
  );
}