import React, { useState } from "react";
import ZonePickerModal from "../../zonePicker/ZonePickerModal";

export default function SlideshowEditor({
  slot,
  block,
  updateBlockProp
}) {

  const images = block.props?.images || [];
  const [pickerIndex,setPickerIndex] = useState(null);

  const updateImage = (index,value) => {

    const arr = [...images];
    arr[index] = value;

    updateBlockProp(slot,"images",arr);

  };

  const addImage = () => {

    updateBlockProp(slot,"images",[...images,""]);

  };

  const removeImage = (index) => {

    const arr = images.filter((_,i)=>i!==index);
    updateBlockProp(slot,"images",arr);

  };

  return (

    <div className="mt-2 space-y-2">

      <div className="text-[11px]">
        Images
      </div>

      <div className="flex d-flex flex-wrap gap-2">

        {images.map((img,i)=>(

          <div
            key={i}
            className="relative border rounded overflow-hidden w-[80px] h-[80px] cursor-pointer"
            onClick={()=>setPickerIndex(i)}
          >

            {img ? (
              <img
                src={img}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center text-[10px] w-[80px] h-[80px] bg-gray-100">
                Select
              </div>
            )}

            <button
              onClick={(e)=>{
                e.stopPropagation();
                removeImage(i);
              }}
              className="absolute top-1 right-1 text-[10px] bg-white border rounded px-1"
            >
              X
            </button>

          </div>

        ))}

        <button
          onClick={addImage}
          className="border rounded w-[80px] h-[80px] flex items-center justify-center text-[11px]"
        >
          + Add
        </button>

      </div>

      {pickerIndex!==null && (

        <ZonePickerModal
          allowedTabs={["assets","gallery"]}
          onClose={()=>setPickerIndex(null)}
          onSelect={(asset)=>{

            updateImage(pickerIndex,asset.url);
            setPickerIndex(null);

          }}
        />

      )}

    </div>

  );

}