/**
 * SystemStatusBanner — a thin app-wide notice for signed-in users when a service is down.
 * Polls the PUBLIC /api/status (sanitized component labels only), links to the full /status page,
 * and hides itself when everything is operational. Mounted at the top of the authenticated layout.
 */
import { useEffect, useState } from "react";
import { serverFetch } from "../services/serverApi";

export default function SystemStatusBanner() {
  const [down, setDown] = useState(null); // null = operational/unknown; else array of down component names

  useEffect(() => {
    let alive = true;
    const load = () =>
      serverFetch("/api/status")
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          const downs = (d.components || []).filter((c) => c.status === "down").map((c) => c.name);
          setDown(downs.length ? downs : null);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!down) return null;

  const subject = down.length === 1 ? `${down[0]} is` : `${down.length} services are`;
  return (
    <a
      href="/status"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "7px 16px", background: "rgba(250,204,21,0.12)", borderBottom: "1px solid rgba(250,204,21,0.30)",
        color: "#facc15", fontSize: 12.5, fontWeight: 600, textDecoration: "none", fontFamily: "'Outfit',sans-serif",
        flexShrink: 0,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#facc15", flexShrink: 0 }} />
      {subject} temporarily unavailable — we’re on it. View status →
    </a>
  );
}
