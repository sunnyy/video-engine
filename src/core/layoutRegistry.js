import FullZone from "../remotion/layouts/FullZone.jsx";
import SplitZone from "../remotion/layouts/SplitZone.jsx";
import FloatingAvatar from "../remotion/layouts/FloatingAvatar.jsx";
import HeadlineFocus from "../remotion/layouts/HeadlineFocus.jsx";
import SideAvatar from "../remotion/layouts/SideAvatar.jsx";
import CenterAvatar from "../remotion/layouts/CenterAvatar.jsx";
import QuoteCard from "../remotion/layouts/QuoteCard.jsx";
import StatLayout from "../remotion/layouts/StatLayout.jsx";
import PictureInPicture from "../remotion/layouts/PictureInPicture.jsx";
import ListLayout from "../remotion/layouts/ListLayout.jsx";

export const layoutRegistry = {

  FullZone: {
    component: FullZone,
    zones: ["z1"],
    supportsAvatar: true,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 1,
      prefersAvatar: false
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 140, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      components: true,
      caption: true
    }
  },

  SplitZone: {
    component: SplitZone,
    zones: ["z1", "z2"],
    supportsAvatar: true,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 2,
      avatarSlots: 1,
      prefersAvatar: false
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 140, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      components: true,
      caption: true
    }
  },

  FloatingAvatar: {
    component: FloatingAvatar,
    zones: ["z1", "z2"],
    supportsAvatar: true,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 1,
      prefersAvatar: true
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 140, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      components: true,
      caption: true
    }
  },

  SideAvatar: {
    component: SideAvatar,
    zones: ["z1", "z2"],
    supportsAvatar: true,
    orientations: ["horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 1,
      prefersAvatar: true
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 140, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      components: true,
      caption: true
    }
  },

  CenterAvatar: {
    component: CenterAvatar,
    zones: ["z1", "z2"],
    supportsAvatar: true,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 1,
      prefersAvatar: true
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 140, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      components: true,
      caption: true
    }
  },

  PictureInPicture: {
    component: PictureInPicture,
    zones: ["z1", "z2"],
    supportsAvatar: true,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 2,
      avatarSlots: 1
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 140, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      components: true,
      caption: true
    }
  },

  HeadlineFocus: {
    component: HeadlineFocus,
    zones: ["z1"],
    supportsAvatar: false,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 0
    },

    safeAreas: {
      heading: { top: 200, left: 120, right: 120 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 300, left: 100, right: 100 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      caption: true
    }
  },

  QuoteCard: {
    component: QuoteCard,
    zones: ["z1"],
    supportsAvatar: false,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 0
    },

    safeAreas: {
      heading: { top: 220, left: 120, right: 120 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 320, left: 120, right: 120 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      caption: true
    }
  },

  StatLayout: {
    component: StatLayout,
    zones: ["z1"],
    supportsAvatar: false,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 0
    },

    safeAreas: {
      heading: { top: 120, left: 120, right: 120 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 260, left: 120, right: 120 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      caption: true
    }
  },

  ListLayout: {
    component: ListLayout,
    zones: ["z1"],
    supportsAvatar: false,
    orientations: ["vertical", "horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 0
    },

    safeAreas: {
      heading: { top: 120, left: 120, right: 120 },
      caption: { bottom: 160, left: 80, right: 80 },
      components: { top: 260, left: 120, right: 120 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      text: true,
      caption: true
    }
  }

};