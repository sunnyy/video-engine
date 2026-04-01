/**
 * ZoneCard.jsx
 * src/ui/Editor/zones/ZoneCard.jsx
 *
 * Full-width card per zone.
 * Left half: 9:16 preview thumbnail
 * Right half: settings (Content or Background tab)
 */
import React, { useState } from "react";
import ZonePreview   from "./ZonePreview";
import ContentTab    from "./tabs/ContentTab";
import BackgroundTab from "./tabs/BackgroundTab";
import blockEditors  from "../blocks/blockEditors";
import { getBlockVariants } from "../../../../src/core/blockRegistry";

export default function ZoneCard({
  slot, zone, openPicker, setVariant, updateBlockProp,
  updateContentProp, setPadding, setZoneStyle,
  updateBackgroundProp, clearContent, clearBackground,
}) {
  const [tab, setTab] = useState("content");

  const content     = zone?.content    || {};
  const background  = zone?.background || {};
  const block       = content?.block   || {};
  const BlockEditor = block?.type ? blockEditors[block.type] : null;
  const variants    = block?.type ? getBlockVariants(block.type) : [];
  const isContent   = tab === "content";

  return (
    <div className="w-full rounded-[12px] overflow-hidden border border-[rgba(255,255,255,0.1)] bg-[#1c1c2e]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-[8px] border-b border-[rgba(255,255,255,0.07)]">
        <span
          className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#9494a8]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {slot}
        </span>

        <div className="flex gap-[2px] bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[7px] p-[2px]">
          {[
            { key: "content",    label: "Content"    },
            { key: "background", label: "Background" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-[4px] rounded-[5px] text-[11px] font-semibold capitalize transition-all
                ${tab === key
                  ? "bg-[#2a2a40] text-[#e8e8f0]"
                  : "text-[#7070a0] hover:text-[#b0b0c8]"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: preview left | settings right ── */}
      <div className="flex">

        {/* Preview — ~40% width, click to open picker */}
        <div
          className="relative cursor-pointer group shrink-0"
          style={{ width: "35%" }}
          onClick={() => openPicker(slot, isContent ? "content" : "background")}
        >
          <ZonePreview zone={zone} mode={isContent ? "content" : "background"} />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all rounded-none flex items-center justify-center">
            <span className="text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Change
            </span>
          </div>

          {/* Clear button */}
          {isContent && content.kind && (
            <button
              onClick={e => { e.stopPropagation(); clearContent(slot); }}
              className="absolute top-1 right-1 w-[16px] h-[16px] rounded-full bg-black/70 text-white text-[9px] flex items-center justify-center hover:bg-red-500 transition-colors z-10 border-0"
            >✕</button>
          )}
          {!isContent && background.kind && (
            <button
              onClick={e => { e.stopPropagation(); clearBackground(slot); }}
              className="absolute top-1 right-1 w-[16px] h-[16px] rounded-full bg-black/70 text-white text-[9px] flex items-center justify-center hover:bg-red-500 transition-colors z-10 border-0"
            >✕</button>
          )}
        </div>

        {/* Divider */}
        <div className="w-[1px] bg-[rgba(255,255,255,0.07)] shrink-0" />

        {/* Settings — 60% width */}
        <div className="flex-1 px-3 py-2 overflow-y-auto" style={{ maxHeight: 280 }}>
          {isContent ? (
            <ContentTab
              slot={slot} zone={zone} openPicker={openPicker}
              updateContentProp={updateContentProp}
              setPadding={setPadding} setZoneStyle={setZoneStyle}
              clearContent={clearContent}
            />
          ) : (
            <BackgroundTab
              slot={slot} zone={zone} openPicker={openPicker}
              updateBackgroundProp={updateBackgroundProp}
              clearBackground={clearBackground}
            />
          )}
        </div>

      </div>

      {/* ── Block editor — full width below ── */}
      {isContent && content.kind === "block" && block?.type && (
        <div className="border-t border-[rgba(255,255,255,0.07)] px-3 py-3">

          {/* Fix #21 — Scale slider for block zones */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#7070a0] shrink-0"
              style={{ fontFamily:"'JetBrains Mono',monospace" }}>Scale</span>
            <input type="range" min={50} max={100}
              value={Math.round((zone?.style?.scale ?? 1) * 100)}
              onChange={e => setZoneStyle && setZoneStyle(slot, "scale", Number(e.target.value) / 100)}
              className="flex-1 accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
            <span className="text-[11px] font-mono text-[#7070a0] w-[36px] text-right">
              {Math.round((zone?.style?.scale ?? 1) * 100)}%
            </span>
          </div>

          {variants.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0] shrink-0"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Variant
              </span>
              <select
                value={block.variant || ""}
                onChange={e => setVariant(slot, e.target.value)}
                className="flex-1 bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[5px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer"
              >
                {variants.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}
          {BlockEditor && (
            <BlockEditor slot={slot} block={block} updateBlockProp={updateBlockProp} />
          )}
        </div>
      )}

    </div>
  );
}