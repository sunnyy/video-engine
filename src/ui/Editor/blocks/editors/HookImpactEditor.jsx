import React from "react";
import { HOOK_IMPACT_DEFAULTS } from "../../../../remotion/blocks/HookImpactBlock";
import { Field, TextInput, TextArea, ColorPicker } from "./editorComponents";

export default function HookImpactEditor({ slot, block, updateBlockProp }) {
  const props = { ...HOOK_IMPACT_DEFAULTS, ...(block?.props || {}) };
  const set = (k, v) => updateBlockProp(slot, k, v);

  return (
    <div className="flex flex-col gap-4 mt-3">

      <Field label="Eyebrow">
        <TextInput value={props.eyebrow} onChange={v => set("eyebrow", v)} />
      </Field>

      <Field label="Headline">
        <TextArea value={props.headline} onChange={v => set("headline", v)} rows={2} />
      </Field>

      <Field label="Sub text">
        <TextArea value={props.sub} onChange={v => set("sub", v)} rows={2} />
      </Field>

      <Field label="CTA text">
        <TextInput value={props.cta} onChange={v => set("cta", v)} />
      </Field>

      <Field label="Accent colour">
        <ColorPicker value={props.accent} onChange={v => set("accent", v)} />
      </Field>

    </div>
  );
}