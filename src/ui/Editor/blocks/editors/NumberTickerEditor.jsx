import React from "react";

export default function NumberTickerEditor({
  slot,
  block,
  updateBlockProp
}) {

  return (

    <div className="mt-2 space-y-2">

      <div>

        <div className="text-[11px] mb-1">
          Value
        </div>

        <input
          type="number"
          value={block.props?.value || 0}
          onChange={(e)=>updateBlockProp(slot,"value",Number(e.target.value))}
          className="w-full border rounded text-[11px]"
        />

      </div>

      <div>

        <div className="text-[11px] mb-1">
          Label
        </div>

        <input
          value={block.props?.label || ""}
          onChange={(e)=>updateBlockProp(slot,"label",e.target.value)}
          className="w-full border rounded text-[11px]"
        />

      </div>

    </div>

  );

}