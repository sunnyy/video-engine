/**
 * visualGrammar.js
 * src/core/visualGrammar.js
 */
export const VISUAL_GRAMMAR = {

  blocks: [
    "HookBlock",
    "QuoteBlock",
    "StatBlock",
    "ListRevealBlock",
    "SlideshowBlock",
    "ComparisonBlock",
    "BeforeAfterBlock",
    "NumberTickerBlock"
  ],

  layouts: [
    "FullBleed",
    "HeadlineOverAsset",
    "SplitAssets",
    "ThreeStack",
    "HeadlineReveal",
    "FourCollage",
  ],

  intents: [
    "hook",
    "stat",
    "list",
    "quote",
    "question",
    "reveal",
    "explanation",
    "comparison",
    "proof",
    "showcase",
    "cta",
  ],

  storytellingPatterns: [

    {
      name: "viral_hook",
      beats: ["hook", "reveal", "stat", "explanation"]
    },

    {
      name: "top_list",
      beats: ["hook", "list", "list", "list", "reveal"]
    },

    {
      name: "comparison",
      beats: ["hook", "comparison", "reveal", "explanation"]
    }

  ]

};