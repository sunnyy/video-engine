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

  const [tab,setTab] = useState("content");

  return (

    <div className="w-[260px]">

      <div className="text-[10px] mb-2 uppercase text-gray-500">
        {slot}
      </div>

      <div className="flex gap-2 mb-3">

        <button
          onClick={()=>setTab("content")}
          className={`px-2 py-1 text-[11px] rounded ${
            tab==="content"
              ? "bg-black text-white"
              : "bg-gray-200"
          }`}
        >
          Content
        </button>

        <button
          onClick={()=>setTab("background")}
          className={`px-2 py-1 text-[11px] rounded ${
            tab==="background"
              ? "bg-black text-white"
              : "bg-gray-200"
          }`}
        >
          Background
        </button>

        <button
          onClick={()=>setTab("style")}
          className={`px-2 py-1 text-[11px] rounded ${
            tab==="style"
              ? "bg-black text-white"
              : "bg-gray-200"
          }`}
        >
          Styling
        </button>

      </div>

      {tab==="content" && (

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

      {tab==="background" && (

        <BackgroundTab
          slot={slot}
          zone={zone}
          openPicker={openPicker}
          updateBackgroundProp={updateBackgroundProp}
          clearBackground={clearBackground}
        />

      )}

      {tab==="style" && (

        <StylingTab
          slot={slot}
          zone={zone}
          setPadding={setPadding}
        />

      )}

    </div>

  );

}