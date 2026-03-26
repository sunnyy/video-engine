import FullZone from "../remotion/layouts/FullZone.jsx";
import SplitZone from "../remotion/layouts/SplitZone.jsx";
import FloatingAvatar from "../remotion/layouts/FloatingAvatar.jsx";
import SideAvatar from "../remotion/layouts/SideAvatar.jsx";
import CenterAvatar from "../remotion/layouts/CenterAvatar.jsx";
import PictureInPicture from "../remotion/layouts/PictureInPicture.jsx";

import ThreeZone from "../remotion/layouts/ThreeZone.jsx";
import TwoTopOneBottom from "../remotion/layouts/TwoTopOneBottom.jsx";
import OneTopTwoBottom from "../remotion/layouts/OneTopTwoBottom.jsx";
import FourGrid from "../remotion/layouts/FourGrid.jsx";

export const layoutRegistry = {

  FullZone: {
    component: FullZone,
    zones: ["z1"],
    supportsAvatar: true,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 1,
      prefersAvatar: false
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  SplitZone: {
    component: SplitZone,
    zones: ["z1","z2"],
    supportsAvatar: true,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 2,
      avatarSlots: 1,
      prefersAvatar: false
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",
    captionStrategy: "auto",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  ThreeZone: {
    component: ThreeZone,
    zones: ["z1","z2","z3"],
    supportsAvatar: false,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 3,
      avatarSlots: 0,
      prefersAvatar: false
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  TwoTopOneBottom: {
    component: TwoTopOneBottom,
    zones: ["z1","z2","z3"],
    supportsAvatar: false,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 3,
      avatarSlots: 0,
      prefersAvatar: false
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  OneTopTwoBottom: {
    component: OneTopTwoBottom,
    zones: ["z1","z2","z3"],
    supportsAvatar: false,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 3,
      avatarSlots: 0,
      prefersAvatar: false
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  FourGrid: {
    component: FourGrid,
    zones: ["z1","z2","z3","z4"],
    supportsAvatar: false,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 4,
      avatarSlots: 0,
      prefersAvatar: false
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  FloatingAvatar: {
    component: FloatingAvatar,
    zones: ["z1","z2"],
    supportsAvatar: true,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 1,
      prefersAvatar: true
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  SideAvatar: {
    component: SideAvatar,
    zones: ["z1","z2"],
    supportsAvatar: true,
    orientations: ["horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 1,
      prefersAvatar: true
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  CenterAvatar: {
    component: CenterAvatar,
    zones: ["z1","z2"],
    supportsAvatar: true,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 1,
      avatarSlots: 1,
      prefersAvatar: true
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  },

  PictureInPicture: {
    component: PictureInPicture,
    zones: ["z1","z2"],
    supportsAvatar: true,
    orientations: ["vertical","horizontal"],

    capability: {
      assetSlots: 2,
      avatarSlots: 1
    },

    safeAreas: {
      heading: { top: 80, left: 80, right: 80 },
      blocks: { top: 140, left: 80, right: 80, bottom: 260 },
      caption: { bottom: 160, left: 80, right: 80 }
    },

    captionPosition: "bottom",

    structure: {
      heading: true,
      blocks: true,
      caption: true
    }
  }

};