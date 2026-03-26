import React from "react";

export default function QuoteEditor({
  slot,
  block,
  updateBlockProp
}) {

  return (

    <div className="mt-2">

      <div className="text-[11px] mb-1">
        Quote Text
      </div>

      <textarea
        value={block.props?.text || ""}
        onChange={(e)=>updateBlockProp(slot,"text",e.target.value)}
        className="w-full border rounded text-[11px]"
        rows={3}
      />

    </div>

  );

}