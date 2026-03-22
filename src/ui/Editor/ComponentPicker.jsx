import React from "react";
import { componentRegistry } from "../../core/componentRegistry";

export default function ComponentPicker({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

      <div className="w-[700px] bg-white rounded-xl p-6">

        <h3 className="text-lg font-semibold mb-4">
          Add Component
        </h3>

        <div className="grid grid-cols-3 gap-4">

          {Object.entries(componentRegistry).map(([key, comp]) => (
            <div
              key={key}
              onClick={() => onSelect(key)}
              className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
            >
              <div className="text-sm font-semibold mb-2">
                {comp.label}
              </div>

              <div className="text-xs text-gray-500">
                preview
              </div>

            </div>
          ))}

        </div>

        <button
          onClick={onClose}
          className="mt-6 text-sm text-gray-500"
        >
          Close
        </button>

      </div>

    </div>
  );
}