export function classifyBeatIntent(text = "") {
  const t = text.toLowerCase();

  if (t.includes("?")) return "question";
  if (t.includes("did you know") || t.includes("breaking")) return "hook";
  if (t.includes("number") || t.includes("top")) return "list";
  if (t.includes("quote") || t.includes("said")) return "quote";
  if (t.includes("%") || t.includes("percent") || t.includes("data")) return "stat";

  return "fact";
}