/**
 * htmlParser.js
 * src/services/ai/promoVideo/v2/htmlParser.js
 *
 * Parses GPT-generated HTML scene frames into a scene graph array.
 * Reads both the <style> block (CSS classes) and inline styles,
 * merging them so that inline styles take priority — matching how
 * a browser would compute effective styles.
 */

import { parse } from "node-html-parser";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

// ── CSS helpers ───────────────────────────────────────────────────────────────

function cssNum(val) {
  if (val == null) return null;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

function parseDeclarations(block) {
  const obj = {};
  for (const decl of block.split(";")) {
    const colon = decl.indexOf(":");
    if (colon === -1) continue;
    const prop  = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (prop && value) obj[prop] = value;
  }
  return obj;
}

/**
 * Parse the <style> block into a flat map of selector → property object.
 * Handles: .class, #id, element, and simple comma-separated selectors.
 * Skips @keyframes, @media, pseudo-elements.
 */
function parseStyleBlock(htmlString) {
  const styleMatch = htmlString.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return {};

  const css = styleMatch[1];
  const rules = {};

  // Remove @keyframes blocks entirely (they confuse our rule parser)
  const noKeyframes = css.replace(/@keyframes[\s\S]*?\{[\s\S]*?\}\s*\}/g, "");
  // Remove @media blocks (we target 1080×1920 fixed canvas, no responsiveness)
  const noMedia = noKeyframes.replace(/@media[\s\S]*?\{[\s\S]*?\}\s*\}/g, "");
  // Remove CSS comments — without this, a comment before a class rule (e.g.
  // /* Glow effects */ \n .purple-glow { ... }) bleeds into the selector name,
  // so cssRules[".purple-glow"] is never set and class lookups silently return nothing.
  const noComments = noMedia.replace(/\/\*[\s\S]*?\*\//g, "");

  const ruleRegex = /([^{@]+)\{([^}]+)\}/g;
  let match;
  while ((match = ruleRegex.exec(noComments)) !== null) {
    const selectorBlock = match[1].trim();
    const declarations  = parseDeclarations(match[2]);

    // Skip pseudo-elements and pseudo-classes (::before, :hover, etc.)
    if (selectorBlock.includes("::") || selectorBlock.includes(":hover") || selectorBlock.includes(":nth")) continue;

    for (const rawSel of selectorBlock.split(",")) {
      const sel = rawSel.trim();
      if (!sel) continue;
      if (!rules[sel]) rules[sel] = {};
      Object.assign(rules[sel], declarations);
    }
  }

  return rules;
}

/**
 * Compute effective styles for an element by merging:
 *   tag rules < class rules < id rules < inline styles
 * This approximates browser CSS cascade (ignoring specificity details).
 */
function resolveElementStyles(el, cssRules) {
  const merged = {};

  // 1. Tag-level rules (e.g. "div", "p")
  const tag = el.tagName?.toLowerCase() ?? "";
  if (tag && cssRules[tag]) Object.assign(merged, cssRules[tag]);

  // 2. Class rules — applied in order
  const classes = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean);
  for (const cls of classes) {
    if (cssRules[`.${cls}`]) Object.assign(merged, cssRules[`.${cls}`]);
    // Also try tag.class combinations e.g. "div.headline"
    if (tag && cssRules[`${tag}.${cls}`]) Object.assign(merged, cssRules[`${tag}.${cls}`]);
  }

  // 3. ID rule
  const id = el.getAttribute("id");
  if (id && cssRules[`#${id}`]) Object.assign(merged, cssRules[`#${id}`]);

  // 4. Inline styles win
  const inlineStyle = parseDeclarations(el.getAttribute("style") || "");
  Object.assign(merged, inlineStyle);

  return merged;
}

// ── Transform resolution ──────────────────────────────────────────────────────

