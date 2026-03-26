import SlideshowBlock from "../remotion/blocks/SlideshowBlock.jsx";
import ListRevealBlock from "../remotion/blocks/ListRevealBlock.jsx";
import StatBlock from "../remotion/blocks/StatBlock.jsx";
import QuoteBlock from "../remotion/blocks/QuoteBlock.jsx";
import BeforeAfterBlock from "../remotion/blocks/BeforeAfterBlock.jsx";
import ComparisonBlock from "../remotion/blocks/ComparisonBlock.jsx";
import HookBlock from "../remotion/blocks/HookBlock.jsx";
import NumberTickerBlock from "../remotion/blocks/NumberTickerBlock.jsx";

const blockRegistry = {

  Hook: {
    renderer: HookBlock,
    roles: ["content","full"],
    variants: ["kinetic","bigWord","popScale"],
    minDuration: 2,
    defaults: {
      text: "Your hook text"
    }
  },

  Slideshow: {
    renderer: SlideshowBlock,
    roles: ["content","full"],
    variants: ["default","kenBurns","carousel3D","stackCards"],
    minDuration: 3,
    defaults: {
      images: []
    }
  },

  ListReveal: {
    renderer: ListRevealBlock,
    roles: ["content","full"],
    variants: ["bullet","cards","stacked","timeline","grid","highlightReveal"],
    minDuration: 3,
    defaults: {
      items: ["Point 1","Point 2","Point 3"]
    }
  },

  Stat: {
    renderer: StatBlock,
    roles: ["content","full"],
    variants: ["bigNumber","counter","minimal"],
    minDuration: 3,
    defaults: {
      value: "100",
      label: "Statistic"
    }
  },

  Quote: {
    renderer: QuoteBlock,
    roles: ["content","full"],
    variants: ["center","card","highlight"],
    minDuration: 3,
    defaults: {
      text: "Quote text"
    }
  },

  BeforeAfter: {
    renderer: BeforeAfterBlock,
    roles: ["content","full"],
    variants: ["default","slider","wipe"],
    minDuration: 3,
    defaults: {
      before: "",
      after: ""
    }
  },

  Comparison: {
    renderer: ComparisonBlock,
    roles: ["content","full"],
    variants: ["cards","split","minimal"],
    minDuration: 3,
    defaults: {
      left: "Option A",
      right: "Option B"
    }
  },

  NumberTicker: {
    renderer: NumberTickerBlock,
    roles: ["content","full"],
    variants: ["countUp","odometer","pulse"],
    minDuration: 2,
    defaults: {
      value: 100,
      label: ""
    }
  }

};

export default blockRegistry;

export function getBlockRenderer(type) {
  const entry = blockRegistry[type];
  return entry?.renderer || null;
}

export function getBlockRoles(type) {
  const entry = blockRegistry[type];
  return entry?.roles || [];
}

export function blockExists(type) {
  return Boolean(blockRegistry[type]);
}

export function getBlockVariants(type) {
  const entry = blockRegistry[type];
  return entry?.variants || [];
}

export function getBlockDefaults(type) {
  const entry = blockRegistry[type];
  return entry?.defaults || {};
}