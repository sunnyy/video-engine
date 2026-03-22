import { classifyBeatIntent } from "./beatIntent/beatIntentClassifier";

function extractNumber(text) {
  const match = text.match(/\d+%|\d+/);
  return match ? match[0] : null;
}

function splitList(text) {
  return text
    .split(/,| and /)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function detectQuote(text) {
  if (!text) return false;
  return text.includes('"') || text.length < 80;
}

export function autoGenerateComponents(beats) {

  return beats.map((beat, index) => {

    const intent = classifyBeatIntent(beat.spoken);

    let components = {};

    if (intent === "hook") {

      components.badge = {
        type: "badge",
        props: { text: "BREAKING" },
        motion: "pop",
        style: {}
      };

    }

    if (intent === "question") {

      components.cta = {
        type: "cta",
        props: { text: "WHAT DO YOU THINK?" },
        motion: "slideUp",
        style: {}
      };

    }

    if (intent === "stat") {

      const number = extractNumber(beat.spoken);

      components.statCard = {
        type: "statCard",
        props: {
          label: "STAT",
          value: number || "100"
        },
        motion: "pop",
        style: {}
      };

    }

    if (intent === "list") {

      const items = splitList(beat.spoken);

      if (items.length > 1) {

        components.numberedList = {
          type: "numberedList",
          props: { items },
          motion: "slideUp",
          style: {}
        };

      }

    }

    if (intent === "quote" || detectQuote(beat.spoken)) {

      components.badge = {
        type: "badge",
        props: { text: "QUOTE" },
        motion: "fade",
        style: {}
      };

    }

    if (index % 3 === 0 && intent === "fact") {

      components.badge = {
        type: "badge",
        props: { text: "FACT" },
        motion: "pop",
        style: { top: "120px" }
      };

    }

    return {
      ...beat,
      components
    };

  });

}