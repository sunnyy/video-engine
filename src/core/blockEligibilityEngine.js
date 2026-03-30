import blockRegistry from "./blockRegistry";
import { layoutCapabilityRegistry } from "./layoutCapabilityRegistry";

function detectCandidateBlocks(intent, spoken = "") {

  const text = (spoken || "").toLowerCase();
  const candidates = [];

  if (intent === "hook") candidates.push("HookImpact");

  if (
    intent === "stat" ||
    text.includes("%") ||
    text.match(/\d+/)
  ) {
    candidates.push("StatExplosion","ProgressBars");
  }

  if (
    intent === "list" ||
    text.includes("first") ||
    text.includes("second") ||
    text.includes("third") ||
    text.includes("top")
  ) {
    candidates.push("ListCountdown","ProcessSteps");
  }

  if (
    intent === "comparison" ||
    text.includes("vs") ||
    text.includes("versus") ||
    text.includes("compared")
  ) {
    candidates.push("MythVsFact","BeforeAfter","SplitScreen","ProblemSolution");
  }

  if (
    intent === "quote" ||
    text.includes('"') ||
    text.includes("said")
  ) {
    candidates.push("QuoteHighlight","Testimonial");
  }

  if (
    intent === "chapter" ||
    text.includes("chapter")
  ) {
    candidates.push("ChapterTitle");
  }

  return candidates;

}

export function resolveBlockForBeat({
  layout,
  intent,
  spoken = "",
  duration = 2
}) {

  const layoutCaps = layoutCapabilityRegistry[layout];
  if (!layoutCaps) return null;

  const allowedBlocks = layoutCaps.allowedBlocks || [];

  const candidates = detectCandidateBlocks(intent, spoken);

  const valid = candidates.filter((b) =>
    allowedBlocks.includes(b)
  );

  if (!valid.length) return null;

  const blockType = valid[0];

  const blockDef = blockRegistry[blockType];
  if (!blockDef) return null;

  if (duration < (blockDef.minDuration || 2)) return null;

  const zones = layoutCaps.zones;

  const zone = Object.keys(zones).find((z) =>
    zones[z].roles.includes("block")
  );

  if (!zone) return null;

  return {
    type: blockType,
    zone
  };

}