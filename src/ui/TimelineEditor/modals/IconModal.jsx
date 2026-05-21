import { useState } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import EditorModal from "./EditorModal";
import {
  Package, Star, ShieldCheck, Truck, Heart, CheckCircle, Lightning, Leaf, Drop, Fire,
  SealCheck, Sparkle, ArrowRight, Tag, Certificate,
  ArrowLeft, ArrowUp, ArrowDown, Bell, Bookmark, Camera, Car, ChatCircle, Clock, Cloud,
  Coffee, CreditCard, Crown, Cube, Diamond, Download, Envelope, Eye, Fingerprint, Flag,
  Flower, Gear, Gift, Globe, Headphones, House, Image, Info, Infinity, Key, Laptop,
  Lightbulb, Link, Lock, MagicWand, MapPin, Medal, Megaphone, Moon, MusicNote,
  PaperPlaneTilt, Pencil, Phone, Plant, Plus, Question, Rainbow, Rocket, MagnifyingGlass,
  ShareNetwork, Shield, ShoppingBag, Smiley, Stack, Sun, Target, ThumbsUp, Timer,
  Trash, Trophy, TShirt, Umbrella, Upload, User, Video, Wallet, Warning, WifiHigh, Wind,
} from "@phosphor-icons/react";

const ICONS = [
  { name: "ArrowDown",      Component: ArrowDown },
  { name: "ArrowLeft",      Component: ArrowLeft },
  { name: "ArrowRight",     Component: ArrowRight },
  { name: "ArrowUp",        Component: ArrowUp },
  { name: "Bell",           Component: Bell },
  { name: "Bookmark",       Component: Bookmark },
  { name: "Camera",         Component: Camera },
  { name: "Car",            Component: Car },
  { name: "Certificate",    Component: Certificate },
  { name: "ChatCircle",     Component: ChatCircle },
  { name: "CheckCircle",    Component: CheckCircle },
  { name: "Clock",          Component: Clock },
  { name: "Cloud",          Component: Cloud },
  { name: "Coffee",         Component: Coffee },
  { name: "CreditCard",     Component: CreditCard },
  { name: "Crown",          Component: Crown },
  { name: "Cube",           Component: Cube },
  { name: "Diamond",        Component: Diamond },
  { name: "Download",       Component: Download },
  { name: "Drop",           Component: Drop },
  { name: "Envelope",       Component: Envelope },
  { name: "Eye",            Component: Eye },
  { name: "Fingerprint",    Component: Fingerprint },
  { name: "Fire",           Component: Fire },
  { name: "Flag",           Component: Flag },
  { name: "Flower",         Component: Flower },
  { name: "Gear",           Component: Gear },
  { name: "Gift",           Component: Gift },
  { name: "Globe",          Component: Globe },
  { name: "Headphones",     Component: Headphones },
  { name: "Heart",          Component: Heart },
  { name: "House",          Component: House },
  { name: "Image",          Component: Image },
  { name: "Info",           Component: Info },
  { name: "Infinity",       Component: Infinity }, // eslint-disable-line no-undef
  { name: "Key",            Component: Key },
  { name: "Laptop",         Component: Laptop },
  { name: "Leaf",           Component: Leaf },
  { name: "Lightbulb",      Component: Lightbulb },
  { name: "Lightning",      Component: Lightning },
  { name: "Link",           Component: Link },
  { name: "Lock",           Component: Lock },
  { name: "MagicWand",      Component: MagicWand },
  { name: "MapPin",         Component: MapPin },
  { name: "Medal",          Component: Medal },
  { name: "Megaphone",      Component: Megaphone },
  { name: "Moon",           Component: Moon },
  { name: "MusicNote",      Component: MusicNote },
  { name: "Package",        Component: Package },
  { name: "PaperPlaneTilt", Component: PaperPlaneTilt },
  { name: "Pencil",         Component: Pencil },
  { name: "Phone",          Component: Phone },
  { name: "Plant",          Component: Plant },
  { name: "Plus",           Component: Plus },
  { name: "Question",       Component: Question },
  { name: "Rainbow",        Component: Rainbow },
  { name: "Rocket",         Component: Rocket },
  { name: "MagnifyingGlass", Component: MagnifyingGlass },
  { name: "SealCheck",      Component: SealCheck },
  { name: "ShareNetwork",   Component: ShareNetwork },
  { name: "Shield",         Component: Shield },
  { name: "ShieldCheck",    Component: ShieldCheck },
  { name: "ShoppingBag",    Component: ShoppingBag },
  { name: "Smiley",         Component: Smiley },
  { name: "Sparkle",        Component: Sparkle },
  { name: "Stack",          Component: Stack },
  { name: "Star",           Component: Star },
  { name: "Sun",            Component: Sun },
  { name: "Tag",            Component: Tag },
  { name: "Target",         Component: Target },
  { name: "ThumbsUp",       Component: ThumbsUp },
  { name: "Timer",          Component: Timer },
  { name: "Trash",          Component: Trash },
  { name: "Trophy",         Component: Trophy },
  { name: "Truck",          Component: Truck },
  { name: "TShirt",         Component: TShirt },
  { name: "Umbrella",       Component: Umbrella },
  { name: "Upload",         Component: Upload },
  { name: "User",           Component: User },
  { name: "Video",          Component: Video },
  { name: "Wallet",         Component: Wallet },
  { name: "Warning",        Component: Warning },
  { name: "WifiHigh",       Component: WifiHigh },
  { name: "Wind",           Component: Wind },
];

const WEIGHTS = ["thin", "light", "regular", "bold", "fill", "duotone"];
const PAGE_SIZE = 20;

export default function IconModal({ onClose, onSelect }) {
  const [color, setColor]   = useState("#ffffff");
  const [weight, setWeight] = useState("regular");
  const [query, setQuery]   = useState("");
  const [page, setPage]     = useState(0);

  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const addLayer    = useTimelineStore((s) => s.addLayer);

  const filtered = query.trim()
    ? ICONS.filter((ic) => ic.name.toLowerCase().includes(query.trim().toLowerCase()))
    : ICONS;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage   = Math.min(page, Math.max(0, totalPages - 1));
  const visible    = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function handleSearch(val) {
    setQuery(val);
    setPage(0);
  }

  function handleSelect(iconName) {
    if (onSelect) {
      onSelect(iconName, color, weight);
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
      style: { color, weight },
      sfx: null,
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scale: 1, opacity: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
      keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
      animation:  { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0.3 } },
      transition: { type: "none", duration: 0.5 },
    });
    onClose();
  }

  return (
    <EditorModal title="Icons" onClose={onClose} width={520}>
      {/* Controls row */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#7070a0" }}>Weight</span>
          <select
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#e8e8f0", fontSize: 12, padding: "4px 8px", cursor: "pointer" }}
          >
            {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {/* Count */}
      <div style={{ fontSize: 11, color: "#55556a", marginBottom: 10 }}>
        {filtered.length === 0
          ? "No icons found"
          : `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, minHeight: 200 }}>
        {visible.map(({ name, Component }) => (
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
            <Component size={32} color={color} weight={weight} />
            <span style={{ fontSize: 9, color: "#8888a8", textAlign: "center", wordBreak: "break-word", lineHeight: 1.2 }}>{name}</span>
          </button>
        ))}
      </div>

      {/* Pagination */}
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
