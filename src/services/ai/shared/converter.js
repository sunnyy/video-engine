/**
 * converter.js
 * src/services/ai/shared/converter.js
 *
 * The DEFAULT (and only) HTML→layers converter for the beat pipeline, shared by all five video
 * services (promptVideo / socialVideo / productVideo / saasVideo / talkingHead). The old flat-pixel
 * parser (htmlParser.js) has been deleted.
 *
 * GPT writes natural nested HTML/CSS (flexbox, grid, flow, auto-sizing); this renders that HTML in
 * a headless browser and MEASURES the real laid-out result via getBoundingClientRect() +
 * getComputedStyle(), then flattens it to the flat, absolutely-positioned layer entries the rest
 * of the pipeline consumes.
 *
 * The browser is a shared, warm singleton with a concurrency-safe lifecycle (ref-counted pages +
 * idle close) — see getBrowser/closeMeasureBrowser below.
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CANVAS_W_DEFAULT = 1080;
const CANVAS_H_DEFAULT = 1920;

// ── Local fonts for measurement ──────────────────────────────────────────────
// The measure browser must use the SAME fonts as the final render, or text is sized
// with fallback metrics (narrower) → boxes come out too small → real (wider) fonts
// wrap/overflow at render. The scene HTML loads fonts via a Google @import, but that
// CDN is slow/blocked on some hosts and we only wait 3s — so we inject the bundled
// woff2 (public/fonts) as data-URI @font-face, which loads instantly and identically.
const FONTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../public/fonts");
let _localFontCss; // cached
export function localFontsCss() {
  if (_localFontCss !== undefined) return _localFontCss;
  try {
    const css = fs.readFileSync(path.join(FONTS_DIR, "fonts.css"), "utf8");
    _localFontCss = css.replace(/url\(['"]?\.\/([^'")]+)['"]?\)/g, (m, file) => {
      try {
        const buf = fs.readFileSync(path.join(FONTS_DIR, file));
        // Replace ONLY the url(); the original rule already ends with format('woff2').
        // Appending another here makes a double-format src descriptor — Chrome then can't
        // load the exact weight face and SYNTHESIZES bold from a different weight, measuring
        // text ~4% narrower than the real render font → boxes too tight → wrap/overflow at
        // render. Keeping the original's single format() makes measure match render.
        return `url(data:font/woff2;base64,${buf.toString("base64")})`;
      } catch { return m; }
    });
  } catch {
    _localFontCss = ""; // bundle missing → fall back to the HTML's own @import
  }
  return _localFontCss;
}

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
// Concurrency-safe lifecycle. The web server runs OVERLAPPING generations against this shared
// browser, so we must never close it out from under an in-flight run (that throws "Target/Session
// closed" → blank scenes in the other user's video). We ref-count open pages (_inFlight) and
// only close when idle. closeMeasureBrowser() therefore just ARMS an idle timer instead of
// closing immediately — which also keeps the instance warm for back-to-back/concurrent runs
// (no ~0.5–2s relaunch per generation). Override the warm window with MEASURE_BROWSER_IDLE_MS.
let _inFlight = 0;
let _idleTimer = null;
const BROWSER_IDLE_MS = Math.max(0, parseInt(process.env.MEASURE_BROWSER_IDLE_MS || "30000", 10));

async function getBrowser() {
  if (_idleTimer) { clearTimeout(_idleTimer); _idleTimer = null; } // work arriving → stay warm
  if (_browser && _browser.connected) return _browser;
  // Container-hardened flags. In a fixed-size container (e.g. the Railway worker) Chrome's
  // default multi-process model spawns a GPU process + zygote + per-tab renderers, each with
  // many threads — a burst of these exhausts the container's PID/thread budget and Chrome
  // dies with "pthread_create: Resource temporarily unavailable (11)". These flags collapse
  // Chrome to a minimal process/thread footprint; we only need it to lay out + measure DOM.
  _browser = await puppeteer.launch({
    headless: true,
    // On the server this points at the apt-installed Chromium (PUPPETEER_EXECUTABLE_PATH); locally
    // it's undefined → Puppeteer's own bundled Chromium.
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
      "--disable-gpu",                  // no GPU process (the "GPU process isn't usable" crashes)
      "--no-zygote",                    // don't fork a zygote (the "Zygote could not fork" errors)
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--mute-audio",
      "--no-first-run",
    ],
  });
  return _browser;
}

// ── Concurrency gate ────────────────────────────────────────────────────────────
// Callers measure many beats with Promise.all(beats.map(measureSceneHTML)). Against one
// shared browser that opens a dozen pages AT ONCE — each page spins up Chrome threads — and
// in a small container that burst blows past the PID/thread ceiling (EAGAIN). We cap how many
// measures run concurrently here, so EVERY caller (AI Video, Social, Product, …) is bounded
// without each having to know. Default 2; override with MEASURE_CONCURRENCY.
const MEASURE_CONCURRENCY = Math.max(1, parseInt(process.env.MEASURE_CONCURRENCY || "2", 10));
let _active = 0;
const _waiters = [];
async function acquireSlot() {
  if (_active < MEASURE_CONCURRENCY) { _active++; return; }
  await new Promise((resolve) => _waiters.push(resolve));
  _active++;
}
function releaseSlot() {
  _active--;
  const next = _waiters.shift();
  if (next) next();
}

// Request a close. Deferred + ref-counted: never closes while pages are in flight (which would
// throw "Target/Session closed" in a concurrent run), and stays warm for BROWSER_IDLE_MS so
// rapid successive generations reuse one instance. Set MEASURE_BROWSER_IDLE_MS=0 to close as soon
// as idle. The timer is unref'd so it never keeps the process alive on its own.
function armIdleClose() {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(async () => {
    _idleTimer = null;
    if (_inFlight > 0) { armIdleClose(); return; }          // still busy → re-check later
    if (_browser) { const b = _browser; _browser = null; try { await b.close(); } catch {} }
  }, Math.max(250, BROWSER_IDLE_MS));
  if (_idleTimer.unref) _idleTimer.unref();
}
export function closeMeasureBrowser() { armIdleClose(); }

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

    // Typography can live on text-bearing CHILDREN while the data-role sits on a layout
    // WRAPPER — e.g. <div data-role="headline"><div class="headline-line">…</div></div>,
    // where the font-family/size are on .headline-line, not the wrapper. Reading the
    // wrapper's own computed font then yields the inherited page default (16px) and the
    // headline renders tiny inside a correctly-measured (large) box. So when the element
    // has no direct text of its own, read the font fields from the first descendant that
    // actually holds text. (When the role element carries the text directly, tcs === cs.)
    const tcs = (() => {
      const hasDirectText = (node) => {
        for (const c of node.childNodes) if (c.nodeType === 3 && c.textContent.trim()) return true;
        return false;
      };
      if (hasDirectText(el)) return cs;
      for (const d of el.querySelectorAll("*")) if (hasDirectText(d)) return getComputedStyle(d);
      return cs;
    })();

    // writing-mode vertical (left/right rail labels) rotates the glyph run 90° off
    // horizontal, but that is NOT a transform — it never shows up in the matrix below. Fold
    // it into the rotation so the renderer (horizontal text + rotation) reproduces it, and
    // flag it so the box width/height get swapped (text flows along the long axis).
    const isVertical = /vertical|sideways/.test(cs.writingMode || "");

    // rotation from the computed transform matrix
    let rotation = 0;
    const tr = cs.transform;
    if (tr && tr !== "none" && tr.startsWith("matrix")) {
      const m = tr.match(/matrix\(([^)]+)\)/);
      if (m) { const p = m[1].split(",").map(parseFloat); rotation = Math.round(Math.atan2(p[1], p[0]) * 180 / Math.PI); }
    }
    if (isVertical) rotation = ((rotation + 90) % 360 + 360) % 360;

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
      // Text from this element's OWN direct text nodes (NOT descendants). Lets us tell a real
      // layout wrapper (text lives in tagged children) from a text element that merely contains a
      // small decorative tagged child (e.g. a typed line + a <div data-role="divider"> cursor).
      ownText:      Array.from(el.childNodes).filter(c => c.nodeType === 3).map(c => c.textContent).join(" ").replace(/\s+/g, " ").trim(),
      rect:         { x: r.x, y: r.y, width: r.width, height: r.height },
      offsetW:      el.offsetWidth,
      offsetH:      el.offsetHeight,
      rotation,
      vertical:     isVertical,
      // Font fields come from tcs (the text-bearing element); everything else from el's own cs.
      css: {
        color:          tcs.color,
        fontFamily:     tcs.fontFamily,
        fontSize:       parseFloat(tcs.fontSize) || 0,
        fontWeight:     parseInt(tcs.fontWeight, 10) || 400,
        letterSpacing:  tcs.letterSpacing === "normal" ? 0 : (parseFloat(tcs.letterSpacing) || 0),
        lineHeightPx:   tcs.lineHeight === "normal" ? null : (parseFloat(tcs.lineHeight) || null),
        textAlign:      tcs.textAlign,
        textTransform:  tcs.textTransform,
        textShadow:     tcs.textShadow === "none" ? null : tcs.textShadow,
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

  // Bound concurrent measures so a Promise.all over many beats can't open a dozen Chrome
  // pages at once and exhaust the container's PID/thread budget.
  await acquireSlot();
  // If browser launch / new page fails (the very failure we're hardening against), release
  // the slot here — otherwise a failed acquire leaks a slot and eventually deadlocks measuring.
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    _inFlight++; // page open → keep the shared browser alive until this measure finishes
  } catch (e) {
    releaseSlot();
    throw e;
  }
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
    // Inject the bundled fonts so measurement matches the render exactly (no CDN wait).
    const lf = localFontsCss();
    if (lf) { try { await page.addStyleTag({ content: lf }); } catch {} }
    // Flex/grid items default to min-width:auto, so a single long word (e.g.
    // "MEDITERRANEAN") forces its column to min-content width and BLOWS OUT the whole
    // layout — sibling columns (a side illustration/notepad) get pushed off-canvas and
    // culled, and headlines refuse to wrap. The standard remedy is min-width:0 on
    // flex/grid children; inject it so columns respect their fr ratios as intended.
    try { await page.addStyleTag({ content: "*{min-width:0!important;}" }); } catch {}
    // Devanagari (Hindi on-screen) must MEASURE with a real Devanagari font or the box widths come
    // out wrong (tofu metrics). Append the Noto fallback to every element's font stack — Latin keeps
    // its face, Devanagari glyphs fall back to Noto — matching the render's withDevanagari().
    try {
      await page.evaluate(() => {
        for (const el of document.querySelectorAll("body *")) {
          const ff = getComputedStyle(el).fontFamily || "";
          if (!/Noto Sans Devanagari/i.test(ff)) el.style.fontFamily = (ff ? ff + ", " : "") + '"Noto Sans Devanagari", sans-serif';
        }
      });
    } catch {}
    try {
      await Promise.race([
        page.evaluate(() => document.fonts && document.fonts.ready),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    } catch {}
    collected = await page.evaluate(collectInPage, canvasW, canvasH);
  } finally {
    try { await page.close(); } catch {}
    _inFlight = Math.max(0, _inFlight - 1);
    releaseSlot();
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
    // A container (has data-role descendants) must NOT render its full innerText — that includes
    // the children's text and would double/overlap with the child layers. BUT if the element has
    // its OWN direct text (e.g. a typed line that also holds a tiny <div data-role="divider">
    // cursor), that text is real and belongs to THIS layer — keep it, rendering only its own text
    // (the children stay separate layers). Only a true wrapper (no own text) is dropped/treated as bg.
    if (type === "text" && n.hasRoleChildren) {
      if (n.ownText) { n.text = n.ownText; }
      else if (n.css.bgImage || n.css.bgColor) { type = "gradient"; }
      else { continue; }
    }

    // For rotated elements, getBoundingClientRect returns the (larger) rotated
    // bounding box. The renderer re-applies rotation around the element CENTER, so
    // store the UNROTATED size (offsetWidth/Height) centered on the measured box's
    // center — otherwise rotated elements are double-transformed (wrong pos + size).
    let x, y, width, height;
    if ((n.rotation || n.vertical) && n.offsetW && n.offsetH) {
      // Store the UNROTATED horizontal box. For vertical writing-mode the text run is the
      // element's HEIGHT (long axis) and its thickness is the WIDTH — swap them so the
      // horizontal text layer is wide enough not to wrap, then rotation lays it back vertical.
      width  = Math.round(n.vertical ? n.offsetH : n.offsetW);
      height = Math.round(n.vertical ? n.offsetW : n.offsetH);
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

      // Width safety: round UP + a few px so sub-pixel rounding or any tiny metric drift
      // can never force a one-line headline to wrap at render (tight boxes were causing
      // the "Bold Style," / "Crafted for" overlap). Capped to the frame. (Horizontal text
      // only — see the !n.vertical guard on the fit block below.)
      if (!n.vertical) entry.width = Math.min(canvasW - x, entry.width + 4);

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

      // The text-fit buffer + clamps below all assume an AXIS-ALIGNED HORIZONTAL box.
      // A vertical (writing-mode) label's box was stored as the rotated run (wide) centered
      // on its rail; widening/clamping it to the canvas would move its rotation center off
      // the rail and shrink the font against the wrong axis. Its box is already correct, so
      // skip the horizontal fit pass entirely for vertical text.
      if (!n.vertical) {
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
      }
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
      // Preserve a FILLED icon chip: if the icon element has its own background fill (a rounded
      // coloured box), that box is the designer's intent. Converting straight to a glyph drops the
      // fill — leaving a white icon on a light page (invisible). When there's a real fill, emit the
      // chip as a separate rounded box BEHIND the glyph (pushed first → same z, earlier in array →
      // underneath) so the filled shape survives and the white icon stays legible on top.
      const chipBg = n.css.bgImage || n.css.bgColor || null;
      if (chipBg) {
        graph.push({ ...entry, id: `${entry.id}_chip`, type: "gradient", iconName: undefined,
          background: chipBg, text: null, style: {} });
        entry.background = null;
      }
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

  // ── Collapse stacked duplicate text (RGB-split / layered-shadow glitch) ───────
  // GPT sometimes builds a headline as several IDENTICAL <hN> copies stacked in one spot —
  // an offset red + cyan + white "chromatic aberration" glitch (mix-blend-mode + clip-path +
  // a few px translate). In a browser those fuse into one glitchy headline, but our flatten
  // drops the clip-paths/offsets that fused them, so they become 2-3 separated colored copies
  // of the same words (each its own animated layer). Keep ONE — the normally-drawn base (no
  // blend mode, drawn on top) — and drop the decorative duplicates.
  {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
    const overlaps = (a, b) => {
      const ix = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (ix <= 0 || iy <= 0) return false;
      const minArea = Math.min(a.width * a.height, b.width * b.height) || 1;
      return (ix * iy) > minArea * 0.6; // boxes mostly coincide → same logical text
    };
    // Of two duplicates, the "real" text is the one drawn normally: no blend mode wins, else
    // the topmost (highest z), else keep the first seen.
    const base = (a, b) => {
      if (!!a.mixBlendMode !== !!b.mixBlendMode) return a.mixBlendMode ? b : a;
      if (a.zIndex !== b.zIndex) return a.zIndex > b.zIndex ? a : b;
      return a;
    };
    const kept = [];
    const drop = new Set();
    for (const e of graph) {
      if (e.type !== "text" || !norm(e.text)) continue;
      const twin = kept.find(k => norm(k.text) === norm(e.text) && overlaps(k, e));
      if (!twin) { kept.push(e); continue; }
      const winner = base(twin, e);
      const loser  = winner === twin ? e : twin;
      drop.add(loser.id);
      if (loser === twin) kept[kept.indexOf(twin)] = e; // e became the survivor
    }
    if (drop.size) {
      graph = graph.filter(e => !drop.has(e.id));
      console.log(`[htmlMeasure] scene ${sceneIndex} — collapsed ${drop.size} stacked duplicate text layer(s)`);
    }
  }

  // Containment z-lift: when flattening, a container (card / panel / mockup window) can share or
  // exceed the z of the content it visually CONTAINS — its nested cards, decorations, dots, bars,
  // text — and, painted later, hide them (GPT writes the text INSIDE the box, where the DOM paints
  // it above; flattened to siblings at the same z, the later box buries it). Restore DOM order by
  // lifting EVERY element strictly above any larger element that geometrically contains it.
  //
  // This must ITERATE to a fixpoint: a single pass computed from the ORIGINAL z collapses nested
  // equal-z stacks — text in a card in a section all at z=11 lift child AND parent to the SAME 11,
  // so the card still ties with (and, by array order, buries) the text. Re-running with the CURRENT
  // z separates each level: pass 2 sees the card now at 11 and pushes the text to 12. (Text is never
  // treated as a container; siblings don't contain each other, so this converges in a few passes.)
  const contains = (g, el) => {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
    return cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height &&
           g.width * g.height > el.width * el.height; // g strictly larger → an enclosing container
  };
  for (let pass = 0, changed = true; changed && pass < 8; pass++) {
    changed = false;
    for (const el of graph) {
      for (const g of graph) {
        if (g === el || g.type === "text") continue; // text isn't a container
        if (contains(g, el) && g.zIndex >= el.zIndex) { el.zIndex = g.zIndex + 1; changed = true; }
      }
    }
  }

  // Page floor: a full-canvas role="background" GRADIENT is the page backdrop / tint / vignette and
  // belongs BENEATH the hero. Image beats are now composed BY the designer (GPT writes the <img>),
  // and GPT tags BOTH the hero <img> and its backdrop/tint gradients role="background"; flattened
  // they tie at z=0 and a gradient, painted later, BURIES the photo (the scene renders as a dead
  // colour field). Demote every full-canvas background gradient below the floor so the image — and
  // all content — always sits above it. A LOCAL text-band scrim is partial-height (not full-canvas),
  // so it's untouched and still sits over its photo as the designer authored it.
  // Only SINK the page background to a negative z (behind the renderer's canvas base) when there's a
  // full-frame IMAGE it must not bury. With no such image, a negative z hides the ONLY background
  // behind the black base → the whole scene renders black (broke light/brand-tinted designed scenes).
  // In that case keep it at the floor (z0) so it actually paints, with all content sitting above it.
  const hasFullCanvasImage = graph.some(e => e.type === "image" && e.src &&
    e.width >= canvasW * 0.92 && e.height >= canvasH * 0.92 &&
    e.x <= canvasW * 0.08 && e.y <= canvasH * 0.08);
  for (const el of graph) {
    if (el.type === "gradient" && el.role === "background" &&
        el.width >= canvasW * 0.92 && el.height >= canvasH * 0.92 &&
        el.x <= canvasW * 0.08 && el.y <= canvasH * 0.08) {
      el.zIndex = hasFullCanvasImage ? Math.min(el.zIndex, -1) : Math.min(el.zIndex, 0);
    }
  }

  // Frame floor: an OPAQUE fill that nearly coincides with an image's box IS that image's frame /
  // card / container background. Flattened to a sibling it can tie or exceed the image's z and,
  // painted later, BURY the photo — the card renders as a dead colour panel (e.g. a framed hero
  // photo that came out an empty beige rectangle). This is the card-sized cousin of the page floor
  // above: same disease, just not full-canvas, so the rule there misses it. Demote any such opaque
  // fill just below its image. A legibility SCRIM (transparent→dark gradient laid over the photo)
  // has alpha and is intentionally ABOVE — detect any sub-1 alpha / "transparent" and leave it.
  {
    const hasTransparency = (bg) => !bg || /transparent/i.test(bg) ||
      /rgba?\([^)]*,\s*(?:0|0?\.\d+)\s*\)/i.test(bg); // any colour stop with <1 alpha → it's a scrim
    const sameBox = (a, b) => {
      const ix = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (ix <= 0 || iy <= 0) return false;
      const inter = ix * iy, union = a.width * a.height + b.width * b.height - inter;
      return union > 0 && inter / union > 0.7; // IoU > 0.7 → essentially the same rectangle
    };
    for (const img of graph) {
      if (img.type !== "image" || !img.src) continue;
      for (const g of graph) {
        if (g.type !== "gradient" || g === img) continue;
        if ((g.opacity ?? 1) >= 0.98 && !hasTransparency(g.background) &&
            g.zIndex >= img.zIndex && sameBox(g, img)) {
          g.zIndex = img.zIndex - 1;
        }
      }
    }
  }

  graph.sort((a, b) => a.zIndex - b.zIndex);
  return graph;
}
