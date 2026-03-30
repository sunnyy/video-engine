/**
 * QuoteHighlightEditor.jsx
 * Place at: src/ui/Editor/blocks/editors/QuoteHighlightEditor.jsx
 *
 * Receives: { slot, block, updateBlockProp }
 * block.props keys: text, author, role, accent
 */
import React from "react";
import { QUOTE_HIGHLIGHT_DEFAULTS } from "../../../../remotion/blocks/QuoteHighlightBlock";
import { Field, TextArea, TextInput, ColorPicker } from "./editorComponents";

export default function QuoteHighlightEditor({ slot, block, updateBlockProp }) {
  const props = { ...QUOTE_HIGHLIGHT_DEFAULTS, ...(block?.props || {}) };
  const set   = (key, val) => updateBlockProp(slot, key, val);

  return (
    <div className="flex flex-col gap-4 mt-3">

      <Field label="Quote text">
        <TextArea
          value={props.text}
          onChange={v => set("text", v)}
          placeholder="Enter quote..."
          rows={4}
        />
      </Field>

      <Field label="Author name">
        <TextInput
          value={props.author}
          onChange={v => set("author", v)}
          placeholder="Unknown"
        />
      </Field>

      <Field label="Role / source">
        <TextInput
          value={props.role}
          onChange={v => set("role", v)}
          placeholder="Timeless wisdom"
        />
      </Field>

      <Field label="Accent colour">
        <ColorPicker value={props.accent} onChange={v => set("accent", v)} />
      </Field>

    </div>
  );
}