function resolveTransform(style, layerType = "gradient") {
  const left   = cssNum(style["left"]);
  const top    = cssNum(style["top"]);
  const right  = cssNum(style["right"]);
  const bottom = cssNum(style["bottom"]);
  const width  = cssNum(style["width"]) ?? CANVAS_W;

  const rawHeight = style["height"];
  let height;
  if (rawHeight && rawHeight !== "auto") height = cssNum(rawHeight) ?? null;
  if (height == null) {
    if (layerType === "text") {
      const fontSize   = cssNum(style["font-size"])   ?? 48;
      const lineHeight = cssNum(style["line-height"]) ?? 1.3;
      height = Math.round(fontSize * lineHeight * 4);
    } else {
      height = width; // square fallback for non-text (circles etc.)
    }
  }

  let x = 0, y = 0;
  if (left != null)        x = left;
  else if (right != null)  x = CANVAS_W - right - width;
  if (top != null)         y = top;
  else if (bottom != null) y = CANVAS_H - bottom - height;

  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

// ── Role/layer mappers ────────────────────────────────────────────────────────

function roleToTrackId(role) {
  const map = {
    headline:      "track_text",
    subhead:       "track_text",
    body:          "track_text",
    "stat-number": "track_text",
    background:    "track_background",
    glow:          "track_background",
    card:          "track_overlay",
    decoration:    "track_overlay",
    badge:         "track_badge",
    kicker:        "track_badge",
    label:         "track_badge",
    divider:       "track_accent",
    step:          "track_text",
    icon:          "track_icon",
  };
  return map[role] ?? "track_text";
}

function layerToType(layer, role) {
  if (layer === "text")       return "text";
  if (layer === "gradient")   return "gradient";
  if (layer === "effect")     return "gradient";
  if (layer === "image")      return "image";
  if (layer === "decoration") return "gradient";
  if (role === "background" || role === "glow" || role === "card") return "gradient";
  return "text";
}

// ── Border-radius helper ──────────────────────────────────────────────────────

function parseBorderRadius(val) {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.includes("%")) return 9999; // 50% → circle sentinel
  return cssNum(s) ?? 0;
}

// ── Border helper ─────────────────────────────────────────────────────────────

