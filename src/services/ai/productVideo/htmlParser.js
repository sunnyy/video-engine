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

function normalizeIconName(str) {
  if (!str) return null;
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to kebab
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

const CANVAS_W_DEFAULT = 1080;
const CANVAS_H_DEFAULT = 1920;

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
  if (!styleMatch) return { rules: {}, attrRules: [] };

  const css = styleMatch[1];
  const rules = {};
  const attrRules = [];

  const noKeyframes = css.replace(/@keyframes[\s\S]*?\{[\s\S]*?\}\s*\}/g, "");
  const noMedia     = noKeyframes.replace(/@media[\s\S]*?\{[\s\S]*?\}\s*\}/g, "");
  const noComments  = noMedia.replace(/\/\*[\s\S]*?\*\//g, "");

  const ruleRegex = /([^{@]+)\{([^}]+)\}/g;
  let match;
  while ((match = ruleRegex.exec(noComments)) !== null) {
    const selectorBlock = match[1].trim();
    const declarations  = parseDeclarations(match[2]);
    if (selectorBlock.includes("::") || selectorBlock.includes(":hover")) continue;

    for (const rawSel of selectorBlock.split(",")) {
      const sel = rawSel.trim();
      if (!sel) continue;
      if (sel.includes("[")) {
        // Attribute selector — parse tag, attribute conditions, optional :nth-of-type
        const tagMatch = sel.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
        const tag = tagMatch ? tagMatch[1].toLowerCase() : null;
        const attrs = {};
        const attrPattern = /\[([^\]=\]]+)(?:=["']?([^\]"']*)["']?)?\]/g;
        let am;
        while ((am = attrPattern.exec(sel)) !== null) {
          if (am[2] !== undefined) attrs[am[1].trim()] = am[2];
        }
        const nthMatch = sel.match(/:nth-of-type\((\d+)\)/);
        const nthType  = nthMatch ? parseInt(nthMatch[1]) : null;
        if (Object.keys(attrs).length > 0) attrRules.push({ tag, attrs, nthType, declarations });
      } else if (!sel.includes(":nth")) {
        if (!rules[sel]) rules[sel] = {};
        Object.assign(rules[sel], declarations);
      }
    }
  }

  return { rules, attrRules };
}

/**
 * Compute effective styles for an element by merging:
 *   tag rules < class rules < id rules < inline styles
 * This approximates browser CSS cascade (ignoring specificity details).
 */
function resolveElementStyles(el, cssRules, attrRules = [], nthIndex = 0) {
  const merged = {};

  const tag = el.tagName?.toLowerCase() ?? "";
  if (tag && cssRules[tag]) Object.assign(merged, cssRules[tag]);

  const classes = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean);
  for (const cls of classes) {
    if (cssRules[`.${cls}`]) Object.assign(merged, cssRules[`.${cls}`]);
    if (tag && cssRules[`${tag}.${cls}`]) Object.assign(merged, cssRules[`${tag}.${cls}`]);
  }

  const id = el.getAttribute("id");
  if (id && cssRules[`#${id}`]) Object.assign(merged, cssRules[`#${id}`]);

  // Apply attribute selector rules (e.g. div[data-role="headline"], :nth-of-type)
  for (const rule of attrRules) {
    if (rule.tag && rule.tag !== tag) continue;
    let allMatch = true;
    for (const [attr, val] of Object.entries(rule.attrs)) {
      if (el.getAttribute(attr) !== val) { allMatch = false; break; }
    }
    if (!allMatch) continue;
    if (rule.nthType !== null && rule.nthType !== nthIndex) continue;
    Object.assign(merged, rule.declarations);
  }

  const inlineStyle = parseDeclarations(el.getAttribute("style") || "");
  Object.assign(merged, inlineStyle);

  return merged;
}

// ── Transform resolution ──────────────────────────────────────────────────────

// Lines to reserve for `height:auto` text elements, keyed by role.
// Single-line roles get 1.3; multi-line roles get more.
const AUTO_HEIGHT_LINES = {
  "stat-number": 1.3,
  kicker:        1.3,
  label:         1.3,
  badge:         1.5,
  divider:       1.2,
  icon:          1.5,
  headline:      2.5,
  subhead:       3.0,
  body:          4.0,
  step:          2.0,
};

