export function classifyBeatIntent(text = "") {

  const t = text.toLowerCase();

  if (t.includes("?")) return "question";

  if (
    t.includes("did you know") ||
    t.includes("breaking") ||
    t.includes("here are") ||
    t.includes("today we")
  ) {
    return "hook";
  }

  if (
    t.includes("top") ||
    t.includes("number") ||
    t.includes("first") ||
    t.includes("second") ||
    t.includes("third")
  ) {
    return "list";
  }

  if (
    t.includes("vs") ||
    t.includes("versus") ||
    t.includes("compare") ||
    t.includes("difference")
  ) {
    return "comparison";
  }

  if (
    t.includes("%") ||
    t.includes("percent") ||
    t.includes("data") ||
    t.includes("increase") ||
    t.includes("decrease")
  ) {
    return "stat";
  }

  if (
    t.includes("said") ||
    t.includes("quote") ||
    t.includes("once said")
  ) {
    return "quote";
  }

  if (
    t.includes("remember") ||
    t.includes("important") ||
    t.includes("note")
  ) {
    return "cta";
  }

  return "fact";
}