function parseBorder(style) {
  // Try explicit border-width / border-color first, then shorthand border
  const bw = cssNum(style["border-width"]) ?? null;
  const bc  = style["border-color"] ?? null;

  if (bw !== null) return { borderWidth: bw, borderColor: bc ?? "#ffffff" };

  const shorthand = style["border"] ?? "";
  if (!shorthand) return { borderWidth: 0, borderColor: "#ffffff" };

  const widthMatch = shorthand.match(/(\d+(?:\.\d+)?)\s*px/);
  const colorMatch  = shorthand.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/);

  return {
    borderWidth: widthMatch ? parseFloat(widthMatch[1]) : 0,
    borderColor: colorMatch ? colorMatch[0] : "#ffffff",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * parseSceneHTML(htmlString, sceneIndex)
 */
export function parseSceneHTML(htmlString, sceneIndex) {
  if (!htmlString) return [];

  console.log(`[htmlParser] scene ${sceneIndex} — html length: ${htmlString.length}`);

  // Parse the <style> block into a CSS rule map
  const cssRules = parseStyleBlock(htmlString);
  console.log(`[htmlParser] scene ${sceneIndex} — CSS rules parsed: ${Object.keys(cssRules).length} selectors`);

  const root     = parse(htmlString, { comment: false });
  const elements = root.querySelectorAll("[data-role]");

  console.log(`[htmlParser] scene ${sceneIndex} — found ${elements.length} elements with data-role`);

  const graph   = [];
  const usedIds = new Set();

  for (const el of elements) {
    const role         = el.getAttribute("data-role")          ?? "decoration";
    const layer        = el.getAttribute("data-layer")         ?? "gradient";
    const animation    = el.getAttribute("data-animation")     ?? "none";
    const sceneElement = el.getAttribute("data-scene-element") ?? "decoration";

    // Unique ID
    let baseId = `s${sceneIndex}_${role}`;
    let id     = baseId;
    let suffix = 0;
    while (usedIds.has(id)) { suffix++; id = `${baseId}_${suffix}`; }
    usedIds.add(id);

    // Merge CSS class styles + inline styles
    const style = resolveElementStyles(el, cssRules);

    // Nested [data-role] elements use parent-relative CSS coordinates.
    // Walk up and accumulate parent left/top so positions become canvas-absolute.
    let parentOffsetLeft = 0, parentOffsetTop = 0;
    let parentEl = el.parentNode;
    while (parentEl) {
      if (parentEl.getAttribute?.("data-role")) {
        const ps = resolveElementStyles(parentEl, cssRules);
        parentOffsetLeft += cssNum(ps["left"]) ?? 0;
        parentOffsetTop  += cssNum(ps["top"])  ?? 0;
      }
      parentEl = parentEl.parentNode;
    }
    const effectiveStyle = (parentOffsetLeft || parentOffsetTop)
      ? { ...style, left: `${(cssNum(style["left"]) ?? 0) + parentOffsetLeft}px`, top: `${(cssNum(style["top"]) ?? 0) + parentOffsetTop}px` }
      : style;

    // Gradient elements that contain visible text act as text layers
    // (background is preserved in style.background by the text branch below).
    // Exception: if the element has [data-role] children, those children are
    // parsed as their own layers — don't steal their text or the parent becomes
    // a duplicate text layer stacked on top of the child.
    const rawText = el.text?.trim() ?? "";
    const hasDataRoleChildren = !!el.querySelector("[data-role]");
    let type = layerToType(layer, role);
    if (type === "gradient" && rawText && !hasDataRoleChildren) type = "text";

    const trackId = roleToTrackId(role);
    const { x, y, width, height } = resolveTransform(effectiveStyle, type);

    const zIndex = cssNum(style["z-index"]) ?? (
      role === "background"                    ? 0  :
      role === "glow"                          ? 1  :
      role === "card" || role === "decoration" ? 3  :
      role === "badge" || role === "kicker"    ? 8  : 10
    );

    const opacity      = cssNum(style["opacity"]) ?? 1;
    const borderRadius = parseBorderRadius(style["border-radius"]);
    const { borderWidth, borderColor } = parseBorder(style);

    // Extract rotation from CSS transform property (e.g. "rotate(-7deg)")
    const cssTransform  = style["transform"] ?? "";
    const rotateMatch   = cssTransform.match(/rotate\((-?[\d.]+)deg\)/);
    const rotation      = rotateMatch ? parseFloat(rotateMatch[1]) : 0;

    const entry = {
      id, role, layer, animation, sceneElement,
      type, trackId,
      x, y, width, height,
      rotation,
      zIndex, opacity, borderRadius, borderWidth, borderColor,
      filter:         style["filter"]           || null,
      boxShadow:      style["box-shadow"]        || null,
      mixBlendMode:   style["mix-blend-mode"]    || null,
      backdropFilter: style["backdrop-filter"]   || null,
      background: null, text: null, style: {},
    };

    if (type === "text") {
      entry.text = rawText;
      // Badge/pill wrappers put text styling on a child <span>, not the container.
      // Inherit missing font properties from the first child span's inline style.
      const firstSpan = el.querySelector("span");
      const spanStyle = firstSpan ? parseDeclarations(firstSpan.getAttribute("style") || "") : {};
      const ts = (prop) => style[prop] ?? spanStyle[prop];
      entry.style = {
        fontFamily:    ((ts("font-family") ?? "Outfit").replace(/['"]/g, "").split(",")[0].trim()),
        fontSize:      cssNum(ts("font-size"))      ?? 48,
        fontWeight:    cssNum(ts("font-weight"))    ?? 700,
        color:         ts("color")                  ?? "#ffffff",
        letterSpacing: cssNum(ts("letter-spacing")) ?? 0,
        lineHeight:    cssNum(style["line-height"]) ?? 1.2,
        textAlign:     style["text-align"]          ?? "left",
        textTransform: style["text-transform"]      ?? "none",
        textShadow:    style["text-shadow"]         ?? null,
        background:    style["background"]          ?? null,
        borderRadius,
        padding:       style["padding"]             ?? 0,
      };
    } else if (type === "gradient") {
      entry.background = style["background"] ?? style["background-color"] ?? null;
    } else if (type === "image") {
      entry.src       = null;
      entry.objectFit = style["object-fit"] ?? "cover";
    }

    graph.push(entry);
  }

  // If no explicit data-role="background" element exists, synthesize one from
  // the body/html CSS background. AI often places the canvas BG on body {} only.
  const hasExplicitBg = graph.some(e => e.role === "background");
  if (!hasExplicitBg) {
    const bodyStyle  = cssRules["body"]           ?? {};
    const htmlBody   = cssRules["html, body"]     ?? cssRules["html,body"] ?? cssRules["html"] ?? {};
    const bg = bodyStyle["background"] ?? bodyStyle["background-color"]
             ?? htmlBody["background"] ?? htmlBody["background-color"] ?? null;
    if (bg && bg !== "transparent" && bg !== "none") {
      graph.unshift({
        id: `s${sceneIndex}_background`,
        role: "background", layer: "gradient", animation: "none", sceneElement: "background",
        type: "gradient", trackId: "track_background",
        x: 0, y: 0, width: CANVAS_W, height: CANVAS_H,
        rotation: 0, zIndex: 0, opacity: 1,
        borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
        filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
        background: bg, text: null, style: {},
      });
    }
  }

  graph.sort((a, b) => a.zIndex - b.zIndex);
  return graph;
}
