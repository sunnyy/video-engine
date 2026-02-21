import React from "react";
import { layoutRegistry } from "../core/layoutRegistry";

export default function BeatRenderer({ beat, project }) {
  if (!beat.visible) return null;

  const Layout =
    layoutRegistry[beat.visual_mode] ||
    layoutRegistry.full;

  return <Layout beat={beat} project={project} />;
}