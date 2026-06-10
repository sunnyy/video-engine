import { parse } from "node-html-parser";

function normalizeIconName(str) {
  if (!str) return null;
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

const CANVAS_W_DEFAULT = 1080;
const CANVAS_H_DEFAULT = 1920;

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

function parseStyleBlock(htmlString) {
  const styleMatch = htmlString.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return { rules: {}, keyframesCss: "", attrRules: [] };

  const css = styleMatch[1];

  // Extract @keyframes blocks before stripping so they survive into the preview
  const kfBlocks = [];
  const kfRegex = /@keyframes\s+[\w-]+\s*\{(?:[^{}]|\{[^{}]*\})*\}/g;
  let km;
  while ((km = kfRegex.exec(css)) !== null) kfBlocks.push(km[0]);
  const keyframesCss = kfBlocks.join("\n");

  const noKeyframes = css.replace(/@keyframes[\s\S]*?\{[\s\S]*?\}\s*\}/g, "");
  const noMedia     = noKeyframes.replace(/@media[\s\S]*?\{[\s\S]*?\}\s*\}/g, "");
  const noComments  = noMedia.replace(/\/\*[\s\S]*?\*\//g, "");

  const rules = {};
  const attrRules = [];
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
        const nthType = nthMatch ? parseInt(nthMatch[1]) : null;
        if (Object.keys(attrs).length > 0) {
          attrRules.push({ tag, attrs, nthType, declarations });
        }
      } else if (!sel.includes(":nth")) {
        if (!rules[sel]) rules[sel] = {};
        Object.assign(rules[sel], declarations);
      }
    }
  }
  return { rules, keyframesCss, attrRules };
}

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

  // Apply attribute selector rules (e.g. div[data-role="subhead"], :nth-of-type)
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


// Approximate char-width ratio (em units) per font family (lowercase keys)
const CHAR_WIDTH_RATIO = {
  "anton":               0.62,
  "bebas neue":          0.52,
  "oswald":              0.54,
  "archivo black":       0.68,
  "poppins":             0.58,
  "inter":               0.58,
  "manrope":             0.58,
  "plus jakarta sans":   0.60,
  "playfair display":    0.58,
  "cormorant garamond":  0.52,
  "pacifico":            0.68,
  "outfit":              0.56,
};

