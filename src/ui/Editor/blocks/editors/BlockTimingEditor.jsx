import React from "react";

export default function BlockTimingEditor({ block }) {

  const type = block?.type;
  const props = block?.props || {};

  const items = props.items || [];
  const images = props.images || [];

  let suggested = null;

  if (type === "ListReveal") {
    suggested = items.length * 0.6;
  }

  if (type === "Slideshow") {
    suggested = images.length * 1.2;
  }

  if (!suggested) return null;

  return (

    <div className="mt-3">

      <div className="text-[11px] text-gray-500">

        Suggested beat duration: {suggested.toFixed(1)}s

      </div>

    </div>

  );

}