import React from "react";

const BACKGROUND_PRESETS = [
  { id:"bg_white", kind:"color", color:"#f6f6f6" },
  { id:"bg_black", kind:"color", color:"#000000" },
  { id:"bg_gray", kind:"color", color:"#333333" },
  { id:"bg_gradient_1", kind:"color", color:"linear-gradient(135deg, #667eea, #764ba2)" },
  { id:"bg_gradient_2", kind:"color", color:"linear-gradient(135deg, #ff9a9e, #fad0c4)" }
];

export default function ColorsTab({ onSelect, onClose }) {

  return (

    <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto">

      {BACKGROUND_PRESETS.map((bg)=>(

        <div
          key={bg.id}
          onClick={()=>{

            onSelect({
              kind:"color",
              color:bg.color
            });

            onClose();

          }}
          className="aspect-video cursor-pointer rounded border"
          style={{ background:bg.color }}
        />

      ))}

    </div>

  );

}