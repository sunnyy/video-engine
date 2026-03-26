import React from "react";

export default function ListRevealEditor({
  slot,
  block,
  updateBlockProp
}) {

  const items = block.props?.items || [];

  const updateItem = (index,value) => {

    const arr = [...items];
    arr[index] = value;

    updateBlockProp(slot,"items",arr);

  };

  const addItem = () => {

    updateBlockProp(slot,"items",[...items,"New item"]);

  };

  const removeItem = (index) => {

    const arr = items.filter((_,i)=>i!==index);
    updateBlockProp(slot,"items",arr);

  };

  return (

    <div className="mt-2 space-y-2">

      <div className="text-[11px]">
        Items
      </div>

      {items.map((item,i)=>(
        <div key={i} className="flex gap-2">

          <input
            value={item}
            onChange={(e)=>updateItem(i,e.target.value)}
            className="flex-1 border rounded text-[11px]"
          />

          <button
            onClick={()=>removeItem(i)}
            className="text-[10px] border px-2 rounded"
          >
            X
          </button>

        </div>
      ))}

      <button
        onClick={addItem}
        className="text-[11px] border px-2 py-1 rounded"
      >
        + Add Item
      </button>

    </div>

  );

}