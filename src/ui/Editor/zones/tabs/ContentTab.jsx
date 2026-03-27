import React from "react";
import { getBlockVariants } from "../../../../core/blockRegistry";
import { assetAnimationRegistry } from "../../../../core/assetAnimationRegistry";
import ZonePreview from "../ZonePreview";
import blockEditors from "../../blocks/blockEditors";
import BlockTimingEditor from "../../blocks/editors/BlockTimingEditor";

export default function ContentTab({
  slot,
  zone,
  openPicker,
  setVariant,
  updateBlockProp,
  updateContentProp,
  clearContent
}) {

  const content = zone?.content || {};
  const block = content?.block || {};

  const variants = block?.type ? getBlockVariants(block.type) : [];
  const animations = Object.keys(assetAnimationRegistry || {});

  const BlockEditor = block?.type ? blockEditors[block.type] : null;

  return (

    <div>

      <div className="relative mb-2">

        <div
          onClick={()=>openPicker(slot,"content")}
          className="cursor-pointer"
        >
          <ZonePreview zone={zone} mode="content" />
        </div>

        {content.kind && (
          <button
            onClick={()=>clearContent(slot)}
            className="absolute top-1 right-1 bg-white border rounded px-1 text-[10px]"
          >
            X
          </button>
        )}

      </div>

      {(content.kind === "asset") && (

        <>

          <div className="mt-2 text-[12px]">Object Fit</div>

          <select
            value={content.asset?.objectFit || "cover"}
            onChange={(e)=>updateContentProp(slot,"objectFit",e.target.value)}
            className="w-full text-[12px] p-1 border rounded"
          >
            <option value="cover">cover</option>
            <option value="contain">contain</option>
          </select>

          <div className="mt-2 text-[12px]">Animation</div>

          <select
            value={content.asset?.animation || "none"}
            onChange={(e)=>updateContentProp(slot,"animation",e.target.value)}
            className="w-full text-[12px] p-1 border rounded"
          >
            <option value="none">none</option>
            {animations.map(a=>(
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

        </>

      )}

      {content.kind === "block" && block?.type && (

        <>

          <div className="mt-3 text-[11px]">Variant</div>

          <select
            value={block.variant}
            onChange={(e)=>setVariant(slot,e.target.value)}
            className="w-full text-[11px] border rounded"
          >
            {variants.map(v=>(
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {BlockEditor && (
            <BlockEditor
              slot={slot}
              block={block}
              updateBlockProp={updateBlockProp}
            />
          )}

          <BlockTimingEditor
            block={block}
          />

        </>

      )}

    </div>

  );

}