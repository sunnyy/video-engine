import React from "react";

export default function HookEditor({
  slot,
  block,
  updateBlockProp
}) {

  return (

    <div className="mt-2">

      <div className="text-[11px] mb-1">
        Text
      </div>

      <input
        value={block.props?.text || ""}
        onChange={(e)=>updateBlockProp(slot,"text",e.target.value)}
        className="w-full border rounded text-[11px]"
      />

    </div>

  );

}