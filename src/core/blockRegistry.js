/**
 * blockRegistry.js
 * Place at: src/core/blockRegistry.js
 *
 * IMPORTANT: defaults here must exactly match the block's
 * exported BLOCK_DEFAULTS shape so editors and previews
 * always have valid data to render.
 *
 * Variants list drives the dropdown in ContentTab.jsx.
 * Keep in sync with the PRESETS object in each block file.
 */

import StatExplosionBlock    from "../remotion/blocks/StatExplosionBlock.jsx";
import ListCountdownBlock    from "../remotion/blocks/ListCountdownBlock.jsx";
import QuoteHighlightBlock   from "../remotion/blocks/QuoteHighlightBlock.jsx";
// import MythVsFactBlock       from "../remotion/blocks/MythVsFactBlock.jsx";
import BeforeAfterBlock      from "../remotion/blocks/BeforeAfterBlock.jsx";
import ProcessStepsBlock     from "../remotion/blocks/ProcessStepsBlock.jsx";
import ProblemSolutionBlock  from "../remotion/blocks/ProblemSolutionBlock.jsx";
import HookImpactBlock       from "../remotion/blocks/HookImpactBlock.jsx";
import SlideshowBlock        from "../remotion/blocks/SlideshowBlock.jsx";
// import BadgePackBlock        from "../remotion/blocks/BadgePackBlock.jsx";
// import LowerThirdBlock       from "../remotion/blocks/LowerThirdBlock.jsx";
// import ProgressBarsBlock     from "../remotion/blocks/ProgressBarsBlock.jsx";
// import CountdownTimerBlock   from "../remotion/blocks/CountdownTimerBlock.jsx";
// import CTAButtonBlock        from "../remotion/blocks/CTAButtonBlock.jsx";
// import KineticTypographyBlock from "../remotion/blocks/KineticTypographyBlock.jsx";
// import ReactionFloatBlock    from "../remotion/blocks/ReactionFloatBlock.jsx";
// import SplitScreenBlock      from "../remotion/blocks/SplitScreenBlock.jsx";
// import WaveformBlock         from "../remotion/blocks/WaveformBlock.jsx";
// import TestimonialBlock      from "../remotion/blocks/TestimonialBlock.jsx";
// import ChapterTitleBlock     from "../remotion/blocks/ChapterTitleBlock.jsx";

