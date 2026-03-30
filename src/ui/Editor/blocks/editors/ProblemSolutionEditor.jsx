import React from "react";
import { PROBLEM_SOLUTION_DEFAULTS } from "../../../../remotion/blocks/ProblemSolutionBlock";
import { Field, TextArea, TextInput, ColorPicker } from "./editorComponents";

export default function ProblemSolutionEditor({ slot, block, updateBlockProp }) {
  const props = { ...PROBLEM_SOLUTION_DEFAULTS, ...(block?.props || {}) };

  const set = (k, v) => updateBlockProp(slot, k, v);

  return (
    <div className="flex flex-col gap-4 mt-3">

      <Field label="Problem label">
        <TextInput
          value={props.problemLabel}
          onChange={v => set("problemLabel", v)}
        />
      </Field>

      <Field label="Problem text">
        <TextArea
          value={props.problem}
          onChange={v => set("problem", v)}
          rows={3}
        />
      </Field>

      <Field label="Solution label">
        <TextInput
          value={props.solutionLabel}
          onChange={v => set("solutionLabel", v)}
        />
      </Field>

      <Field label="Solution text">
        <TextArea
          value={props.solution}
          onChange={v => set("solution", v)}
          rows={3}
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