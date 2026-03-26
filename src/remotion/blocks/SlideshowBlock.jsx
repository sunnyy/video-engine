import React from "react";
import { useVideoConfig } from "remotion";

import ZoomFade from "./variants/slideshow/zoomFade";
import KenBurns from "./variants/slideshow/kenBurns";
import Carousel3D from "./variants/slideshow/carousel3D";
import StackCards from "./variants/slideshow/stackCards";

export default function SlideshowBlock({ block, variant = "zoomFade" }) {

  const { fps } = useVideoConfig();

  const images = block?.props?.images || [];
  if (!images.length) return null;

  const durationSec = block?.props?.duration_sec || 3;
  const durationFrames = Math.floor(durationSec * fps);

  const shared = {
    block,
    images,
    durationFrames
  };

  if (variant === "kenBurns") {
    return <KenBurns {...shared} />;
  }

  if (variant === "carousel3D") {
    return <Carousel3D {...shared} />;
  }

  if (variant === "stackCards") {
    return <StackCards {...shared} />;
  }

  return <ZoomFade {...shared} />;

}