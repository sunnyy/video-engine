import React from "react";

export default function StylingTab({
  slot,
  zone,
  setPadding
}) {

  const padding = zone?.style?.padding || {};

  return (

    <div>

      <div className="text-[10px] mb-1 text-gray-500">
        Padding
      </div>

      <div className="grid grid-cols-2 gap-1">

        <input
          type="number"
          value={padding.top || 0}
          onChange={(e)=>setPadding(slot,"top",e.target.value)}
          className="border rounded text-[11px]"
        />

        <input
          type="number"
          value={padding.right || 0}
          onChange={(e)=>setPadding(slot,"right",e.target.value)}
          className="border rounded text-[11px]"
        />

        <input
          type="number"
          value={padding.bottom || 0}
          onChange={(e)=>setPadding(slot,"bottom",e.target.value)}
          className="border rounded text-[11px]"
        />

        <input
          type="number"
          value={padding.left || 0}
          onChange={(e)=>setPadding(slot,"left",e.target.value)}
          className="border rounded text-[11px]"
        />

      </div>

    </div>

  );

}