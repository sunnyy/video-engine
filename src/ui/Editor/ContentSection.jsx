import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";
import { componentRegistry } from "../../core/componentRegistry";
import ComponentPicker from "./ComponentPicker";

export default function ContentSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const layout = layoutRegistry[beat.layout];
  const structure = layout?.structure || {};

  const [pickerSlot, setPickerSlot] = useState(null);

  const addComponent = (type) => {
    const def = componentRegistry[type]?.defaultProps || {};

    updateBeat(beat.id, {
      components: {
        ...beat.components,
        [pickerSlot]: {
          type,
          props: def,
          style: {
            position: "absolute",
            top: 200,
            left: 200,
            width: 300,
          },
        },
      },
    });

    setPickerSlot(null);
  };

  const updateProp = (slot, key, value) => {
    const existing = beat.components?.[slot];

    updateBeat(beat.id, {
      components: {
        ...beat.components,
        [slot]: {
          ...existing,
          props: {
            ...existing.props,
            [key]: value,
          },
        },
      },
    });
  };

  const updateStyle = (slot, key, value) => {
    const existing = beat.components?.[slot];

    updateBeat(beat.id, {
      components: {
        ...beat.components,
        [slot]: {
          ...existing,
          style: {
            ...existing.style,
            [key]: Number(value),
          },
        },
      },
    });
  };

  return (
    <div className="w-full flex flex-col">

      {/* SPOKEN */}

      <div className="w-full flex flex-wrap items-end">

        <div className="flex flex-col w-[60%]">
          <h4 className="text-sm font-semibold uppercase mb-2">
            Content
          </h4>

          <textarea
            value={beat.spoken}
            onChange={(e) =>
              updateBeat(beat.id, { spoken: e.target.value })
            }
            className="w-[90%] border rounded-md p-3 text-sm"
          />
        </div>

        <div className="flex flex-col items-center ml-4">
          <h4 className="text-sm font-semibold uppercase mb-2">
            Duration
          </h4>

          <input
            type="number"
            min={1}
            value={beat.duration_sec}
            onChange={(e) =>
              updateBeat(beat.id, {
                duration_sec: Number(e.target.value),
              })
            }
            className="w-16 border rounded-md px-3 py-2 text-sm"
          />
        </div>

      </div>

      {/* HEADING */}

      {structure.heading && (
        <div className="mt-6 w-[60%]">

          <h4 className="text-sm font-semibold uppercase mb-2">
            Heading
          </h4>

          <input
            value={beat.heading || ""}
            onChange={(e) =>
              updateBeat(beat.id, {
                heading: e.target.value,
              })
            }
            className="w-[90%] border rounded-md p-2 text-sm"
          />

        </div>
      )}

      {/* TEXT */}

      {structure.text && (
        <div className="mt-6 w-[60%]">

          <h4 className="text-sm font-semibold uppercase mb-2">
            Text
          </h4>

          <textarea
            value={beat.text || ""}
            onChange={(e) =>
              updateBeat(beat.id, {
                text: e.target.value,
              })
            }
            className="w-[90%] border rounded-md p-3 text-sm"
          />

        </div>
      )}

      {/* COMPONENTS */}

      {structure.components &&
        Object.keys(beat.components || {}).map((slot) => {
          const component = beat.components?.[slot];

          return (
            <div key={slot} className="mt-6 w-[60%]">

              <h4 className="text-sm font-semibold uppercase mb-2">
                Component
              </h4>

              {!component && (
                <button
                  onClick={() => setPickerSlot(slot)}
                  className="text-sm bg-black text-white px-3 py-2 rounded"
                >
                  Add Component
                </button>
              )}

              {component && (
                <div className="border p-3 rounded">

                  <div className="text-xs mb-2 text-gray-500">
                    {component.type}
                  </div>

                  {Object.entries(component.props || {}).map(
                    ([key, value]) => (
                      <input
                        key={key}
                        value={value}
                        placeholder={key}
                        onChange={(e) =>
                          updateProp(slot, key, e.target.value)
                        }
                        className="w-full border rounded p-2 text-sm mb-2"
                      />
                    )
                  )}

                  <div className="mt-3">

                    <div className="text-xs mb-1">Top</div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={component.style?.top || 0}
                      onChange={(e) =>
                        updateStyle(slot, "top", e.target.value)
                      }
                      className="w-full"
                    />

                    <div className="text-xs mt-2 mb-1">Left</div>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={component.style?.left || 0}
                      onChange={(e) =>
                        updateStyle(slot, "left", e.target.value)
                      }
                      className="w-full"
                    />

                    <div className="text-xs mt-2 mb-1">Width</div>
                    <input
                      type="range"
                      min="100"
                      max="800"
                      value={component.style?.width || 300}
                      onChange={(e) =>
                        updateStyle(slot, "width", e.target.value)
                      }
                      className="w-full"
                    />

                  </div>

                  <button
                    onClick={() =>
                      updateBeat(beat.id, {
                        components: {
                          ...beat.components,
                          [slot]: null,
                        },
                      })
                    }
                    className="text-xs text-red-500 mt-3"
                  >
                    Remove
                  </button>

                </div>
              )}

            </div>
          );
        })}

      {pickerSlot && (
        <ComponentPicker
          onSelect={addComponent}
          onClose={() => setPickerSlot(null)}
        />
      )}

    </div>
  );
}