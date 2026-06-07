import { useState } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import EditorModal from "./EditorModal";
import * as LucideIcons from "lucide-react";

const ICON_NAMES = [
  "Activity", "AlertTriangle", "AlarmClock", "Archive", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowUp", "Award", "BarChart", "BarChart2",
  "BarChart3", "Bell", "Bookmark", "BookOpen", "Bot", "Briefcase",
  "Camera", "CheckCircle", "ChevronRight", "Clock", "Cloud", "Code",
  "Code2", "Cpu", "CreditCard", "Crown", "Database", "DollarSign",
  "Download", "Edit", "ExternalLink", "Eye", "FileText", "Flag",
  "Flame", "Folder", "Gamepad2", "Gift", "Globe", "GraduationCap",
  "Heart", "HelpCircle", "Home", "Image", "Info", "Key", "Laptop",
  "Layers", "Leaf", "LineChart", "Link", "Lock", "Mail", "MapPin",
  "Medal", "MessageCircle", "Mic", "Monitor", "Moon", "Music",
  "Package", "PenTool", "Phone", "PieChart", "Play", "Plus",
  "Rocket", "Search", "Server", "Settings", "Share2", "Shield",
  "ShieldCheck", "Smartphone", "Sparkles", "Star", "Sun", "Tag",
  "Target", "Terminal", "ThumbsUp", "Timer", "TrendingUp", "Trophy",
  "Upload", "User", "Users", "Video", "Wallet", "Wand2", "Wifi",
  "Wrench", "X", "Zap", "Pencil", "Lightbulb", "Headphones",
];

const PAGE_SIZE = 20;

export default function IconModal({ onClose, onSelect }) {
  const [color, setColor] = useState("#ffffff");
  const [query, setQuery] = useState("");
  const [page, setPage]   = useState(0);

  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const addLayer    = useTimelineStore((s) => s.addLayer);

  const filtered = query.trim()
    ? ICON_NAMES.filter((n) => n.toLowerCase().includes(query.trim().toLowerCase()))
    : ICON_NAMES;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage   = Math.min(page, Math.max(0, totalPages - 1));
  const visible    = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function handleSearch(val) {
    setQuery(val);
    setPage(0);
  }

  function handleSelect(iconName) {
    if (onSelect) {
      onSelect(iconName, color);
      onClose();
      return;
    }
    const id = crypto.randomUUID();
    const totalDuration = project?.format?.duration ?? 30;
    const start = currentTime;
    const end   = Math.min(start + 5, totalDuration);
    addLayer({
      id, trackId: id,
      type: "icon",
      name: iconName,
      iconName,
      visible: true, locked: false,
      start, end,
      zIndex: (project?.layers?.length ?? 0) + 5,
      style: { color },
      sfx: null,
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scale: 1, opacity: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
      transition: { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0 } },
    });
    onClose();
  }

  return (
    <EditorModal title="Icons" onClose={onClose} width={520}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Search icons..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: "100%",
              background: "#1e1e2e",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              color: "#e8e8f0",
              fontSize: 13,
              padding: "6px 10px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#7070a0" }}>Color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 32, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 2, background: "transparent" }}
          />
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#55556a", marginBottom: 10 }}>
        {filtered.length === 0
          ? "No icons found"
          : `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, minHeight: 200 }}>
        {visible.map((name) => {
          const IconComponent = LucideIcons[name];
          if (!IconComponent) return null;
          return (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              title={name}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 9,
                cursor: "pointer",
                padding: "12px 6px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(251,146,60,0.15)"; e.currentTarget.style.borderColor = "rgba(251,146,60,0.4)"; }}
              onMouseOut={(e)  => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <IconComponent size={32} color={color} strokeWidth={1.5} />
              <span style={{ fontSize: 9, color: "#8888a8", textAlign: "center", wordBreak: "break-word", lineHeight: 1.2 }}>{name}</span>
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14 }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            style={{
              padding: "5px 16px", borderRadius: 6, fontSize: 12, cursor: safePage === 0 ? "default" : "pointer",
              border: "1px solid rgba(255,255,255,0.12)",
              background: safePage === 0 ? "transparent" : "rgba(255,255,255,0.06)",
              color: safePage === 0 ? "#33334a" : "#c0c0d8",
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: "#7070a0" }}>
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            style={{
              padding: "5px 16px", borderRadius: 6, fontSize: 12, cursor: safePage >= totalPages - 1 ? "default" : "pointer",
              border: "1px solid rgba(255,255,255,0.12)",
              background: safePage >= totalPages - 1 ? "transparent" : "rgba(255,255,255,0.06)",
              color: safePage >= totalPages - 1 ? "#33334a" : "#c0c0d8",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </EditorModal>
  );
}
