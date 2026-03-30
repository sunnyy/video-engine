import React from "react";
import { DEFAULT_MYTH_VS_FACT_PROPS } from "./MythVsFactBlock";
import {
  TextInput,
  TextArea,
  ColorPicker,
  ToggleInput,
} from "./editorComponents";

export default function MythVsFactEditor({ block, updateBlockProp }) {
  const props = { ...DEFAULT_MYTH_VS_FACT_PROPS, ...(block?.props || {}) };

  return (
    <div className="space-y-4">
      <TextInput
        label="Kicker"
        value={props.kicker}
        onChange={(val) => updateBlockProp(block.id, "kicker", val)}
      />

      <TextInput
        label="Title"
        value={props.title}
        onChange={(val) => updateBlockProp(block.id, "title", val)}
      />

      <TextInput
        label="Myth label"
        value={props.mythLabel}
        onChange={(val) => updateBlockProp(block.id, "mythLabel", val)}
      />

      <TextInput
        label="Fact label"
        value={props.factLabel}
        onChange={(val) => updateBlockProp(block.id, "factLabel", val)}
      />

      <TextArea
        label="Myth"
        rows={4}
        value={props.myth}
        onChange={(val) => updateBlockProp(block.id, "myth", val)}
      />

      <TextArea
        label="Fact"
        rows={4}
        value={props.fact}
        onChange={(val) => updateBlockProp(block.id, "fact", val)}
      />

      <TextInput
        label="Alignment (left or center)"
        value={props.align}
        onChange={(val) =>
          updateBlockProp(
            block.id,
            "align",
            val === "center" ? "center" : "left"
          )
        }
      />

      <TextInput
        label="Emphasis (myth or fact)"
        value={props.emphasis}
        onChange={(val) =>
          updateBlockProp(
            block.id,
            "emphasis",
            val === "myth" ? "myth" : "fact"
          )
        }
      />

      <TextInput
        label="Split (0.35 - 0.65)"
        value={String(props.split)}
        onChange={(val) =>
          updateBlockProp(
            block.id,
            "split",
            Math.max(0.35, Math.min(0.65, Number(val) || 0.5))
          )
        }
      />

      <ToggleInput
        label="Show badge"
        checked={props.showBadge}
        onChange={(val) => updateBlockProp(block.id, "showBadge", val)}
      />

      <ToggleInput
        label="Show divider"
        checked={props.showDivider}
        onChange={(val) => updateBlockProp(block.id, "showDivider", val)}
      />

      <ColorPicker
        label="Accent"
        value={props.accent}
        onChange={(val) => updateBlockProp(block.id, "accent", val)}
      />

      <ColorPicker
        label="Background"
        value={props.bg}
        onChange={(val) => updateBlockProp(block.id, "bg", val)}
      />

      <ColorPicker
        label="Text"
        value={props.text}
        onChange={(val) => updateBlockProp(block.id, "text", val)}
      />

      <ColorPicker
        label="Subtext"
        value={props.subtext}
        onChange={(val) => updateBlockProp(block.id, "subtext", val)}
      />

      <ColorPicker
        label="Myth tone"
        value={props.mythTone}
        onChange={(val) => updateBlockProp(block.id, "mythTone", val)}
      />

      <ColorPicker
        label="Fact tone"
        value={props.factTone}
        onChange={(val) => updateBlockProp(block.id, "factTone", val)}
      />
    </div>
  );
}