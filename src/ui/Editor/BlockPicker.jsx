import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

const blocks = [
  {
    type: "Hook",
    variant: "bigWord",
    label: "Hook",
    defaultProps: {
      text: "3 mistakes founders make",
    },
  },
  {
    type: "Slideshow",
    variant: "default",
    label: "Slideshow",
    defaultProps: {
      images: ["/images/img_0.jpg", "/images/img_1.jpg", "/images/img_2.jpg"],
    },
  },
  {
    type: "ListReveal",
    variant: "highlightReveal",
    label: "List Reveal",
    defaultProps: {
      items: ["First point", "Second point", "Third point"],
    },
  },
  {
    type: "Stat",
    variant: "bigNumber",
    label: "Stat",
    defaultProps: {
      value: "85%",
      label: "Engagement Increase",
    },
  },
  {
    type: "Quote",
    variant: "highlight",
    label: "Quote",
    defaultProps: {
      quote: "Your product is the marketing.",
      author: "Naval Ravikant",
    },
  },
  {
    type: "BeforeAfter",
    variant: "default",
    label: "Before / After",
    defaultProps: {
      before: "/images/img_3.jpg",
      after: "/images/img_4.jpg",
    },
  },
  {
    type: "Comparison",
    variant: "cards",
    label: "Comparison",
    defaultProps: {
      left: {
        title: "Before",
        text: "Old approach",
        image: "/images/img_5.jpg",
      },
      right: {
        title: "After",
        text: "New approach",
        image: "/images/img_1.jpg",
      },
    },
  },
  {
    type: "NumberTicker",
    variant: "countUp",
    label: "Number Ticker",
    defaultProps: {
      value: "85",
      label: "Growth",
    },
  },
];

export default function BlockPicker({ beat, zoneKey }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);

  const addBlock = (block) => {
    const zones = { ...beat.zones };

    zones[zoneKey] = {
      ...zones[zoneKey],
      role: "content",
      block: {
        type: block.type,
        variant: block.variant,
        props: block.defaultProps,
      },
    };

    updateBeat(beat.id, { zones });
  };

  return (
    <div className="grid grid-cols-2 gap-2">

      {blocks.map((b) => (
        <button
          key={b.type}
          onClick={() => addBlock(b)}
          className="
            flex items-center justify-center
            h-[34px]
            text-[11px] font-medium
            rounded-[6px]
            border border-[rgba(255,255,255,0.08)]
            bg-[#16161f]
            text-[#9494a8]
            hover:text-[#e8e8f0]
            hover:bg-[#1c1c28]
            hover:border-[rgba(255,255,255,0.15)]
            transition
          "
        >
          {b.label}
        </button>
      ))}

    </div>
  );
}