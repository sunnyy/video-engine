import React from "react";

const CATEGORY_FILTERS = ["All","Business","Finance","City","Technology","People","Abstract"];
const GALLERY_TYPE_FILTERS = ["All","Image","Video"];

export default function GalleryTab({
  assets,
  category,
  setCategory,
  galleryType,
  setGalleryType,
  onSelect,
  renderPreview
}) {

  const filtered = assets
    .filter((a)=>{

      if (galleryType==="All") return true;
      if (galleryType==="Image") return a.type==="image";
      if (galleryType==="Video") return a.type==="video";

      return true;

    })
    .filter((a)=>{

      if (category==="All") return true;

      return a.category &&
        a.category.toLowerCase() === category.toLowerCase();

    });

  return (

    <>

      <div className="mb-4 flex justify-between items-center">

        <div className="flex gap-2">

          {GALLERY_TYPE_FILTERS.map((f)=>(

            <button
              key={f}
              onClick={()=>setGalleryType(f)}
              className={`px-3 py-1 text-sm rounded border ${
                galleryType===f
                  ? "bg-purple-700 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              {f}
            </button>

          ))}

        </div>

        <div className="flex gap-2 flex-wrap">

          {CATEGORY_FILTERS.map((c)=>(

            <button
              key={c}
              onClick={()=>setCategory(c)}
              className={`px-3 py-1 text-sm rounded border ${
                category===c
                  ? "bg-purple-700 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              {c}
            </button>

          ))}

        </div>

      </div>

      <div className="grid grid-cols-3 gap-4 overflow-y-auto content-start">

        {filtered.map((asset)=>(

          <div
            key={asset.id}
            className="cursor-pointer overflow-hidden rounded-xl border hover:border-indigo-500 min-h-[200px]"
          >

            <div
              onClick={()=>{
                onSelect(asset);
              }}
              className="aspect-video"
            >
              {renderPreview(asset)}
            </div>

          </div>

        ))}

      </div>

    </>

  );

}