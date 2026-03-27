import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";
import { captionStyleRegistry } from "../../core/captionStyleRegistry";

const STYLES = [
  "tiktokClean",
  "reelsBold",
  "minimalGlass",
  "premiumBlock",
  "kineticPop",
  "cinematicSubtitle",
  "neonPulse",
  "luxuryGold",
  "brutalImpact",
  "glassHighlight",
  "viralGradient",
  "softMinimal",
  "modernOutline",
  "highContrastFlash",
];

const ANIMATIONS = ["fade","word_reveal","word_pop","pop","wave","slide"];

const POSITIONS = ["top","middle","bottom"];

export default function CaptionsSection({ beat }) {

  const updateBeat = useProjectStore((s)=>s.updateBeat);
  const project = useProjectStore((s)=>s.project);
  const setProject = useProjectStore((s)=>s.setProject);

  const [tab,setTab] = useState("content");

  const layout = layoutRegistry[beat.layout];
  const structure = layout?.structure || {};

  if (!structure.caption) return null;

  const caption = beat.caption || {
    show:true,
    style:"tiktokClean",
    animation:"fade",
    position:"bottom"
  };

  const previewText = beat.spoken || "Your caption preview text";

  const updateCaption = (key,value)=>{

    updateBeat(beat.id,{
      caption:{
        ...caption,
        [key]:value
      }
    });

  };

  const updateSpoken = (value)=>{

    updateBeat(beat.id,{
      spoken:value
    });

  };

  const applyStyleToAllBeats = ()=>{

    const updatedBeats = project.beats.map((b)=>({
      ...b,
      caption:{
        ...b.caption,
        style:caption.style
      }
    }));

    setProject({
      ...project,
      beats:updatedBeats
    });

  };

  const renderPreviewStyle = (styleKey)=>{

    const styleConfig =
      captionStyleRegistry[styleKey]?.() ||
      captionStyleRegistry.tiktokClean();

    const words = previewText.split(" ").slice(0,10);

    const isActive = caption.style === styleKey;

    return (

      <div
        key={styleKey}
        onClick={()=>updateCaption("style",styleKey)}
        className={`cursor-pointer rounded-lg border transition mb-4 ${
          isActive
            ? "border-indigo-500 ring-2 ring-indigo-300"
            : "border-gray-200"
        }`}
      >

        <div
          style={{
            fontSize:11,
            fontWeight:600,
            color:"#666",
            textTransform:"uppercase",
            marginBottom:8
          }}
        >
          {styleKey}
        </div>

        <div
          style={{
            textAlign:"center",
            background:"#333",
            padding:"10px",
            ...styleConfig.container
          }}
        >

          {words.map((word,index)=>(

            <span
              key={index}
              style={{
                display:"inline-block",
                marginRight:6,
                ...styleConfig.word,
                fontSize:14
              }}
            >
              {word}
            </span>

          ))}

        </div>

      </div>

    );

  };

  return (

    <div className="space-y-4">

      <h4 className="mb-4 text-base bg-gray-100 px-2 py-1 font-semibold uppercase">
        Caption
      </h4>

      <div className="flex gap-2">

        <button
          onClick={()=>setTab("content")}
          className={`px-3 py-1 rounded text-[12px] ${
            tab==="content" ? "bg-black text-white" : "bg-white"
          }`}
        >
          Caption
        </button>

        <button
          onClick={()=>setTab("style")}
          className={`px-3 py-1 rounded text-[12px] ${
            tab==="style" ? "bg-black text-white" : "bg-white"
          }`}
        >
          Style
        </button>

        <button
          onClick={()=>setTab("animation")}
          className={`px-3 py-1 rounded text-[12px] ${
            tab==="animation" ? "bg-black text-white" : "bg-white"
          }`}
        >
          Animation
        </button>

      </div>

      {tab==="content" && (

        <div className="flex gap-6 items-start">

          <div className="flex flex-col w-[70%]">

            <div className="text-xs mb-1">
              Caption
            </div>

            <textarea
              value={beat.spoken || ""}
              onChange={(e)=>updateSpoken(e.target.value)}
              className="border rounded-md p-3 text-sm"
            />

          </div>

          <div className="flex flex-col">

            <div className="text-xs mb-1">
              Duration
            </div>

            <input
              type="number"
              min={1}
              value={beat.duration_sec}
              onChange={(e)=>
                updateBeat(beat.id,{
                  duration_sec:Number(e.target.value)
                })
              }
              className="w-[80px] border rounded-md px-3 py-2 text-sm"
            />

            <label className="flex items-center gap-2 mt-3 text-sm">

              <input
                type="checkbox"
                checked={caption.show}
                onChange={(e)=>updateCaption("show",e.target.checked)}
              />

              Show Caption

            </label>

          </div>

        </div>

      )}

      {tab==="style" && (

        <div>

          <div className="flex mb-2 items-center">

            <button
              onClick={applyStyleToAllBeats}
              className="text-xs px-2 py-1 border rounded"
            >
              Apply Style to All Beats
            </button>

          </div>

          <div
            className="flex flex-col max-h-[200px] overflow-y-auto p-3"
            style={{
              border:"1px solid #ddd",
              borderRadius:5
            }}
          >
            {STYLES.map(renderPreviewStyle)}
          </div>

        </div>

      )}

      {tab==="animation" && (

        <div className="flex gap-4">

          <div className="w-[200px]">

            <div className="text-xs mb-1">
              Animation
            </div>

            <select
              value={caption.animation}
              onChange={(e)=>updateCaption("animation",e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {ANIMATIONS.map((a)=>(
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

          </div>

          <div className="w-[200px]">

            <div className="text-xs mb-1">
              Position
            </div>

            <select
              value={caption.position || "bottom"}
              onChange={(e)=>updateCaption("position",e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {POSITIONS.map((p)=>(
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

          </div>

        </div>

      )}

    </div>

  );

}