const blockRegistry = {

  /* ── 1. STAT EXPLOSION ───────────────────────────────────── */
  StatExplosion: {
    renderer: StatExplosionBlock,
    roles: ["content", "full"],
    variants: ["bigNumber", "neonGlow", "editorial", "brutalist", "glassmorphic"],
    minDuration: 3,
    defaults: {
      prefix:      "$",
      value:       "2.4",
      suffix:      "B",
      label:       "Revenue generated",
      description: "In Q4 2024 alone",
      badge:       "↑ 38% YoY growth",
      accent:      "#f0e040",
    },
  },

  /* ── 2. LIST COUNTDOWN ───────────────────────────────────── */
  ListCountdown: {
    renderer: ListCountdownBlock,
    roles: ["content", "full"],
    variants: ["cards", "bars", "minimal"],
    minDuration: 4,
    defaults: {
      title: "Top reasons to start today",
      items: [
        { title: "Save 10 hours a week",    desc: "Automation handles the heavy lifting", value: 60 },
        { title: "3× better results",       desc: "Proven across 50,000+ users",          value: 80 },
        { title: "Zero learning curve",     desc: "Up and running in under 5 minutes",    value: 95 },
      ],
      accent: "#f0e040",
    },
  },

  /* ── 3. QUOTE HIGHLIGHT ──────────────────────────────────── */
  QuoteHighlight: {
    renderer: QuoteHighlightBlock,
    roles: ["content", "full"],
    variants: ["default", "large", "minimal"],
    minDuration: 3,
    defaults: {
      text:   "The best time to start was yesterday. The second best time is now.",
      author: "Unknown",
      role:   "Timeless wisdom",
      accent: "#6c47ff",
    },
  },

  /* ── 4. MYTH VS FACT ─────────────────────────────────────── */
  // MythVsFact: {
  //   renderer: MythVsFactBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "stacked", "minimal"],
  //   minDuration: 3,
  //   defaults: {
  //     myth:   "You need 10,000 hours to master any skill",
  //     fact:   "20 focused hours is enough to become competent at most things",
  //     accent: "#00e5c3",
  //   },
  // },

  // /* ── 5. BEFORE AFTER ─────────────────────────────────────── */
  BeforeAfter: {
    renderer: BeforeAfterBlock,
    roles: ["content", "full"],
    variants: ["sideBySide", "stacked", "minimal"],
    minDuration: 3,
    defaults: {
      beforeLabel: "Before",
      beforeValue: "2h",
      beforeDesc:  "Manual reporting every morning",
      afterLabel:  "After",
      afterValue:  "0m",
      afterDesc:   "Fully automated overnight",
      accent:      "#00e5c3",
    },
  },

  /* ── 6. PROCESS STEPS ────────────────────────────────────── */
  ProcessSteps: {
    renderer: ProcessStepsBlock,
    roles: ["content", "full"],
    variants: ["connected", "cards", "minimal"],
    minDuration: 4,
    defaults: {
      steps: [
        { title: "Define your goal",   desc: "Get crystal clear on what you want to achieve",      time: "Day 1"    },
        { title: "Build the system",   desc: "Create repeatable processes that work without you",  time: "Week 1–2"  },
        { title: "Scale and optimise", desc: "Double down on what works, cut what doesn't",        time: "Month 1+" },
      ],
      accent: "#6c47ff",
    },
  },

  // /* ── 7. PROBLEM SOLUTION ─────────────────────────────────── */
  ProblemSolution: {
    renderer: ProblemSolutionBlock,
    roles: ["content", "full"],
    variants: ["default", "split", "minimal"],
    minDuration: 3,
    defaults: {
      problem:       "You're creating content every day but getting zero traction",
      solution:      "One strategic post beats ten random ones. Here's the framework.",
      problemLabel:  "The Problem",
      solutionLabel: "The Fix",
      accent:        "#6c47ff",
    },
  },

  // /* ── 8. HOOK IMPACT ──────────────────────────────────────── */
  HookImpact: {
    renderer: HookImpactBlock,
    roles: ["content", "full"],
    variants: ["zoomBlur", "stamp", "splitReveal"],
    minDuration: 2,
    defaults: {
      eyebrow:  "Stop scrolling",
      headline: "THIS CHANGES EVERYTHING",
      sub:      "The one insight 99% of creators miss completely",
      cta:      "Watch Now →",
      accent:   "#ff4d6d",
    },
  },

  // /* ── 9. SLIDESHOW ────────────────────────────────────────── */
  Slideshow: {
    renderer: SlideshowBlock,
    roles: ["content", "full"],
    variants: ["kenBurns", "stackCards", "zoomFade"],
    minDuration: 4,
    defaults: {
      slides: [
        { title: "Golden Hour",  sub: "Cinematic landscape series" },
        { title: "City Pulse",   sub: "Urban motion collection"    },
        { title: "Ocean Drift",  sub: "Aerial coastal footage"     },
      ],
      accent: "#f0e040",
    },
  },

  // /* ── 10. BADGE PACK ──────────────────────────────────────── */
  // BadgePack: {
  //   renderer: BadgePackBlock,
  //   roles: ["content", "full"],
  //   variants: ["row", "stack", "scattered"],
  //   minDuration: 2,
  //   defaults: {
  //     badges: [
  //       { icon: "⚡", label: "Trending Now", color: "lime"   },
  //       { icon: "🔴", label: "Live",         color: "red"    },
  //       { icon: "🏆", label: "Award",        color: "purple" },
  //       { icon: "✓",  label: "Verified",     color: "teal"   },
  //     ],
  //     accent: "#f0e040",
  //   },
  // },

  // /* ── 11. LOWER THIRD ─────────────────────────────────────── */
  // LowerThird: {
  //   renderer: LowerThirdBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "minimal", "bold"],
  //   minDuration: 2,
  //   defaults: {
  //     name:     "Arjun Mehta",
  //     role:     "Creative Director",
  //     location: "Mumbai, India",
  //     handle:   "@arjunm",
  //     accent:   "#6c47ff",
  //   },
  // },

  // /* ── 12. PROGRESS BARS ───────────────────────────────────── */
  // ProgressBars: {
  //   renderer: ProgressBarsBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "coloured", "minimal"],
  //   minDuration: 3,
  //   defaults: {
  //     bars: [
  //       { label: "Engagement Rate", value: 94, color: "#f0e040" },
  //       { label: "Watch Retention", value: 78, color: "#6c47ff" },
  //       { label: "Share Rate",      value: 61, color: "#ff4d6d" },
  //       { label: "Click-Through",   value: 43, color: "#00e5c3" },
  //     ],
  //     accent: "#f0e040",
  //   },
  // },

  // /* ── 13. COUNTDOWN TIMER ─────────────────────────────────── */
  // CountdownTimer: {
  //   renderer: CountdownTimerBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "minimal", "neon"],
  //   minDuration: 3,
  //   defaults: {
  //     label:   "Launch drops in",
  //     days:    "02",
  //     hours:   "14",
  //     minutes: "37",
  //     sub:     "Join 12,000+ on the waitlist",
  //     accent:  "#6c47ff",
  //   },
  // },

  // /* ── 14. CTA BUTTON ──────────────────────────────────────── */
  // CTAButton: {
  //   renderer: CTAButtonBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "bold", "minimal"],
  //   minDuration: 2,
  //   defaults: {
  //     headline:   "Ready to 10× your output?",
  //     buttonText: "Start for Free →",
  //     sub:        "No credit card · Cancel anytime",
  //     accent:     "#f0e040",
  //   },
  // },

  // /* ── 15. KINETIC TYPOGRAPHY ──────────────────────────────── */
  // KineticTypography: {
  //   renderer: KineticTypographyBlock,
  //   roles: ["content", "full"],
  //   variants: ["flipIn", "slideUp", "scaleWord"],
  //   minDuration: 3,
  //   defaults: {
  //     line1:  "YOUR CONTENT",
  //     line2:  "DESERVES",
  //     line3:  "BETTER DESIGN",
  //     accent: "#f0e040",
  //   },
  // },

  // /* ── 16. REACTION FLOAT ──────────────────────────────────── */
  // ReactionFloat: {
  //   renderer: ReactionFloatBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "burst", "stream"],
  //   minDuration: 3,
  //   defaults: {
  //     count:  "12.4K",
  //     label:  "Reactions in last hour",
  //     emojis: ["❤️", "🔥", "😍", "👏", "💯"],
  //     accent: "#ff4d6d",
  //   },
  // },

  // /* ── 17. SPLIT SCREEN ────────────────────────────────────── */
  // SplitScreen: {
  //   renderer: SplitScreenBlock,
  //   roles: ["content", "full"],
  //   variants: ["sideBySide", "diagonal", "minimal"],
  //   minDuration: 3,
  //   defaults: {
  //     leftLabel:  "Old way",
  //     leftValue:  "40h",
  //     leftDesc:   "Hours per week on manual tasks",
  //     rightLabel: "New way",
  //     rightValue: "4h",
  //     rightDesc:  "With AI-powered automation",
  //     accent:     "#6c47ff",
  //   },
  // },

  // /* ── 18. WAVEFORM ────────────────────────────────────────── */
  // Waveform: {
  //   renderer: WaveformBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "minimal", "neon"],
  //   minDuration: 3,
  //   defaults: {
  //     title:       "Now Playing",
  //     subtitle:    "Episode 47 · The Creator Economy",
  //     currentTime: "02:34",
  //     totalTime:   "18:22",
  //     accent:      "#6c47ff",
  //   },
  // },

  // /* ── 19. TESTIMONIAL ─────────────────────────────────────── */
  // Testimonial: {
  //   renderer: TestimonialBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "minimal", "card"],
  //   minDuration: 3,
  //   defaults: {
  //     text:   "This completely changed how I produce content. What used to take a full day now takes 2 hours — and it looks way more professional.",
  //     name:   "Priya Sharma",
  //     handle: "@priyacreates · 2.1M followers",
  //     rating: 5,
  //     accent: "#f97316",
  //   },
  // },

  // /* ── 20. CHAPTER TITLE ───────────────────────────────────── */
  // ChapterTitle: {
  //   renderer: ChapterTitleBlock,
  //   roles: ["content", "full"],
  //   variants: ["default", "minimal", "bold"],
  //   minDuration: 2,
  //   defaults: {
  //     eyebrow: "Chapter One",
  //     number:  "01",
  //     title:   "THE SYSTEM",
  //     tagline: "Building frameworks that scale without you",
  //     accent:  "#f0e040",
  //   },
  // },

};

export default blockRegistry;

/* ── Utility helpers ──────────────────────────────────────── */

export function getBlockRenderer(type) {
  return blockRegistry[type]?.renderer || null;
}

export function getBlockRoles(type) {
  return blockRegistry[type]?.roles || [];
}

export function blockExists(type) {
  return Boolean(blockRegistry[type]);
}

export function getBlockVariants(type) {
  return blockRegistry[type]?.variants || [];
}

export function getBlockDefaults(type) {
  return blockRegistry[type]?.defaults || {};
}

export function getBlockLabel(type) {
  return blockRegistry[type]?.label || type;
}

/** All registered block type keys */
export const blockTypes = Object.keys(blockRegistry);