import React from "react";
import ZonePreview from "../ZonePreview";

export default function BackgroundTab({
  slot,
  zone,
  openPicker,
  updateBackgroundProp,
  clearBackground
}) {

  const bg = zone?.background || {};

  return (

    <div>

      <div className="relative mb-2">

        <div
          onClick={()=>openPicker(slot,"background")}
          className="cursor-pointer"
        >
          <ZonePreview
            zone={zone}
            mode="background"
          />
        </div>

        {bg.kind && (
          <button
            onClick={()=>clearBackground(slot)}
            className="absolute top-1 right-1 bg-white border rounded px-1 text-[10px]"
          >
            X
          </button>
        )}

      </div>

      {bg.kind === "asset" && (

        <>

          <div className="mt-2 text-[11px]">Object Fit</div>

          <select
            value={bg.asset?.objectFit || "cover"}
            onChange={(e)=>updateBackgroundProp(slot,"objectFit",e.target.value)}
            className="w-full text-[11px] border rounded"
          >
            <option value="cover">cover</option>
            <option value="contain">contain</option>
          </select>

          <div className="mt-2 text-[11px]">Transition</div>

          <select
            value={bg.asset?.transition || "none"}
            onChange={(e)=>updateBackgroundProp(slot,"transition",e.target.value)}
            className="w-full text-[11px] border rounded"
          >
            <option value="none">none</option>
            <option value="fade">fade</option>
            <option value="zoom">zoom</option>
            <option value="slide">slide</option>
          </select>

        </>

      )}

    </div>

  );

}