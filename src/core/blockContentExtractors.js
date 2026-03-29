export function extractStatContent(text = "") {

  const numberMatch = text.match(/(\d+[.,]?\d*\s?%?)/);

  if (!numberMatch) {
    return {
      value: text,
      label: ""
    };
  }

  const value = numberMatch[0];

  const cleaned = text
    .replace(value, "")
    .replace(/has|have|is|are|was|were/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    value,
    label: cleaned
  };

}

export function extractListContent(text = "") {

  const parts = text
    .split(/,| and /i)
    .map(p => p.trim())
    .filter(Boolean);

  return {
    items: parts
  };

}

export function extractComparisonContent(text = "") {

  const parts = text.split(/vs|versus|compared to/i);

  return {
    left: parts[0]?.trim() || "",
    right: parts[1]?.trim() || ""
  };

}

export function extractQuoteContent(text = "") {

  return {
    text
  };

}

export function extractHookContent(text = "") {

  return {
    text
  };

}

export function extractBlockProps(type, text) {

  if (type === "Stat") {
    return extractStatContent(text);
  }

  if (type === "ListReveal") {
    return extractListContent(text);
  }

  if (type === "Comparison") {
    return extractComparisonContent(text);
  }

  if (type === "Quote") {
    return extractQuoteContent(text);
  }

  if (type === "Hook") {
    return extractHookContent(text);
  }

  return { text };

}