function resolveTransform(style, layerType = "gradient", role = "", canvasW = CANVAS_W_DEFAULT, canvasH = CANVAS_H_DEFAULT) {
  const left   = cssNum(style["left"]);
  const top    = cssNum(style["top"]);
  const right  = cssNum(style["right"]);
  const bottom = cssNum(style["bottom"]);
  const width  = cssNum(style["width"]) ?? canvasW;

  const rawHeight = style["height"];
  let height;
  if (rawHeight && rawHeight !== "auto") height = cssNum(rawHeight) ?? null;
  if (height == null) {
    if (layerType === "text") {
      const fontSize      = cssNum(style["font-size"])   ?? 48;
      const rawLineHeight = cssNum(style["line-height"]) ?? 1.3;
      const lineHeight    = rawLineHeight > 4 ? rawLineHeight / fontSize : rawLineHeight;
      const lines         = AUTO_HEIGHT_LINES[role] ?? 2.0;
      height = Math.round(fontSize * lineHeight * lines);
    } else {
      height = width; // square fallback for non-text (circles etc.)
    }
  }

  let x = 0, y = 0;
  if (left != null)        x = left;
  else if (right != null)  x = canvasW - right - width;
  if (top != null)         y = top;
  else if (bottom != null) y = canvasH - bottom - height;

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
    logo:               "track_logo",
    "image-placeholder": "track_overlay",
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
 * parseSceneHTML(htmlString, sceneIndex, canvas)
 */
export function parseSceneHTML(htmlString, sceneIndex, canvas = { width: CANVAS_W_DEFAULT, height: CANVAS_H_DEFAULT }) {
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  if (!htmlString) return [];

  console.log(`[htmlParser] scene ${sceneIndex} — html length: ${htmlString.length}`);

  const { rules: cssRules, attrRules } = parseStyleBlock(htmlString);
  console.log(`[htmlParser] scene ${sceneIndex} — CSS rules parsed: ${Object.keys(cssRules).length} selectors`);

  const root     = parse(htmlString, { comment: false });

  // Pre-compute nth-of-type index (1-based) for each div in body order
  const bodyNode = root.querySelector("body") || root;
  const allDivs  = Array.from(bodyNode.querySelectorAll("div"));
  const nthMap   = new Map();
  let nthCounter = 1;
  for (const div of allDivs) nthMap.set(div, nthCounter++);

  const elements = root.querySelectorAll("[data-role]");

  console.log(`[htmlParser] scene ${sceneIndex} — found ${elements.length} elements with data-role`);

  let graph     = [];
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

    const style = resolveElementStyles(el, cssRules, attrRules, nthMap.get(el) ?? 0);

    // All elements use canvas-absolute coordinates — no parent offset needed.
    const rawText = el.text?.trim() ?? "";
    const hasDataRoleChildren = !!el.querySelector("[data-role]");
    let type = layerToType(layer, role);
    if (type === "gradient" && rawText && !hasDataRoleChildren) type = "text";

    const trackId = roleToTrackId(role);
    let { x, y, width, height } = resolveTransform(style, type, role, canvasW, canvasH);

    // Clamp to canvas bounds — allow slight bleed for intentional off-edge glow/crop effects
    x      = Math.max(-200, Math.min(x,      canvasW));
    y      = Math.max(-200, Math.min(y,      canvasH));
    width  = Math.min(width,  canvasW + 200);
    height = Math.min(height, canvasH + 200);

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
      entry.text = rawText
        .replace(/\n[ \t]+/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .trim();
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
        lineHeight:    (() => { const r = cssNum(style["line-height"]) ?? 1.2; const fs = cssNum(style["font-size"]) ?? 48; return r > 4 ? r / fs : r; })(),
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
      if (role === "image-placeholder") {
        entry.src       = null;
        entry.assetType = el.getAttribute("data-asset-type") || "stock";
        entry.assetHint = el.getAttribute("data-asset-hint") || null;
        entry.objectFit = "cover";
      } else {
        // For <img> elements (e.g. data-role="logo"), extract the src attribute directly.
        const imgSrc = el.tagName?.toLowerCase() === "img" ? (el.getAttribute("src") || null) : null;
        entry.src       = imgSrc;
        entry.objectFit = style["object-fit"] ?? "contain";
      }
    }

    // Icon layer — normalize data-icon to PascalCase Lucide name
    const dataIcon = el.getAttribute('data-icon');
    const iconName = normalizeIconName(dataIcon);
    if (iconName) {
      entry.type = 'icon';
      entry.iconName = iconName;
      entry.style = entry.style ?? {};
      entry.style.color = entry.style.color ?? '#ffffff';
    }

    // Fix 1 — skip image layers with no src (except placeholders — they get resolved later)
    if (entry.type === "image" && !entry.src && role !== "image-placeholder") continue;

    // Fix 2 — cap text element width based on x position
    if (entry.type === "text") {
      const maxWidth = Math.max(100, (canvasW - entry.x - 90));
      if (entry.width > maxWidth) entry.width = maxWidth;
    }

    // Recalculate text height from content metrics — never trust GPT's hardcoded height
    if (entry.type === "text" && entry.text) {
      const fontSize     = entry.style.fontSize || 16;
      const lh           = entry.style.lineHeight || 1.2;
      const lineHeightPx = lh > 4 ? lh : lh * fontSize;
      const charsPerLine = Math.floor(entry.width / (fontSize * 0.55));
      const lines        = Math.ceil(entry.text.length / Math.max(1, charsPerLine));
      entry.height       = Math.ceil(lines * lineHeightPx) + 20;
    }

    // Fix 4 — skip elements whose text content is a GPT design note
    if (entry.type === "text" && entry.text) {
      const designNotePatterns = [
        /a hook scene built to/i,
        /because that's the problem/i,
        /designed to feel/i,
        /this scene/i,
        /visual metaphor for/i,
        /radiant visual metaphor/i,
        /cluttered editing stack/i,
        /radiant.*metaphor/i,
        /visual.*metaphor/i,
        /frustration of work/i,
        /slipping time/i,
      ];
      if (designNotePatterns.some(p => p.test(entry.text))) continue;
    }

    graph.push(entry);
  }

  // Fix 3 — limit glow layers to 4 per scene
  const glowLayers = graph.filter(e => e.role === "glow");
  if (glowLayers.length > 4) {
    const glowIds = new Set(glowLayers.slice(4).map(e => e.id));
    graph = graph.filter(e => !glowIds.has(e.id));
  }

  // Fix 4 — deduplicate elements at exact same x/y position, keep highest zIndex
  const positionMap = new Map();
  for (const entry of graph) {
    const key = `${entry.x},${entry.y}`;
    if (positionMap.has(key)) {
      const existing = positionMap.get(key);
      if (entry.zIndex > existing.zIndex) positionMap.set(key, entry);
    } else {
      positionMap.set(key, entry);
    }
  }
  graph = Array.from(positionMap.values());

  // If the explicit background element is near-transparent (GPT used low-opacity gradient
  // instead of a solid color), strip it so the body-CSS fallback can take over.
  const bgEl = graph.find(e => e.role === "background");
  if (bgEl) {
    const bg = bgEl.background ?? "";
    // Detect near-transparent backgrounds: rgba with alpha < 0.4, or hex with alpha suffix < 66
    const isTransparent = /rgba\(\s*[\d,.\s]+,\s*0(\.[0-3]\d*)?\s*\)/.test(bg)
      || /^radial-gradient|^linear-gradient/.test(bg) && !bg.match(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])\b/);
    if (isTransparent) graph.splice(graph.indexOf(bgEl), 1);
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
        x: 0, y: 0, width: canvasW, height: canvasH,
        rotation: 0, zIndex: 0, opacity: 1,
        borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
        filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
        background: bg, text: null, style: {},
      });
    }
  }

  // Vertical reflow — push text elements down if they overlap elements above them.
  // GPT often positions elements using estimated headline heights that are too small.
  // After height recalculation above, this pass corrects downstream y values.
  const textEls = graph
    .filter(e => e.type === "text")
    .sort((a, b) => a.y - b.y);

  for (let i = 1; i < textEls.length; i++) {
    const prev = textEls[i - 1];
    const curr = textEls[i];
    // Only reflow elements that share horizontal space — leave side-by-side columns alone
    const hOverlap = curr.x < prev.x + prev.width && curr.x + curr.width > prev.x;
    if (!hOverlap) continue;
    const minY = prev.y + prev.height + 40;
    if (curr.y < minY) curr.y = minY;
  }

  graph.sort((a, b) => a.zIndex - b.zIndex);
  return graph;
}
