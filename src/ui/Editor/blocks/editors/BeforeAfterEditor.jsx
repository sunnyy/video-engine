import React, { useState } from "react";
import ZonePickerModal from "../../zonePicker/ZonePickerModal";

export default function BeforeAfterEditor({
  slot,
  block,
  updateBlockProp
}) {

  const [picker,setPicker] = useState(null);

  const before = block.props?.before || "";
  const after = block.props?.after || "";

  const selectImage = (key,asset) => {

    updateBlockProp(slot,key,asset.url);
    setPicker(null);

  };

  const removeImage = (key) => {

    updateBlockProp(slot,key,"");

  };

  const Box = ({label,value,type}) => (

    <div className="space-y-1">

      <div className="text-[11px]">{label}</div>

      <div
        onClick={()=>setPicker(type)}
        className="relative border rounded overflow-hidden h-[80px] cursor-pointer"
      >

        {value ? (
          <img
            src={value}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center text-[10px] h-full">
            Select
          </div>
        )}

        {value && (
          <button
            onClick={(e)=>{
              e.stopPropagation();
              removeImage(type);
            }}
            className="absolute top-1 right-1 text-[10px] bg-white border rounded px-1"
          >
            X
          </button>
        )}

      </div>

    </div>

  );

  return (

    <div className="mt-2 grid grid-cols-2 gap-3">

      <Box
        label="Before"
        value={before}
        type="before"
      />

      <Box
        label="After"
        value={after}
        type="after"
      />

      {picker && (

        <ZonePickerModal
          allowedTabs={["assets","gallery"]}
          onClose={()=>setPicker(null)}
          onSelect={(asset)=>selectImage(picker,asset)}
        />

      )}

    </div>

  );

}