import React from "react";

export default function LayoutPreview({ layout }) {

  const zoneA = "bg-[#2a2a3a]";
  const zoneB = "bg-[#3a3a4a]";
  const zoneC = "bg-[#444456]";
  const zoneD = "bg-[#55556a]";

  const render = () => {

    switch (layout) {

      case "FullZone":
        return (
          <div className={`w-full h-full ${zoneA}`} />
        );

      case "SplitZone":
        return (
          <div className="w-full h-full grid grid-rows-2 gap-[2px]">
            <div className={zoneA} />
            <div className={zoneB} />
          </div>
        );

      case "ThreeZone":
        return (
          <div className="w-full h-full grid grid-rows-3 gap-[2px]">
            <div className={zoneA} />
            <div className={zoneB} />
            <div className={zoneC} />
          </div>
        );

      case "TwoTopOneBottom":
        return (
          <div className="w-full h-full grid grid-rows-2 gap-[2px]">
            <div className="grid grid-cols-2 gap-[2px]">
              <div className={zoneA} />
              <div className={zoneB} />
            </div>
            <div className={zoneC} />
          </div>
        );

      case "OneTopTwoBottom":
        return (
          <div className="w-full h-full grid grid-rows-2 gap-[2px]">
            <div className={zoneA} />
            <div className="grid grid-cols-2 gap-[2px]">
              <div className={zoneB} />
              <div className={zoneC} />
            </div>
          </div>
        );

      case "FourGrid":
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px]">
            <div className={zoneA} />
            <div className={zoneB} />
            <div className={zoneC} />
            <div className={zoneD} />
          </div>
        );

      case "PictureInPicture":
        return (
          <div className={`relative w-full h-full ${zoneC}`}>
            <div className={`absolute w-[40%] h-[30%] bottom-2 right-2 ${zoneD} border border-[#ffffff14]`} />
          </div>
        );

      default:
        return (
          <div className={`w-full h-full ${zoneC}`} />
        );

    }

  };

  return (

    <div className="w-[55px] h-[100px] border border-[#ffffff10] rounded-[6px] overflow-hidden bg-[#0b0b10]">

      {render()}

    </div>

  );

}