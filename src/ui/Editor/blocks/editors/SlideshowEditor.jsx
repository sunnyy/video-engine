import React from "react";
import { SLIDESHOW_DEFAULTS } from "../../../../remotion/blocks/SlideshowBlock";
import { Field, ListEditor, ColorPicker } from "./editorComponents";

export default function SlideshowEditor({ slot, block, updateBlockProp }) {
  const props = { ...SLIDESHOW_DEFAULTS, ...(block?.props || {}) };

  const set = (k, v) => updateBlockProp(slot, k, v);

  const titles = props.slides?.map(s => s.title) || [];

  const updateSlides = (list) => {
    const slides = list.map((title, i) => ({
      title,
      sub: props.slides?.[i]?.sub || "",
    }));
    set("slides", slides);
  };

  return (
    <div className="flex flex-col gap-4 mt-3">

      <Field label="Slides">
        <ListEditor
          items={titles}
          onChange={updateSlides}
          placeholder="Slide title..."
        />
      </Field>

      <Field label="Accent colour">
        <ColorPicker
          value={props.accent}
          onChange={v => set("accent", v)}
        />
      </Field>

    </div>
  );
}