import React from "react";

export default function LayoutPreview({ layout }) {

  const render = () => {

    switch (layout) {

      case "FullZone":
        return (
          <div className="w-full h-full bg-gray-400 rounded" />
        );

      case "SplitZone":
        return (
          <div className="w-full h-full grid grid-rows-2 gap-[2px]">
            <div className="bg-gray-400" />
            <div className="bg-gray-600" />
          </div>
        );

      case "ThreeZone":
        return (
          <div className="w-full h-full grid grid-rows-3 gap-[2px]">
            <div className="bg-gray-400" />
            <div className="bg-gray-600" />
            <div className="bg-gray-500" />
          </div>
        );

      case "TwoTopOneBottom":
        return (
          <div className="w-full h-full grid grid-rows-2 gap-[2px]">
            <div className="grid grid-cols-2 gap-[2px]">
              <div className="bg-gray-400" />
              <div className="bg-gray-600" />
            </div>
            <div className="bg-gray-500" />
          </div>
        );

      case "OneTopTwoBottom":
        return (
          <div className="w-full h-full grid grid-rows-2 gap-[2px]">
            <div className="bg-gray-400" />
            <div className="grid grid-cols-2 gap-[2px]">
              <div className="bg-gray-600" />
              <div className="bg-gray-500" />
            </div>
          </div>
        );

      case "FourGrid":
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px]">
            <div className="bg-gray-400" />
            <div className="bg-gray-600" />
            <div className="bg-gray-500" />
            <div className="bg-gray-700" />
          </div>
        );

      case "PictureInPicture":
        return (
          <div className="relative w-full h-full bg-gray-500">
            <div className="absolute w-[40%] h-[30%] bottom-2 right-2 bg-gray-700 border" />
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-gray-500" />
        );

    }

  };

  return (

    <div className="w-[55px] h-[100px] border rounded overflow-hidden bg-black">

      {render()}

    </div>

  );

}