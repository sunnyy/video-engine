import React from "react";

export default function MyAssetsTab({
  assets,
  myType,
  setMyType,
  onSelect,
  onDelete,
  deletingId,
  renderPreview
}) {

  const MY_ASSET_FILTERS = ["All","Image","Video"];

  const filtered = assets
    .filter((a)=>{

      const url = (a.url || "").toLowerCase();

      if (
        url.endsWith(".mp3") ||
        url.endsWith(".wav") ||
        url.endsWith(".m4a") ||
        url.endsWith(".aac") ||
        url.endsWith(".ogg")
      ) return false;

      return true;

    })
    .filter((a)=>{

      if (myType==="All") return true;
      if (myType==="Image") return a.type==="image";
      if (myType==="Video") return a.type==="video";

      return true;

    });

  return (

    <>

      <div className="mb-4 flex gap-2">

        {MY_ASSET_FILTERS.map((f)=>(

          <button
            key={f}
            onClick={()=>setMyType(f)}
            className={`px-3 py-1 text-sm rounded border ${
              myType===f
                ? "bg-purple-700 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            {f}
          </button>

        ))}

      </div>

      <div className="grid grid-cols-3 gap-4 overflow-y-auto content-start">

        {filtered.map((asset)=>(

          <div
            key={asset.id}
            className="relative bg-black cursor-pointer overflow-hidden rounded-xl border hover:border-indigo-500 min-h-[200px]"
          >

            <div
              onClick={()=>{

                onSelect({
                  kind:"asset",
                  asset:{
                    type:asset.type,
                    src:asset.url
                  }
                });

              }}
              className="aspect-video"
            >
              {renderPreview(asset)}
            </div>

            <button
              onClick={(e)=>{
                e.stopPropagation();
                onDelete(asset);
              }}
              className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded"
            >
              {deletingId===asset.id ? "Deleting..." : "Delete"}
            </button>

          </div>

        ))}

      </div>

    </>

  );

}