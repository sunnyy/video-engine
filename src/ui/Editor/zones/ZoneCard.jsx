import React, { useState } from "react";
import ContentTab from "./tabs/ContentTab";
import BackgroundTab from "./tabs/BackgroundTab";
import StylingTab from "./tabs/StylingTab";

export default function ZoneCard({
  slot,
  zone,
  openPicker,
  setVariant,
  updateBlockProp,
  updateContentProp,
  setPadding,
  updateBackgroundProp,
  clearContent,
  clearBackground
}) {

  const [tab, setTab] = useState("content");

  return (

    <div className="w-[240px]">

      <div
        className="text-[10px] mb-2 uppercase tracking-[0.08em] text-[#55556a]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {slot}
      </div>

      <div className="flex gap-2 mb-3">

        <button
          onClick={() => setTab("content")}
          className={`px-3 py-[5px] text-[11px] rounded-[6px] border transition ${
            tab === "content"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Content
        </button>

        <button
          onClick={() => setTab("background")}
          className={`px-3 py-[5px] text-[11px] rounded-[6px] border transition ${
            tab === "background"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Background
        </button>

        <button
          onClick={() => setTab("style")}
          className={`px-3 py-[5px] text-[11px] rounded-[6px] border transition ${
            tab === "style"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Styling
        </button>

      </div>

      {tab === "content" && (

        <ContentTab
          slot={slot}
          zone={zone}
          openPicker={openPicker}
          setVariant={setVariant}
          updateBlockProp={updateBlockProp}
          updateContentProp={updateContentProp}
          clearContent={clearContent}
        />

      )}

      {tab === "background" && (

        <BackgroundTab
          slot={slot}
          zone={zone}
          openPicker={openPicker}
          updateBackgroundProp={updateBackgroundProp}
          clearBackground={clearBackground}
        />

      )}

      {tab === "style" && (

        <StylingTab
          slot={slot}
          zone={zone}
          setPadding={setPadding}
        />

      )}

    </div>

  );

}