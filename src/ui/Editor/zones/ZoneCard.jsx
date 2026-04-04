/**
 * ZoneCard.jsx
 * src/ui/Editor/zones/ZoneCard.jsx
 *
 * Compact zone card. Preview left (asset zones only), controls right.
 * Tabs: Content/Text | BG (asset only) | Layout (position/size/zIndex/timing)
 */
import React, { useState } from "react";
import ZonePreview   from "./ZonePreview";
import ContentTab    from "./tabs/ContentTab";
import BackgroundTab from "./tabs/BackgroundTab";
import TextTab       from "./tabs/TextTab";
import LayoutTab     from "./tabs/LayoutTab";
import blockEditors  from "../blocks/blockEditors";
import { getBlockVariants } from "../../../../src/core/blockRegistry";

export default function ZoneCard({
  slot, zone, zoneType, zoneDef,
  openPicker, setVariant, updateBlockProp,
  updateContentProp, updateTextContent, updateTextStyle,
  setPadding, setZoneStyle, setZoneLayout,
  updateBackgroundProp, clearContent, clearBackground,
  deletable, onDelete,
}) {
  const [tab, setTab] = useState("content");

  const content     = zone?.content    || {};
  const background  = zone?.background || {};
  const block       = content?.block   || {};
  const BlockEditor = block?.type ? blockEditors[block.type] : null;
  const variants    = block?.type ? getBlockVariants(block.type) : [];
  const isText      = zoneType === "text";

  const tabs = isText
    ? [{ key: "content", label: "Text" }, { key: "layout", label: "Pos" }]
    : [{ key: "content", label: "Asset" }, { key: "background", label: "BG" }, { key: "layout", label: "Pos" }];

  return (
    <div className="w-full rounded-[10px] overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#1c1c2e]">

      {/* Header — compact */}
      <div className="flex items-center gap-2 px-2 py-[6px] border-b border-[rgba(255,255,255,0.06)]">
        <span className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0] shrink-0"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>{slot}</span>
        <span className={`text-[8px] font-bold px-[4px] py-[1px] rounded-[3px] uppercase tracking-widest shrink-0
          ${isText ? "bg-[rgba(124,92,252,0.15)] text-[#a78fff]" : "bg-[rgba(255,255,255,0.06)] text-[#7070a0]"}`}>
          {zoneType || "asset"}
        </span>

        {/* Tab switcher */}
        <div className="flex gap-[1px] bg-[#12121c] border border-[rgba(255,255,255,0.07)] rounded-[5px] p-[2px] ml-auto">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-2 py-[2px] rounded-[3px] text-[10px] font-semibold transition-all cursor-pointer border-0
                ${tab === key ? "bg-[#2a2a40] text-[#e8e8f0]" : "text-[#7070a0] hover:text-[#b0b0c8] bg-transparent"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Delete */}
        {deletable && (
          <button onClick={onDelete}
            className="w-[18px] h-[18px] shrink-0 rounded-full bg-[rgba(255,60,60,0.1)] text-[#ff6060] text-[9px] flex items-center justify-center hover:bg-[rgba(255,60,60,0.25)] transition-colors border-0 cursor-pointer">
            ✕
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex">
        {/* Preview — only for asset zones, only on content/bg tabs */}
        {!isText && tab !== "layout" && (
          <>
            <div className="relative cursor-pointer group shrink-0" style={{ width: "32%" }}
              onClick={() => openPicker(slot, tab === "content" ? "content" : "background")}>
              <ZonePreview zone={zone} mode={tab === "content" ? "content" : "background"} zoneType={zoneType} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <span className="text-white text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
              </div>
              {tab === "content" && content.kind && (
                <button onClick={e => { e.stopPropagation(); clearContent(slot); }}
                  className="absolute top-1 right-1 w-[14px] h-[14px] rounded-full bg-black/70 text-white text-[8px] flex items-center justify-center hover:bg-red-500 z-10 border-0 cursor-pointer">✕</button>
              )}
              {tab === "background" && background.kind && (
                <button onClick={e => { e.stopPropagation(); clearBackground(slot); }}
                  className="absolute top-1 right-1 w-[14px] h-[14px] rounded-full bg-black/70 text-white text-[8px] flex items-center justify-center hover:bg-red-500 z-10 border-0 cursor-pointer">✕</button>
              )}
            </div>
            <div className="w-[1px] bg-[rgba(255,255,255,0.06)] shrink-0" />
          </>
        )}

        {/* Controls */}
        <div className="flex-1 px-2 py-2 overflow-y-auto" style={{ maxHeight: tab === "layout" ? 240 : isText ? 200 : 220 }}>
          {tab === "layout"     && <LayoutTab slot={slot} zone={zone} zoneDef={zoneDef} setZoneLayout={setZoneLayout} setZoneStyle={setZoneStyle} />}
          {tab === "content"    && isText  && <TextTab    slot={slot} zone={zone} zoneDef={zoneDef} updateTextContent={updateTextContent} updateTextStyle={updateTextStyle} setZoneStyle={setZoneStyle} />}
          {tab === "content"    && !isText && <ContentTab slot={slot} zone={zone} openPicker={openPicker} updateContentProp={updateContentProp} setPadding={setPadding} setZoneStyle={setZoneStyle} clearContent={clearContent} />}
          {tab === "background" && !isText && <BackgroundTab slot={slot} zone={zone} openPicker={openPicker} updateBackgroundProp={updateBackgroundProp} clearBackground={clearBackground} />}
        </div>
      </div>

      {/* Block editor */}
      {tab === "content" && content.kind === "block" && block?.type && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-2 py-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0]"
              style={{ fontFamily:"'JetBrains Mono',monospace" }}>Scale</span>
            <input type="range" min={50} max={100} value={Math.round((zone?.style?.scale ?? 1) * 100)}
              onChange={e => setZoneStyle(slot, "scale", Number(e.target.value) / 100)}
              className="flex-1 accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
            <span className="text-[10px] font-mono text-[#7070a0]">{Math.round((zone?.style?.scale ?? 1) * 100)}%</span>
          </div>
          {variants.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>Variant</span>
              <select value={block.variant || ""} onChange={e => setVariant(slot, e.target.value)}
                className="flex-1 bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[5px] px-2 py-[4px] text-[11px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
                {variants.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}
          {BlockEditor && <BlockEditor slot={slot} block={block} updateBlockProp={updateBlockProp} />}
        </div>
      )}

    </div>
  );
}