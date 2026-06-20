/**
 * htmlMeasure.js
 * src/services/ai/promoVideo/htmlMeasure.js
 *
 * EXPERIMENTAL alternative to htmlParser.js for the beat pipeline.
 *
 * Instead of computing element positions from CSS ourselves (which only works for
 * already-absolute elements and forces GPT to hand-place everything), this renders
 * the scene HTML in a headless browser and MEASURES the real laid-out result via
 * getBoundingClientRect() + getComputedStyle(). GPT can then write natural nested
 * HTML/CSS (flexbox, grid, flow, auto-sizing) and we flatten the measured output
 * into the same flat, absolutely-positioned layer entries the rest of the pipeline
 * already consumes.
 *
 * Gated behind a flag in the orchestrator; htmlParser.js remains the default.
 */

import puppeteer from "puppeteer";

const CANVAS_W_DEFAULT = 1080;
const CANVAS_H_DEFAULT = 1920;

// ── Role / layer mapping (mirrors htmlParser so output is a drop-in) ────────────

function roleToTrackId(role) {
  const map = {
    headline: "track_text", subhead: "track_text", body: "track_text",
    "stat-number": "track_text", step: "track_text",
    background: "track_background", glow: "track_background",
    card: "track_overlay", decoration: "track_overlay", "image-placeholder": "track_overlay",
    badge: "track_badge", kicker: "track_badge", label: "track_badge",
    divider: "track_accent", icon: "track_icon", logo: "track_logo",
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

// ── Headless browser (one shared instance, reused across scenes) ────────────────

let _browser = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  _browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
  return _browser;
}

export async function closeMeasureBrowser() {
  if (_browser) { try { await _browser.close(); } catch {} _browser = null; }
}

// The in-page collector. Runs inside the browser; returns plain serializable data
// for every element carrying a data-role, in DOM order.
function collectInPage(cw, ch) {
  const visibleBg = (cs) =>
    (cs.backgroundColor && !/rgba?\(0,\s*0,\s*0,\s*0\)|^transparent$/.test(cs.backgroundColor)) ||
    (cs.backgroundImage && cs.backgroundImage !== "none");
  const visibleBorder = (cs) => parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";

  // Capture every data-role element PLUS untagged elements that carry a visible
  // background or border (cards, chips, icon circles GPT didn't tag) — so we stop
  // dropping real visuals. Pure layout wrappers (no visual of their own) are skipped.
  const TEXT_ROLES = new Set(["headline", "subhead", "body", "kicker", "label", "stat-number", "badge", "quote"]);
  const els = [];
  for (const el of document.querySelectorAll("body *")) {
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "BR") continue;
    if (el.hasAttribute("data-role")) { els.push(el); continue; }
    // Skip inline styling inside a text element (highlighted words / accent spans):
    // they're PART of the text, not separate layers — capturing them shatters the headline.
    const roleAnc = el.closest("[data-role]");
    if (roleAnc && TEXT_ROLES.has(roleAnc.getAttribute("data-role"))) continue;
    if (visibleBg(getComputedStyle(el)) || visibleBorder(getComputedStyle(el))) els.push(el);
  }

  const out = [];
  for (const el of els) {
    const r  = el.getBoundingClientRect();
    if (r.width <= 0 && r.height <= 0) continue;
    const cs = getComputedStyle(el);

    // rotation from the computed transform matrix
    let rotation = 0;
    const tr = cs.transform;
    if (tr && tr !== "none" && tr.startsWith("matrix")) {
      const m = tr.match(/matrix\(([^)]+)\)/);
      if (m) { const p = m[1].split(",").map(parseFloat); rotation = Math.round(Math.atan2(p[1], p[0]) * 180 / Math.PI); }
    }

    const bgImage = cs.backgroundImage && cs.backgroundImage !== "none" ? cs.backgroundImage : null;
    const bgColor = cs.backgroundColor && !/rgba?\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) ? cs.backgroundColor : null;

    // border-radius: computed value can come back as a % string (e.g. "50%") — resolve
    // it to px against the element box, or pills/rounded panels render nearly square.
    const brStr = cs.borderTopLeftRadius || "0px";
    const borderRadiusPx = brStr.indexOf("%") >= 0
      ? Math.round((parseFloat(brStr) / 100) * Math.min(r.width, r.height))
      : (parseFloat(brStr) || 0);

    const fullCanvas = r.width >= cw * 0.9 && r.height >= ch * 0.9;
    out.push({
      role:         el.getAttribute("data-role")          || (fullCanvas ? "background" : "decoration"),
      layer:        el.getAttribute("data-layer")         || "gradient",
      animation:    el.getAttribute("data-animation")     || "none",
      sceneElement: el.getAttribute("data-scene-element") || "decoration",
      dataIcon:     el.getAttribute("data-icon")          || null,
      assetType:    el.getAttribute("data-asset-type")    || null,
      assetHint:    el.getAttribute("data-asset-hint")    || null,
      isImg:        el.tagName.toLowerCase() === "img",
      imgSrc:       el.getAttribute("src") || null,
      hasRoleChildren: !!el.querySelector("[data-role]"),
      // Element has a running CSS @keyframes animation (flicker/pulse/etc). We can't
      // replay arbitrary keyframes, but we flag it so the timeline can give it a
      // tasteful looping "ambient life" pulse instead of rendering dead-static.
      hasAnim:      !!(cs.animationName && cs.animationName !== "none"),
      // Motion intent (AI Video engine). The designer names a motion from the locked
      // vocabulary; we only CAPTURE the strings here — the expander interprets/validates
      // them later, so this stays decoupled. The promo pipeline ignores these fields.
      enterType:      el.getAttribute("data-enter")     || null,
      exitType:       el.getAttribute("data-exit")      || null,
      emphasisType:   el.getAttribute("data-emphasis")  || null,
      enterDir:       el.getAttribute("data-enter-dir") || el.getAttribute("data-dir") || null,
      exitDir:        el.getAttribute("data-exit-dir")  || el.getAttribute("data-dir") || null,
      motionIntensity: el.getAttribute("data-intensity") || null,
      text:         (el.innerText || "").trim(),
      rect:         { x: r.x, y: r.y, width: r.width, height: r.height },
      offsetW:      el.offsetWidth,
      offsetH:      el.offsetHeight,
      rotation,
      css: {
        color:          cs.color,
        fontFamily:     cs.fontFamily,
        fontSize:       parseFloat(cs.fontSize) || 0,
        fontWeight:     parseInt(cs.fontWeight, 10) || 400,
        letterSpacing:  cs.letterSpacing === "normal" ? 0 : (parseFloat(cs.letterSpacing) || 0),
        lineHeightPx:   cs.lineHeight === "normal" ? null : (parseFloat(cs.lineHeight) || null),
        textAlign:      cs.textAlign,
        textTransform:  cs.textTransform,
        textShadow:     cs.textShadow === "none" ? null : cs.textShadow,
        backgroundClip: cs.webkitBackgroundClip || cs.backgroundClip || null,
        bgImage, bgColor,
        borderRadius:   borderRadiusPx,
        borderWidth:    parseFloat(cs.borderTopWidth) || 0,
        borderColor:    cs.borderTopColor,
        opacity:        parseFloat(cs.opacity),
        filter:         cs.filter === "none" ? null : cs.filter,
        boxShadow:      cs.boxShadow === "none" ? null : cs.boxShadow,
        mixBlendMode:   cs.mixBlendMode === "normal" ? null : cs.mixBlendMode,
        backdropFilter: (cs.backdropFilter && cs.backdropFilter !== "none") ? cs.backdropFilter : null,
        objectFit:      cs.objectFit,
        zIndex:         cs.zIndex === "auto" ? null : (parseInt(cs.zIndex, 10) || null),
      },
      bodyBg: null,
    });
  }

  // capture the body/html background so we can synthesize a backdrop if needed
  const bodyCs = getComputedStyle(document.body);
  const bbImg = bodyCs.backgroundImage && bodyCs.backgroundImage !== "none" ? bodyCs.backgroundImage : null;
  const bbCol = bodyCs.backgroundColor && !/rgba?\(0, 0, 0, 0\)|transparent/.test(bodyCs.backgroundColor) ? bodyCs.backgroundColor : null;
  return { nodes: out, bodyBg: bbImg || bbCol || null };
}