function estimateTextHeight(text, styleObj) {
  const fontSize   = cssNum(styleObj["font-size"])   ?? 48;
  const rawLH      = cssNum(styleObj["line-height"]) ?? 1.2;
  const lineHeight = rawLH > 4 ? rawLH / fontSize : rawLH;
  const elWidth    = cssNum(styleObj["width"]);

  const family = (styleObj["font-family"] ?? "").replace(/['"]/g, "").split(",")[0].trim().toLowerCase();
  const ratio  = CHAR_WIDTH_RATIO[family] ?? 0.58;
  const textW  = (text?.length ?? 1) * fontSize * ratio;

  const lines = elWidth > 0 ? Math.max(1, Math.ceil(textW / elWidth)) : 1;
  return Math.round(lines * fontSize * lineHeight * 1.15); // 1.15 adds a small safety margin
}

function resolvePercent(val, base) {
  if (val == null) return null;
  const s = String(val).trim();
  if (s.endsWith("%")) return (parseFloat(s) / 100) * base;
  return cssNum(s);
}

function resolveTransform(style, layerType = "gradient", role = "", canvasW = CANVAS_W_DEFAULT, canvasH = CANVAS_H_DEFAULT) {
  const leftStr   = style["left"];
  const topStr    = style["top"];
  const rightStr  = style["right"];
  const bottomStr = style["bottom"];

  let left   = resolvePercent(leftStr,   canvasW);
  let top    = resolvePercent(topStr,    canvasH);
  let right  = resolvePercent(rightStr,  canvasW);
  let bottom = resolvePercent(bottomStr, canvasH);

  // Handle translateX(-50%) / translateY(-50%) centering offsets
  const cssTransformStr = style["transform"] ?? "";
  const txMatch = cssTransformStr.match(/translateX\(\s*(-?[\d.]+)%\s*\)/);
  const tyMatch = cssTransformStr.match(/translateY\(\s*(-?[\d.]+)%\s*\)/);

  const explicitWidth  = cssNum(style["width"]);
  const explicitHeight = (style["height"] && style["height"] !== "auto") ? cssNum(style["height"]) : null;

  // For non-text elements, fall back to canvas size if not specified
  const width  = explicitWidth  ?? (layerType !== "text" ? canvasW : 0);
  const height = explicitHeight ?? (layerType !== "text" ? (explicitWidth ?? canvasW) : 0);

  let x = 0, y = 0;
  if (left != null)        x = left;
  else if (right != null)  x = canvasW - right - (explicitWidth ?? 0);
  if (top != null)         y = top;
  else if (bottom != null) y = canvasH - bottom - (explicitHeight ?? 0);

  // Apply translate offsets (e.g. translateX(-50%) shifts by -50% of element width)
  if (txMatch) x += (parseFloat(txMatch[1]) / 100) * (explicitWidth ?? 0);
  if (tyMatch) y += (parseFloat(tyMatch[1]) / 100) * (explicitHeight ?? 0);

  return {
    x: Math.round(x), y: Math.round(y),
    width:      Math.round(width),
    height:     Math.round(height),
    autoWidth:  explicitWidth  == null,
    autoHeight: explicitHeight == null && layerType !== "text", // text height estimated separately
  };
}

function roleToTrackId(role) {
  const map = {
    headline:   "track_text",
    subhead:    "track_text",
    kicker:     "track_badge",
    label:      "track_badge",
    badge:      "track_badge",
    stat:       "track_text",
    cta:        "track_text",
    background: "track_background",
    glow:       "track_background",
    divider:    "track_overlay",
    decoration: "track_overlay",
    icon:       "track_icon",
  };
  return map[role] ?? "track_text";
}

// Non-text gradient roles — anything that isn't voiced text
const GRADIENT_ROLES = new Set(["background", "glow", "divider", "badge", "decoration", "overlay"]);

function layerToType(layer, role) {
  if (layer === "text")       return "text";
  if (layer === "gradient")   return "gradient";
  if (layer === "effect")     return "gradient";
  if (layer === "decoration") return "gradient";
  if (GRADIENT_ROLES.has(role)) return "gradient";
  return "text";
}

function parseBorderRadius(val) {
  if (!val) return 0;
  const s = String(val).trim();
  if (s.includes("%")) return 9999;
  return cssNum(s) ?? 0;
}

function parseBorder(style) {
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

function parseKfAttr(attrVal) {
  if (!attrVal) return [];
  const pairs = [];
  for (const pair of attrVal.split(",")) {
    const parts = pair.trim().split(":");
    if (parts.length < 2) continue;
    const t = parseFloat(parts[0]);
    const v = parseFloat(parts[1]);
    if (!isNaN(t) && !isNaN(v)) pairs.push({ time: t, value: v });
  }
  return pairs;
}

export function parseTypographySceneHTML(htmlString, sceneIndex, canvas = { width: CANVAS_W_DEFAULT, height: CANVAS_H_DEFAULT }) {
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  if (!htmlString) return { graph: [], keyframesCss: "" };

  console.log(`[typo/htmlParser] scene ${sceneIndex} — html length: ${htmlString.length}`);

  const { rules: cssRules, keyframesCss, attrRules } = parseStyleBlock(htmlString);
  const root     = parse(htmlString, { comment: false });

  // Pre-compute nth-of-type index for each div (1-based, among body-level divs in DOM order).
  // Required to resolve CSS rules like div[data-role="headline"]:nth-of-type(3).
  const bodyNode  = root.querySelector("body") || root;
  const allDivs   = Array.from(bodyNode.querySelectorAll("div"));
  const nthMap    = new Map();
  let nthCounter  = 1;
  for (const div of allDivs) nthMap.set(div, nthCounter++);

  const elements = root.querySelectorAll("[data-role]");

  console.log(`[typo/htmlParser] scene ${sceneIndex} — ${elements.length} elements with data-role`);

  let graph     = [];
  const usedIds = new Set();

  for (const el of elements) {
    const role         = el.getAttribute("data-role")          ?? "decoration";
    const layer        = el.getAttribute("data-layer")         ?? "gradient";
    const sceneElement = el.getAttribute("data-scene-element") ?? "decoration";
    const textAnimation = el.getAttribute("data-text-animation") ?? "none";

    // Parse data-kf-* keyframe attributes (layer-relative times)
    const designKeyframes = {
      opacity: parseKfAttr(el.getAttribute("data-kf-opacity")),
      scale:   parseKfAttr(el.getAttribute("data-kf-scale")),
      y:       parseKfAttr(el.getAttribute("data-kf-y")),
      x:       parseKfAttr(el.getAttribute("data-kf-x")),
    };
    const hasDesignKeyframes = Object.values(designKeyframes).some(arr => arr.length > 0);

    // Backward compat: read old data-animation/data-enter for animation type fallback
    const animation = el.getAttribute("data-enter") ?? el.getAttribute("data-animation") ?? "none";

    // Skip any stray cluster wrapper divs (old prompt format)
    if (role === "cluster") continue;

    let baseId = `s${sceneIndex}_${role}`;
    let id     = baseId;
    let suffix = 0;
    while (usedIds.has(id)) { suffix++; id = `${baseId}_${suffix}`; }
    usedIds.add(id);

    const style = resolveElementStyles(el, cssRules, attrRules, nthMap.get(el) ?? 0);

    // CSS animations are handled by the React timeline keyframe system, not by HTML/CSS.
    // Ignore any animation properties GPT may have included.

    const rawText = el.text?.trim() ?? "";
    const hasDataRoleChildren = !!el.querySelector("[data-role]");
    let type = layerToType(layer, role);
    if (type === "gradient" && rawText && !hasDataRoleChildren) type = "text";

    const trackId = roleToTrackId(role);
    let { x, y, width, height, autoWidth, autoHeight } = resolveTransform(style, type, role, canvasW, canvasH);

    x      = Math.max(-200, Math.min(x,      canvasW));
    y      = Math.max(-200, Math.min(y,      canvasH));
    width  = Math.min(width,  canvasW + 200);
    height = Math.min(height, canvasH + 200);

    const zIndex = cssNum(style["z-index"]) ?? (
      role === "background"  ? 0 :
      role === "glow"        ? 1 :
      role === "decoration"  ? 2 :
      role === "divider"     ? 5 :
      role === "kicker"      ? 6 :
      role === "label"       ? 6 :
      role === "badge"       ? 7 : 10
    );

    const opacity = cssNum(style["opacity"]) ?? 1;
    const borderRadius = parseBorderRadius(style["border-radius"]);
    const { borderWidth, borderColor } = parseBorder(style);

    const cssTransform = style["transform"] ?? "";
    const rotateMatch  = cssTransform.match(/rotate\((-?[\d.]+)deg\)/);
    const rotation     = rotateMatch ? parseFloat(rotateMatch[1]) : 0;

    const entry = {
      id, role, layer,
      animation,        // backward compat fallback animation type
      textAnimation,    // new: text effect (word-by-word, typewriter, fade-words, none)
      designKeyframes:  hasDesignKeyframes ? designKeyframes : null,
      cssAnimation: null,
      sceneElement,
      type, trackId,
      x, y, width, height,
      rotation,
      zIndex, opacity, borderRadius, borderWidth, borderColor,
      filter:         style["filter"]          || null,
      boxShadow:      style["box-shadow"]       || null,
      mixBlendMode:   style["mix-blend-mode"]   || null,
      backdropFilter: style["backdrop-filter"]  || null,
      background: null, text: null, style: {},
    };

    if (type === "text") {
      entry.text = rawText.replace(/\n[ \t]+/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
      const firstSpan = el.querySelector("span");
      const spanStyle = firstSpan ? parseDeclarations(firstSpan.getAttribute("style") || "") : {};
      const ts = (prop) => style[prop] ?? spanStyle[prop];
      entry.style = {
        fontFamily:    ((ts("font-family") ?? "Bebas Neue").replace(/['"]/g, "").split(",")[0].trim()),
        fontSize:      cssNum(ts("font-size"))      ?? 48,
        fontWeight:    cssNum(ts("font-weight"))    ?? 700,
        fontStyle:     ts("font-style")             ?? "normal",
        color:         ts("color")                  ?? "#ffffff",
        letterSpacing: cssNum(ts("letter-spacing")) ?? 0,
        lineHeight:    (() => { const r = cssNum(style["line-height"]) ?? 1.2; const fs = cssNum(style["font-size"]) ?? 48; return r > 4 ? r / fs : r; })(),
        textAlign:     style["text-align"]          ?? "left",
        textTransform: style["text-transform"]      ?? "none",
        textShadow:      style["text-shadow"]           ?? null,
        textDecoration:  style["text-decoration"]      ?? null,
        textDecorationColor: style["text-decoration-color"] ?? null,
        background:    style["background"]          ?? null,
        borderRadius,
        padding:       style["padding"]             ?? 0,
        autoWidth:     autoWidth  ? true : undefined,
        autoHeight:    autoHeight ? true : undefined,
      };

    } else if (type === "gradient") {
      entry.background = style["background"] ?? style["background-color"] ?? null;
    }

    const dataIcon = el.getAttribute("data-icon");
    const iconName = normalizeIconName(dataIcon);
    if (iconName) {
      entry.type     = "icon";
      entry.iconName = iconName;
      entry.style    = entry.style ?? {};
      entry.style.color = entry.style.color ?? "#ffffff";
    }

    // Cap text width; estimate height so selection handles are a proper box
    if (entry.type === "text") {
      const maxWidth = Math.max(100, canvasW - entry.x - 60);
      if (entry.width > maxWidth) entry.width = maxWidth;

      if (entry.height === 0 && entry.text) {
        entry.height = estimateTextHeight(entry.text, style);
        if (entry.style) {
          entry.style.autoHeight = undefined; // no longer needed — we have a real estimate
        }
      }
    }

    graph.push(entry);
  }

  // Keep all gradient elements — background, glow, divider, badge, decoration, etc.
  // The only gradient we drop is a completely transparent/empty one that adds nothing.
  graph = graph.filter(e => {
    if (e.type !== "gradient") return true;
    const bg = (e.background ?? "").trim().toLowerCase();
    const hasBorder = (e.borderWidth ?? 0) > 0;
    if (!hasBorder && (bg === "transparent" || bg === "none" || bg === "")) return false;
    return true;
  });

  // Enforce exactly one background element
  let bgSeen = false;
  graph = graph.filter(e => {
    if (e.role === "background") {
      if (bgSeen) return false;
      bgSeen = true;
    }
    return true;
  });

  // Deduplicate elements at exact same x/y position
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

  // Background element detection + fallback
  const bgEl = graph.find(e => e.role === "background");
  if (bgEl) {
    const bg = bgEl.background ?? "";
    const isTransparent = /rgba\(\s*[\d,.\s]+,\s*0(\.[0-3]\d*)?\s*\)/.test(bg)
      || (/^radial-gradient|^linear-gradient/.test(bg) && !bg.match(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])\b/));
    if (isTransparent) graph.splice(graph.indexOf(bgEl), 1);
  }

  const hasExplicitBg = graph.some(e => e.role === "background");
  if (!hasExplicitBg) {
    const bodyStyle = cssRules["body"]      ?? {};
    const htmlBody  = cssRules["html, body"] ?? cssRules["html,body"] ?? cssRules["html"] ?? {};
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

  // Post-parse overlap push-down: sort text elements by y, then push any element
  // down if it overlaps the previous one. Prevents GPT height-estimation mistakes.
  const textEls = graph
    .filter(e => e.type === "text" && e.role !== "background")
    .sort((a, b) => a.y - b.y);

  for (let i = 1; i < textEls.length; i++) {
    const prev    = textEls[i - 1];
    const cur     = textEls[i];
    const prevBot = prev.y + prev.height;
    if (cur.y < prevBot + 20) {
      const shift = (prevBot + 20) - cur.y;
      cur.y += shift;
      // Also shift any y-keyframes by the same amount so animation stays relative
      if (cur.designKeyframes?.y?.length) {
        cur.designKeyframes = {
          ...cur.designKeyframes,
          y: cur.designKeyframes.y.map(kf => ({ ...kf, value: kf.value + shift })),
        };
      }
    }
  }

  graph.sort((a, b) => a.zIndex - b.zIndex);
  return { graph, keyframesCss };
}
