import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

const STYLES = [
  "clean",
  "boxed",
  "highlight",
];

const ANIMATIONS = [
  "fade",
  "word_reveal",
  "word_pop",
];

export default function CaptionsSection() {
  const project = useProjectStore(
    (s) => s.project
  );
  const updateProjectMeta =
    useProjectStore(
      (s) => s.updateProjectMeta
    );

  if (!project) return null;

  const { captionPreset } = project;

  return (
    <div className="w-1/2">
      <h4 className="mb-4 text-sm font-medium text-gray-600 uppercase tracking-wide">
        Caption Style (Global)
      </h4>

      <div className="flex gap-4">
        <select
          value={captionPreset.style}
          onChange={(e) =>
            updateProjectMeta({
              captionPreset: {
                ...captionPreset,
                style: e.target.value,
              },
            })
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={captionPreset.animation}
          onChange={(e) =>
            updateProjectMeta({
              captionPreset: {
                ...captionPreset,
                animation:
                  e.target.value,
              },
            })
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {ANIMATIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}