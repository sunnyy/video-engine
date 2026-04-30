/**
 * BrandingSection.jsx
 * src/ui/Editor/BrandingSection.jsx
 * #18 — brand color, name, font preference
 */
import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";

function Label({ children }) {
  return (
    <div className="text-[12px] font-bold tracking-widest uppercase text-[#7070a0] mb-[6px]"
      style={{ fontFamily:"'JetBrains Mono',monospace" }}>
      {children}
    </div>
  );
}

const FONT_OPTIONS = [
  { value: "Bebas Neue",        label: "Bebas Neue",        preview: "IMPACT STYLE"   },
  { value: "Outfit",            label: "Outfit",            preview: "Modern Bold"    },
  { value: "Outfit",            label: "Outfit",            preview: "Clean Sans"     },
  { value: "Playfair Display",  label: "Playfair Display",  preview: "Editorial"      },
  { value: "JetBrains Mono",    label: "JetBrains Mono",    preview: "CODE MONO"      },
  { value: "Unbounded",         label: "Unbounded",         preview: "WIDE HEAVY"     },
  { value: "Barlow Condensed",  label: "Barlow Condensed",  preview: "CONDENSED"      },
];

export default function BrandingSection() {
  const project           = useProjectStore((s) => s.project);
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta);

  if (!project) return null;

  const brand        = project.meta?.brand || {};
  const brandColor   = brand.color   || "#7c5cfc";
  const brandColor2  = brand.color2  || "#f5c518";
  const brandFont    = brand.font    || "Outfit";

  const update = (key, value) => {
    const newBrand = { ...brand, [key]: value };
    updateProjectMeta({
      meta: {
        brand:       newBrand,
        // Keep legacy brand_color in sync so Caption.jsx fallback still works
        brand_color: key === "color" ? value : brand.color ?? null,
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0b10] px-6 py-6 flex flex-col gap-6">

      <h3 className="text-[16px] font-bold text-[#e8e8f0] mb-2"
        style={{ fontFamily:"'Outfit',sans-serif" }}>Branding</h3>

      {/* Brand Color — Primary */}
      <div>
        <Label>Primary Color</Label>
        <div className="flex items-center gap-3">
          <input type="color" value={brandColor}
            onChange={e => update("color", e.target.value)}
            className="w-[48px] h-[48px] rounded-[10px] border border-[rgba(255,255,255,0.08)] cursor-pointer bg-[#16161f] p-[3px]" />
          <div className="flex-1">
            <input value={brandColor}
              onChange={e => update("color", e.target.value)}
              placeholder="#7c5cfc"
              className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-[8px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none font-mono" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {["#7c5cfc","#f5c518","#ff4d6d","#2dd4bf","#f97316","#ffffff","#e11d48","#0ea5e9"].map(c => (
            <button key={c} onClick={() => update("color", c)}
              className="w-[26px] h-[26px] rounded-full border-2 transition-all cursor-pointer shrink-0"
              style={{
                background: c,
                borderColor: brandColor === c ? "#fff" : "transparent",
                transform: brandColor === c ? "scale(1.15)" : "scale(1)",
              }} />
          ))}
        </div>
      </div>

      {/* Brand Color — Secondary */}
      <div>
        <Label>Secondary Color</Label>
        <div className="text-[11px] text-[#5c5c80] mb-2" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
          Used for accents, highlights, badges
        </div>
        <div className="flex items-center gap-3">
          <input type="color" value={brandColor2}
            onChange={e => update("color2", e.target.value)}
            className="w-[48px] h-[48px] rounded-[10px] border border-[rgba(255,255,255,0.08)] cursor-pointer bg-[#16161f] p-[3px]" />
          <div className="flex-1">
            <input value={brandColor2}
              onChange={e => update("color2", e.target.value)}
              placeholder="#f5c518"
              className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-[8px] text-[14px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none font-mono" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {["#f5c518","#7c5cfc","#ffffff","#ff4d6d","#2dd4bf","#f97316","#a3e635","#fb7185"].map(c => (
            <button key={c} onClick={() => update("color2", c)}
              className="w-[26px] h-[26px] rounded-full border-2 transition-all cursor-pointer shrink-0"
              style={{
                background: c,
                borderColor: brandColor2 === c ? "#fff" : "transparent",
                transform: brandColor2 === c ? "scale(1.15)" : "scale(1)",
              }} />
          ))}
        </div>
        {/* Preview swatch */}
        <div className="mt-3 h-[6px] rounded-full overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${brandColor} 0%, ${brandColor2} 100%)` }} />
      </div>

      {/* Brand Font */}
      <div>
        <Label>Caption Font</Label>
        <div className="flex flex-col gap-2">
          {FONT_OPTIONS.map(f => (
            <button key={f.value}
              onClick={() => update("font", f.value)}
              className={`flex items-center justify-between px-4 py-3 rounded-[10px] border transition-all cursor-pointer text-left
                ${brandFont === f.value
                  ? "border-[#7c5cfc] bg-[#16163a]"
                  : "border-[rgba(255,255,255,0.07)] bg-[#111118] hover:border-[rgba(255,255,255,0.15)]"}`}>
              <span className="text-[13px] text-[#9494a8]">{f.label}</span>
              <span className="text-[15px] text-[#e8e8f0]"
                style={{ fontFamily:`'${f.value}',sans-serif` }}>
                {f.preview}
              </span>
              {brandFont === f.value && (
                <div className="w-[6px] h-[6px] rounded-full bg-[#7c5cfc] ml-2 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}