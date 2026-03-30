import React from "react";
import { useProjectStore } from "../../store/useProjectStore";

const blocks = [

  { type: "StatExplosion", label: "Stat Explosion",
    defaultProps: {
      label: "Global Reach",
      value: "2.4B",
      description: "Revenue generated",
      badge: "+38% growth"
    }
  },

  { type: "ListCountdown", label: "List Countdown",
    defaultProps: {
      title: "Top reasons",
      items: [
        { title: "Save time", sub: "Automation does the work" },
        { title: "Better results", sub: "3x improvement" },
        { title: "Zero learning curve", sub: "Start instantly" }
      ]
    }
  },

  { type: "QuoteHighlight", label: "Quote",
    defaultProps: {
      quote: "The best time to start was yesterday. The second best time is today.",
      author: "Unknown",
      role: ""
    }
  },

  { type: "MythVsFact", label: "Myth vs Fact",
    defaultProps: {
      myth: "You need 10,000 hours to master a skill",
      fact: "20 focused hours gets you competent"
    }
  },

  { type: "BeforeAfter", label: "Before / After",
    defaultProps: {
      beforeTitle: "Before",
      beforeValue: "2h",
      beforeDesc: "Manual reporting",
      afterTitle: "After",
      afterValue: "0m",
      afterDesc: "Fully automated"
    }
  },

  { type: "ProcessSteps", label: "Process Steps",
    defaultProps: {
      steps: [
        { title: "Define the goal", desc: "Clarify the outcome" },
        { title: "Build the system", desc: "Create repeatable workflow" },
        { title: "Scale", desc: "Optimize what works" }
      ]
    }
  },

  { type: "ProblemSolution", label: "Problem / Solution",
    defaultProps: {
      problem: "You create content daily but get no traction",
      solution: "Focus on strategic content frameworks"
    }
  },

  { type: "HookImpact", label: "Hook Impact",
    defaultProps: {
      eyebrow: "Stop scrolling",
      headline: "THIS CHANGES EVERYTHING",
      subtext: "The one insight creators miss",
      cta: "Watch Now"
    }
  },

  { type: "Slideshow", label: "Slideshow",
    defaultProps: {
      images: ["/images/img_0.jpg","/images/img_1.jpg","/images/img_2.jpg"],
      title: "Gallery",
      subtitle: "Visual sequence"
    }
  },

  { type: "BadgePack", label: "Badge Pack",
    defaultProps: {
      badges: [
        { icon: "🔥", label: "Trending" },
        { icon: "⚡", label: "Fast" },
        { icon: "✓", label: "Verified" }
      ]
    }
  },

  { type: "LowerThird", label: "Lower Third",
    defaultProps: {
      name: "Creator Name",
      role: "Creative Director",
      meta: ["Mumbai", "10M views"]
    }
  },

  { type: "ProgressBars", label: "Progress Bars",
    defaultProps: {
      metrics: [
        { label: "Engagement", value: 94 },
        { label: "Retention", value: 78 },
        { label: "Shares", value: 61 }
      ]
    }
  },

  { type: "CountdownTimer", label: "Countdown",
    defaultProps: {
      label: "Launch drops in",
      days: "02",
      hours: "14",
      minutes: "37"
    }
  },

  { type: "CTAButton", label: "CTA Button",
    defaultProps: {
      headline: "Ready to start?",
      button: "Start Now",
      subtext: "No credit card required"
    }
  },

  { type: "KineticTypography", label: "Kinetic Type",
    defaultProps: {
      lines: ["YOUR CONTENT", "DESERVES", "BETTER DESIGN"]
    }
  },

  { type: "ReactionFloat", label: "Reactions",
    defaultProps: {
      count: 1240
    }
  },

  { type: "SplitScreen", label: "Split Screen",
    defaultProps: {
      leftTitle: "Old Way",
      leftValue: "40h",
      leftDesc: "Manual work",
      rightTitle: "New Way",
      rightValue: "4h",
      rightDesc: "Automation"
    }
  },

  { type: "Waveform", label: "Waveform",
    defaultProps: {
      title: "Now Playing",
      duration: "02:34"
    }
  },

  { type: "Testimonial", label: "Testimonial",
    defaultProps: {
      text: "This changed how I create content.",
      author: "Priya Sharma",
      handle: "@priyacreates"
    }
  },

  { type: "ChapterTitle", label: "Chapter Title",
    defaultProps: {
      chapter: "03",
      title: "THE SYSTEM",
      subtitle: "Building scalable workflows"
    }
  }

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
        variant: "default",
        props: block.defaultProps
      }
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