import React from "react";
import { useVideoConfig } from "remotion";

import CountUp from "./variants/ticker/countUp";
import Odometer from "./variants/ticker/odometer";
import Pulse from "./variants/ticker/pulse";

export default function NumberTickerBlock({ block, variant = "countUp" }) {

  const { fps } = useVideoConfig();

  if (block?.props?.value === undefined) return null;

  const durationSec = block?.props?.duration_sec || 2;
  const durationFrames = Math.floor(durationSec * fps);

  const shared = {
    block,
    durationFrames
  };

  if (variant === "odometer") {
    return <Odometer {...shared} />;
  }

  if (variant === "pulse") {
    return <Pulse {...shared} />;
  }

  return <CountUp {...shared} />;

}