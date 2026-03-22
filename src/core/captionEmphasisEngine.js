const EMPHASIS_WORDS = [
  "war",
  "conflict",
  "attack",
  "danger",
  "threat",
  "power",
  "crisis",
  "nuclear",
  "security",
  "breaking",
  "shocking",
  "warning"
];

export function applyCaptionEmphasis(beats) {

  return beats.map((beat) => {

    if (!beat.caption?.text) return beat;

    const words = beat.caption.text.split(" ");

    const styledWords = words.map((word) => {

      const clean = word.toLowerCase().replace(/[^\w]/g, "");

      if (EMPHASIS_WORDS.includes(clean)) {
        return `<em>${word}</em>`;
      }

      return word;

    });

    return {
      ...beat,
      caption: {
        ...beat.caption,
        text: styledWords.join(" ")
      }
    };

  });

}