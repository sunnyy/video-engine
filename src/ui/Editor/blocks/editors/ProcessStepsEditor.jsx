import React from "react";
import { PROCESS_STEPS_DEFAULTS } from "../../../../remotion/blocks/ProcessStepsBlock";
import { Field, ListEditor, ColorPicker } from "./editorComponents";

export default function ProcessStepsEditor({ slot, block, updateBlockProp }) {
  const props = { ...PROCESS_STEPS_DEFAULTS, ...(block?.props || {}) };

  const set = (k, v) => updateBlockProp(slot, k, v);

  const titles = props.steps?.map(s => s.title) || [];

  const updateSteps = (list) => {
    const steps = list.map((title, i) => ({
      title,
      desc: props.steps?.[i]?.desc || "",
      time: props.steps?.[i]?.time || "",
    }));
    set("steps", steps);
  };

  return (
    <div className="flex flex-col gap-4 mt-3">

      <Field label="Steps">
        <ListEditor
          items={titles}
          onChange={updateSteps}
          placeholder="Step title..."
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