/**
 * measureSceneHTML(htmlString, sceneIndex, canvas)
 * Drop-in replacement for parseSceneHTML — returns the same flat layer-entry array.
 */
export async function measureSceneHTML(htmlString, sceneIndex, canvas = { width: CANVAS_W_DEFAULT, height: CANVAS_H_DEFAULT }) {
  const canvasW = canvas.width  ?? CANVAS_W_DEFAULT;
  const canvasH = canvas.height ?? CANVAS_H_DEFAULT;
  if (!htmlString) return [];

  const browser = await getBrowser();
  const page = await browser.newPage();
  let collected;
  try {
    await page.setViewport({ width: canvasW, height: canvasH, deviceScaleFactor: 1 });
    // Use domcontentloaded, NOT networkidle0. When several scenes are measured in
    // parallel against one shared browser, the Google-Fonts @import connections keep
    // the network from ever going idle within the timeout — so scenes failed
    // navigation and came back as blank gaps. We only need the DOM laid out + fonts
    // applied: load the DOM, then await document.fonts.ready behind a hard cap that
    // can never hang (a slow/blocked font CDN must not blank the scene).
    await page.setContent(htmlString, { waitUntil: "domcontentloaded", timeout: 15000 });
    // Flex/grid items default to min-width:auto, so a single long word (e.g.
    // "MEDITERRANEAN") forces its column to min-content width and BLOWS OUT the whole
    // layout — sibling columns (a side illustration/notepad) get pushed off-canvas and
    // culled, and headlines refuse to wrap. The standard remedy is min-width:0 on
    // flex/grid children; inject it so columns respect their fr ratios as intended.
    try { await page.addStyleTag({ content: "*{min-width:0!important;}" }); } catch {}
    try {
      await Promise.race([
        page.evaluate(() => document.fonts && document.fonts.ready),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    } catch {}
    collected = await page.evaluate(collectInPage, canvasW, canvasH);
  } finally {
    try { await page.close(); } catch {}
  }

  const { nodes, bodyBg } = collected;
  console.log(`[htmlMeasure] scene ${sceneIndex} — measured ${nodes.length} elements`);

  let graph = [];
  const usedIds = new Set();

  for (const n of nodes) {
    let baseId = `s${sceneIndex}_${n.role}`, id = baseId, suffix = 0;
    while (usedIds.has(id)) { suffix++; id = `${baseId}_${suffix}`; }
    usedIds.add(id);

    let type = layerToType(n.layer, n.role);
    // An element tagged data-layer="image" that is NOT a real image (no <img>, no
    // asset placeholder) is actually a styled box — a card — that GPT mislabeled.
    // Treat it by its visuals so it isn't dropped as an "empty image".
    if (type === "image" && !n.isImg && n.role !== "image-placeholder" && !n.assetType) {
      type = (n.css.bgImage || n.css.bgColor || n.css.borderWidth > 0) ? "gradient" : (n.text ? "text" : "gradient");
    }
    // User-asset (upload) placeholders are disabled until uploads ship. GPT keeps
    // tagging designed preview/UI panels as data-asset-type="asset", which would be
    // replaced by the MISSING-ASSET box and strip the panel's content. Render such
    // an element as its own designed box (or text) instead.
    if (n.assetType === "asset") {
      n.assetType = null;
      type = (n.css.bgImage || n.css.bgColor || n.css.borderWidth > 0) ? "gradient"
           : (n.text && !n.hasRoleChildren ? "text" : "gradient");
    }
    // text living directly in a gradient-typed element with no child roles
    if (type === "gradient" && n.text && !n.hasRoleChildren) type = "text";
    // A container (has data-role descendants) must NOT render text — its innerText
    // includes the children's text, which would double/overlap with the child layers.
    // Keep it only if it carries a real background; otherwise it's a layout wrapper.
    if (type === "text" && n.hasRoleChildren) {
      if (n.css.bgImage || n.css.bgColor) { type = "gradient"; }
      else { continue; }
    }

    // For rotated elements, getBoundingClientRect returns the (larger) rotated
    // bounding box. The renderer re-applies rotation around the element CENTER, so
    // store the UNROTATED size (offsetWidth/Height) centered on the measured box's
    // center — otherwise rotated elements are double-transformed (wrong pos + size).
    let x, y, width, height;
    if (n.rotation && n.offsetW && n.offsetH) {
      width  = Math.round(n.offsetW);
      height = Math.round(n.offsetH);
      x = Math.round(n.rect.x + n.rect.width  / 2 - width  / 2);
      y = Math.round(n.rect.y + n.rect.height / 2 - height / 2);
    } else {
      x = Math.round(n.rect.x);       y = Math.round(n.rect.y);
      width = Math.round(n.rect.width); height = Math.round(n.rect.height);
    }

    // Stacking: an explicit POSITIVE z-index is GPT's deliberate foreground — it must
    // sit ABOVE role-defaulted (auto-z) elements, or a static panel/card (role-default
    // z=3) paints over text that GPT intentionally positioned on top of it (z-index:2),
    // hiding the headline. So: explicit z>0 → high band (100+z); explicit z≤0 → keep low
    // (behind, as authored); auto (no z-index) → role default in the low band.
    const roleZ =
      n.role === "background"                       ? 0 :
      n.role === "glow"                            ? 1 :
      n.role === "card" || n.role === "decoration" ? 3 :
      n.role === "badge" || n.role === "kicker"    ? 8 : 10;
    const zIndex = n.css.zIndex == null ? roleZ
      : n.css.zIndex > 0 ? 100 + n.css.zIndex
      : n.css.zIndex;

    const entry = {
      id, role: n.role, layer: n.layer, animation: n.animation, sceneElement: n.sceneElement,
      type, trackId: roleToTrackId(n.role),
      x, y, width, height, rotation: n.rotation || 0,
      zIndex, opacity: isNaN(n.css.opacity) ? 1 : n.css.opacity,
      borderRadius: n.css.borderRadius, borderWidth: n.css.borderWidth, borderColor: n.css.borderColor,
      filter: n.css.filter, boxShadow: n.css.boxShadow, mixBlendMode: n.css.mixBlendMode, backdropFilter: n.css.backdropFilter,
      background: null, text: null, style: {},
    };

    if (type === "text") {
      // Collapse ALL whitespace (incl. newlines) to single spaces. innerText inserts
      // a newline between block/inline-block words, which would otherwise render as a
      // one-word-per-line tower. The text re-wraps naturally at the measured width.
      entry.text = n.text.replace(/\s+/g, " ").trim();

      // Gradient TEXT (background:gradient + background-clip:text + transparent fill)
      // must go in `color` so the renderer clips it to the glyphs. Otherwise the
      // gradient becomes a solid block behind invisible text.
      const isGradientText = /text/.test(n.css.backgroundClip || "") && !!n.css.bgImage;
      // Blur on text is never intended (it's inherited from a glow wrapper) — drop it.
      if (entry.filter && /blur/.test(entry.filter)) entry.filter = null;

      entry.style = {
        fontFamily:    (n.css.fontFamily || "Outfit").replace(/['"]/g, "").split(",")[0].trim(),
        fontSize:      n.css.fontSize || 48,
        fontWeight:    n.css.fontWeight || 700,
        color:         isGradientText ? n.css.bgImage : (n.css.color || "#ffffff"),
        letterSpacing: n.css.letterSpacing || 0,
        lineHeight:    n.css.lineHeightPx && n.css.fontSize ? n.css.lineHeightPx / n.css.fontSize : 1.2,
        // getComputedStyle returns "start"/"end" for default text — normalize to the
        // left/right/center the renderer + properties panel understand.
        textAlign:     ({ start: "left", end: "right" }[n.css.textAlign] || n.css.textAlign || "left"),
        textTransform: n.css.textTransform || "none",
        textShadow:    n.css.textShadow || null,
        background:    isGradientText ? null : (n.css.bgImage || n.css.bgColor || null),
        borderRadius:  n.css.borderRadius,
        padding:       0, // box already measured; padding baked into width/height
      };

      // A text layer that carries a background IS a pill / chip / button. Its label
      // was centered by the padded box (shrink-to-fit / inline-flex), NOT by
      // text-align — so computed alignment is "start". Since we bake the padding into
      // the width and zero it, a left-aligned label slides to the left edge and the
      // padding piles up on the right. Center it to restore the pill's symmetry.
      if (entry.style.background) entry.style.textAlign = "center";

      // Text-fit safety buffer. The headless measurement and the editor/Remotion
      // render can disagree by a few sub-pixels on text width (font hinting +
      // rounding). When the measured box is tight to a single line, that drift
      // makes the LAST word wrap — and because text uses auto-height, the now
      // two-line block grows and overlaps its neighbours. Widen the box by a
      // small, font-size-proportional amount so single-line text stays on one
      // line. Grow it according to alignment so the text doesn't visually shift.
      const wrapBuffer = Math.ceil((n.css.fontSize || 16) * 0.14) + 2;
      const ta = entry.style.textAlign;
      if (ta === "center") { entry.x -= Math.round(wrapBuffer / 2); entry.width += wrapBuffer; }
      else if (ta === "right" || ta === "end") { entry.x -= wrapBuffer; entry.width += wrapBuffer; }
      else { entry.width += wrapBuffer; }

      // Text-fit guard that PRESERVES the designer's composition. The headless
      // measure can size a box to its (narrower) measured text, so the longest word
      // breaks mid-way at the final render font ("OUTSIDE" -> "OUTSI DE"). Fix by
      // scaling the FONT down to fit the box AS-IS — keep the box's position/width so
      // left/right panel and column layouts survive (do NOT widen the box to full
      // canvas, which yanks panel text to the centre). Only when the box itself runs
      // past the canvas do we clamp its width + re-anchor it inside the frame.
      const FIT_PAD = Math.round(canvasW * 0.03);
      const maxTextW = canvasW - FIT_PAD * 2;
      if (entry.width > maxTextW) entry.width = maxTextW;
      const fsNow = entry.style.fontSize || 48;
      const longestWord = (entry.text || "").split(/\s+/).filter(Boolean)
        .reduce((a, w) => (w.length > a.length ? w : a), "");
      const wordNeed = Math.ceil(longestWord.length * fsNow * 0.6); // safe upper bound for display glyphs
      if (wordNeed > entry.width) {
        entry.style.fontSize = Math.max(20, Math.floor(fsNow * entry.width / wordNeed));
      }
      if (entry.x < FIT_PAD) entry.x = FIT_PAD;
      else if (entry.x + entry.width > canvasW - FIT_PAD) entry.x = Math.max(FIT_PAD, canvasW - FIT_PAD - entry.width);
    } else if (type === "gradient") {
      entry.background = n.css.bgImage || n.css.bgColor || null;
    } else if (type === "image") {
      if (n.role === "image-placeholder") {
        entry.src = null;
        entry.assetType = n.assetType || "stock";
        entry.assetHint = n.assetHint || null;
        entry.objectFit = "cover";
      } else {
        entry.src = n.isImg ? n.imgSrc : null;
        entry.objectFit = n.css.objectFit || "contain";
      }
    }

    // A real Lucide icon is a LEAF glyph. If a data-icon element actually contains
    // its own tagged child shapes, it's an illustration built from divs (e.g. a clock
    // = ring + hands + ticks), not an icon — rendering a glyph would stack a generic
    // icon on top of the hand-built shapes. Only convert leaf elements to icons.
    const iconName = normalizeIconName(n.dataIcon);
    if (iconName && !n.hasRoleChildren) {
      entry.type = "icon";
      entry.iconName = iconName;
      entry.style = entry.style ?? {};
      entry.style.color = entry.style.color ?? "#ffffff";
    }

    // skip empty non-placeholder images and empty gradients
    if (entry.type === "image" && !entry.src && n.role !== "image-placeholder") continue;
    if (entry.type === "gradient" && !entry.background && (entry.borderWidth ?? 0) === 0) continue;

    // Decorative element that had a CSS animation → give it ambient life downstream.
    // Skip text so body copy never flickers (readability).
    if (n.hasAnim && type !== "text") entry.ambientPulse = true;

    // Motion intents (AI Video engine) — attach as { type, direction?, intensity? }.
    // Captured verbatim; the expander validates against the vocabulary + falls back.
    const intensity = n.motionIntensity != null ? (parseFloat(n.motionIntensity) || undefined) : undefined;
    if (n.enterType)    entry.enter    = { type: n.enterType,    direction: n.enterDir || undefined, intensity };
    if (n.exitType)     entry.exit     = { type: n.exitType,     direction: n.exitDir  || undefined, intensity };
    if (n.emphasisType) entry.emphasis = { type: n.emphasisType, intensity };

    graph.push(entry);
  }

  // Synthesize a backdrop from body background if GPT didn't tag an explicit one.
  if (bodyBg && !graph.some(e => e.role === "background")) {
    graph.unshift({
      id: `s${sceneIndex}_background`, role: "background", layer: "gradient", animation: "none", sceneElement: "background",
      type: "gradient", trackId: "track_background",
      x: 0, y: 0, width: canvasW, height: canvasH,
      rotation: 0, zIndex: 0, opacity: 1, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff",
      filter: null, boxShadow: null, mixBlendMode: null, backdropFilter: null,
      background: bodyBg, text: null, style: {},
    });
  }

  // Reserved-zone guard: a user-asset placeholder (the real product screenshot
  // goes here) must stay clean. Drop any element whose center sits inside it — GPT
  // sometimes draws a fake UI mockup on top. (Only for "asset"; stock/ai are
  // backgrounds that intentionally have text over them.)
  const assetPh = graph.find(e => e.type === "image" && e.assetType === "asset");
  if (assetPh) {
    const inside = (e) => {
      const cx = e.x + e.width / 2, cy = e.y + e.height / 2;
      return cx > assetPh.x && cx < assetPh.x + assetPh.width
          && cy > assetPh.y && cy < assetPh.y + assetPh.height;
    };
    const before = graph.length;
    graph = graph.filter(e => e === assetPh || e.role === "background" || !inside(e));
    if (graph.length !== before) {
      console.log(`[htmlMeasure] scene ${sceneIndex} — removed ${before - graph.length} layer(s) over the asset placeholder`);
    }
  }

  // ── Normalizer: enforce sane invariants regardless of what GPT produced ──────
  const MIN_READABLE_FONT = 16;
  const beforeNorm = graph.length;
  graph = graph.filter(e => {
    // 1. Drop unreadable micro-text (almost always fake-mockup label noise).
    if (e.type === "text" && (e.style?.fontSize ?? 99) < MIN_READABLE_FONT) return false;
    // 2. Drop only elements that are ENTIRELY off the frame. An element that BLEEDS
    //    off an edge but is still substantially on-screen is an intentional
    //    composition (e.g. a notepad/card/device anchored at the frame edge) and must
    //    be KEPT — culling by CENTER (the old rule) deleted these edge-bleed visuals.
    if (e.role !== "background") {
      const visX = Math.min(e.x + e.width, canvasW) - Math.max(e.x, 0);
      const visY = Math.min(e.y + e.height, canvasH) - Math.max(e.y, 0);
      // Judge "off-frame" by the FRACTION of the element that's on-screen, not an
      // absolute pixel count — otherwise legitimately THIN elements (connector lines,
      // rails, dividers, a 12px underline) get culled even when fully visible. Drop
      // only when there's no overlap, or just a sliver of the element's own size shows
      // (a large panel 90% off-frame); keep thin lines and intentional edge-bleed art.
      if (visX <= 0 || visY <= 0) return false;
      if (visX < e.width * 0.15 || visY < e.height * 0.15) return false;
    }
    return true;
  });
  if (graph.length !== beforeNorm) {
    console.log(`[htmlMeasure] scene ${sceneIndex} — normalizer dropped ${beforeNorm - graph.length} (tiny-font / off-canvas) layer(s)`);
  }

  // No element-count cap: it amputated legit dense scenes (cards, the clock pattern).
  // Over-building is handled upstream (asset guard, screen-time budget, beat split).

  // Text-over-container guard: when flattening, a card/panel can end up with a higher
  // z than the text it visually CONTAINS (e.g. an explicit-z card → 100+ band, while its
  // label kept the auto/role z), so the card paints OVER its own text and hides it. In
  // the DOM the text is a child and paints above the card; restore that by lifting each
  // text above any larger non-text layer that geometrically contains it and sits at/above
  // its z. Geometric (no DOM needed) so it generalises to all cards/panels/columns.
  for (const tx of graph) {
    if (tx.type !== "text") continue;
    const cx = tx.x + tx.width / 2, cy = tx.y + tx.height / 2;
    let lift = tx.zIndex;
    for (const g of graph) {
      if (g === tx || g.type === "text") continue;
      const containsText =
        cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height &&
        g.width * g.height > tx.width * tx.height; // g is a larger container behind the text
      if (containsText && g.zIndex >= tx.zIndex) lift = Math.max(lift, g.zIndex + 1);
    }
    tx.zIndex = lift;
  }

  graph.sort((a, b) => a.zIndex - b.zIndex);
  return graph;
}
