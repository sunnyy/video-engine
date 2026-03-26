import React from "react";
import { useVideoConfig } from "remotion";

import Stacked from "./variants/listReveal/stacked";
import Bullet from "./variants/listReveal/bullet";
import Cards from "./variants/listReveal/cards";
import Timeline from "./variants/listReveal/timeline";
import Grid from "./variants/listReveal/grid";
import HighlightReveal from "./variants/listReveal/highlightReveal";

export default function ListRevealBlock({ block, variant = "stacked" }) {

  const { fps } = useVideoConfig();

  const items = block?.props?.items || [];
  if (!items.length) return null;

  const durationSec = block?.props?.duration_sec || 3;
  const durationFrames = Math.floor(durationSec * fps);

  const shared = {
    block,
    durationFrames,
    items
  };

  if (variant === "bullet") {
    return <Bullet {...shared} />;
  }

  if (variant === "cards") {
    return <Cards {...shared} />;
  }

  if (variant === "timeline") {
    return <Timeline {...shared} />;
  }

  if (variant === "grid") {
    return <Grid {...shared} />;
  }

  if (variant === "highlightReveal") {
    return <HighlightReveal {...shared} />;
  }

  return <Stacked {...shared} />;

}