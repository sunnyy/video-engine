import React from "react";
import { BEFORE_AFTER_DEFAULTS } from "../../../../remotion/blocks/BeforeAfterBlock";
import { Field, TextInput, ColorPicker } from "./editorComponents";

export default function BeforeAfterEditor({ slot, block, updateBlockProp }) {
  const props = { ...BEFORE_AFTER_DEFAULTS, ...(block?.props || {}) };
  const set = (k, v) => updateBlockProp(slot, k, v);

  return (
    <div className="flex flex-col gap-4 mt-3">

      <Field label="Before label">
        <TextInput value={props.beforeLabel} onChange={v => set("beforeLabel", v)} />
      </Field>

      <Field label="Before value">
        <TextInput value={props.beforeValue} onChange={v => set("beforeValue", v)} />
      </Field>

      <Field label="Before description">
        <TextInput value={props.beforeDesc} onChange={v => set("beforeDesc", v)} />
      </Field>

      <Field label="After label">
        <TextInput value={props.afterLabel} onChange={v => set("afterLabel", v)} />
      </Field>

      <Field label="After value">
        <TextInput value={props.afterValue} onChange={v => set("afterValue", v)} />
      </Field>

      <Field label="After description">
        <TextInput value={props.afterDesc} onChange={v => set("afterDesc", v)} />
      </Field>

      <Field label="Accent">
        <ColorPicker value={props.accent} onChange={v => set("accent", v)} />
      </Field>

    </div>
  );
}