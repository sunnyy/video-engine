import React from "react";
import { useVideoConfig } from "remotion";

import Kinetic from "./variants/hook/kinetic";
import BigWord from "./variants/hook/bigWord";
import PopScale from "./variants/hook/popScale";

export default function HookBlock({ block, variant = "kinetic" }) {

  const { fps } = useVideoConfig();

  if (!block?.props?.text) return null;

  const durationSec = block?.props?.duration_sec || 2;
  const durationFrames = Math.floor(durationSec * fps);

  const shared = {
    block,
    durationFrames
  };

  if (variant === "bigWord") {
    return <BigWord {...shared} />;
  }

  if (variant === "popScale") {
    return <PopScale {...shared} />;
  }

  return <Kinetic {...shared} />;

}