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
    "FullZone",
    "SplitZone",
    "ThreeZone",
    "TwoTopOneBottom",
    "OneTopTwoBottom",
    "FourGrid",
    "SideAvatar",
    "CenterAvatar",
    "FloatingAvatar",
    "PictureInPicture"
  ],

  intents: [
    "hook",
    "stat",
    "list",
    "quote",
    "question",
    "reveal",
    "explanation",
    "comparison"
  ],

  storytellingPatterns: [

    {
      name: "viral_hook",
      beats: [
        "hook",
        "reveal",
        "stat",
        "explanation"
      ]
    },

    {
      name: "top_list",
      beats: [
        "hook",
        "list",
        "list",
        "list",
        "reveal"
      ]
    },

    {
      name: "comparison",
      beats: [
        "hook",
        "comparison",
        "reveal",
        "explanation"
      ]
    }

  ]

};