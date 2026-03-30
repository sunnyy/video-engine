import React from "react";
import blockRegistry, { getBlockDefaults } from "../../../../core/blockRegistry";

export default function BlocksTab({ onSelect, onClose }) {

  const handleBlockSelect = (type) => {

    const defaults = getBlockDefaults(type);

    const block = {
      type,
      variant: "default",
      props: { ...defaults }
    };

    onSelect({
      kind: "block",
      block
    });

    onClose();

  };

  return (

    <div className="grid grid-cols-3 gap-4 overflow-y-auto content-start">

      {Object.keys(blockRegistry).map((type) => (

        <div
          key={type}
          onClick={() => handleBlockSelect(type)}
          className="cursor-pointer rounded-xl border p-6 text-center hover:border-indigo-500"
        >

          <div className="text-sm font-semibold">
            {type}
          </div>

        </div>

      ))}

    </div>

  );

}