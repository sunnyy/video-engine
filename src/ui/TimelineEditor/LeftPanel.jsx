import { useState } from "react";
import MediaModal    from "./modals/MediaModal";
import TextModal     from "./modals/TextModal";
import StickersModal from "./modals/StickersModal";
import AudioModal    from "./modals/AudioModal";
import MusicModal    from "./modals/MusicModal";

const PANELS = [
  {
    id: "media", label: "Media", color: "#4a9eff",
    icon: (color) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
  {
    id: "text", label: "Text", color: "#f5c518",
    icon: (color) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"/>
        <line x1="9" y1="20" x2="15" y2="20"/>
        <line x1="12" y1="4" x2="12" y2="20"/>
      </svg>
    ),
  },
  {
    id: "stickers", label: "Stickers", color: "#ff9f40",
    icon: (color) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    ),
  },
  {
    id: "music", label: "Music", color: "#34d399",
    icon: (color) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
      </svg>
    ),
  },
  {
    id: "audio", label: "Audio", color: "#ff7eb3",
    icon: (color) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
];

export default function LeftPanel() {
  const [activeModal, setActiveModal] = useState(null);
  const close = () => setActiveModal(null);

  return (
    <>
      <div
        style={{
          width: 80,
          flexShrink: 0,
          background: "#111118",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 10,
          gap: 2,
        }}
      >
        {PANELS.map((panel) => {
          const active = activeModal === panel.id;
          const iconColor = active ? panel.color : `${panel.color}99`;
          return (
            <button
              key={panel.id}
              onClick={() => setActiveModal(active ? null : panel.id)}
              title={panel.label}
              style={{
                width: 68,
                padding: "10px 0 8px",
                border: "none",
                borderRadius: 9,
                cursor: "pointer",
                background: active ? `${panel.color}18` : "transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
              }}
              onMouseOver={(e) => { if (!active) e.currentTarget.style.background = `${panel.color}10`; }}
              onMouseOut={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {panel.icon(iconColor)}
              <span style={{
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.02em",
                color: "#ffffff",
              }}>
                {panel.label}
              </span>
            </button>
          );
        })}
      </div>

      {activeModal === "media"    && <MediaModal    onClose={close} />}
      {activeModal === "text"     && <TextModal     onClose={close} />}
      {activeModal === "stickers" && <StickersModal onClose={close} />}
      {activeModal === "music"    && <MusicModal    onClose={close} />}
      {activeModal === "audio"    && <AudioModal    onClose={close} />}
    </>
  );
}
