import React from "react";
import ZonePreview from "../ZonePreview";
import { assetTransitions } from "../../../../core/assetTransitions";
import { assetMotions } from "../../../../core/assetMotions";

export default function BackgroundTab({
  slot,
  zone,
  openPicker,
  updateBackgroundProp,
  clearBackground
}) {

  const bg = zone?.background || {};

  const transitions = Object.keys(assetTransitions || {});
  const motions = Object.keys(assetMotions || {});

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

          <div className="mt-2 text-[11px]">Enter</div>

          <select
            value={bg.asset?.enterTransition || "fadeIn"}
            onChange={(e)=>updateBackgroundProp(slot,"enterTransition",e.target.value)}
            className="w-full text-[11px] border rounded"
          >
            {transitions.map(t=>(
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="mt-2 text-[11px]">Exit</div>

          <select
            value={bg.asset?.exitTransition || "none"}
            onChange={(e)=>updateBackgroundProp(slot,"exitTransition",e.target.value)}
            className="w-full text-[11px] border rounded"
          >
            {transitions.map(t=>(
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="mt-2 text-[11px]">Motion</div>

          <select
            value={bg.asset?.motion || "none"}
            onChange={(e)=>updateBackgroundProp(slot,"motion",e.target.value)}
            className="w-full text-[11px] border rounded"
          >
            {motions.map(m=>(
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

        </>

      )}

    </div>

  );

}