/**
 * layoutRegistry.js — Supabase-backed layout registry
 *
 * Layouts live in the `layouts` table in Supabase.
 * On first access, all active layouts are fetched and cached in memory.
 * Cache auto-refreshes every 60 minutes. Call refreshCache() after any admin save.
 *
 * Sync API (reads from in-memory cache — call initLayoutRegistry() first):
 *   getLayoutDef(id)           → full layout row (def.zones = zone objects)
 *   findLayouts(filters)       → filtered array of layout entries
 *   getAllLayouts()             → all cached layout entries
 *   getLayoutsByIntent(intent) → entries matching intent
 *   getLayoutsByNiche(niche)   → entries matching niche
 *   getAvailableLayouts(f)     → alias for findLayouts
 *   layoutRegistry             → Proxy object (backward compat: layoutRegistry[id])
 *
 * Async API:
 *   initLayoutRegistry()       → Promise<entries[]> — fetch + cache on startup
 *   refreshCache()             → Promise<entries[]> — force re-fetch
 */

import { supabase } from "../../lib/supabase.js";

/* ── Built-in blank layout — always available, used for from-scratch beats ── */
export const BLANK_LAYOUT_ID = "blank";
const BLANK_ROW = {
  id: BLANK_LAYOUT_ID,
  name: "Blank",
  label: "Blank",
  intent: "explanation",
  energy: ["high", "medium", "low"],
  niche: [],
  orientation: "9:16",
  visibility: "active",
  show_caption: true,
  asset_count: 1,
  text_count: 1,
  tags: [],
  thumbnail_url: null,
  is_active: true,
  zones: [
    {
      id: "z1", type: "asset",
      x: 0, y: 0, width: 100, height: 100, zIndex: 0,
      style: { objectFit: "cover" },
      enterAnimation: "fadeIn",
    },
    {
      id: "z2", type: "text", role: "headline",
      x: 5, y: 38, width: 90, height: 24, zIndex: 2,
      style: { fontSize: 80, fontWeight: 900, textAlign: "center", color: "#ffffff",
               lineHeight: 1.1, letterSpacing: "-0.5px" },
      enterAnimation: "fadeIn",
    },
  ],
};

// Keep FALLBACK_ROW for the no-DB scenario
const FALLBACK_ROW = BLANK_ROW;

/* ── In-memory cache ──────────────────────────────────────────── */
let _rows    = [];   // array of normalized entries
let _map     = {};   // id → normalized entry
let _ready   = false;
let _promise = null;
let _timer   = null;

function normalize(row) {
  const zones = Array.isArray(row.zones) ? row.zones : [];
  return {
    // Core identity
    id:              row.id,
    name:            row.name,
    label:           row.label || row.name,
    // Layout vs Template classification
    type:            row.type     || "template",   // 'layout' = structural AI-use | 'template' = styled user-facing
    beatType:        row.beat_type || null,         // hook|item|fact|stat|reveal|explanation|cta|contrast|tension
    // Layout metadata
    intent:          row.intent,
    energy:          Array.isArray(row.energy)       ? row.energy       : ["high", "medium", "low"],
    orientation:     row.orientation || "9:16",
    niche:           Array.isArray(row.niche)        ? row.niche        : [],
    // visibility: "active" = available for AI pipeline | "inactive" = excluded from selection
    // Legacy values "internal"/"external" treated as active for backward compatibility
    visibility:      row.visibility  || "active",
    isActive:        row.visibility !== "inactive",
    tags:            Array.isArray(row.tags)         ? row.tags         : [],
    thumbnail_url:   row.thumbnail_url || null,
    is_active:       row.is_active ?? true,
    showCaption:        row.show_caption ?? true,
    defaultTransition:  row.default_transition ?? null,
    defaultBackground:  row.default_background ?? null,
    assetCount:      row.asset_count  ?? zones.filter(z => z.type === "asset").length,
    textCount:       row.text_count   ?? zones.filter(z => z.type === "text").length,
    // Old code reads layoutRegistry[id].zones as an array of zone-ID strings
    zones:           zones.map(z => z.id),
    supportsAvatar:  zones.some(z => z.content?.kind === "avatar"),
    captionPosition: 80,
    structure:       { heading: true, blocks: true, caption: true },
    // def = full row (def.zones = full zone objects — used by LayoutRenderer, visualPlanner, etc.)
    def: row,
  };
}

async function _fetch() {
  // supabase is null in Remotion's webpack render context (no Vite env injection)
  if (!supabase) {
    if (_rows.length === 0) _rows = [normalize(FALLBACK_ROW)];
    _map   = Object.fromEntries(_rows.map(r => [r.id, r]));
    _map[BLANK_LAYOUT_ID] = normalize(BLANK_ROW);
    _ready = true;
    return _rows;
  }
  try {
    const { data, error } = await supabase
      .from("layouts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const entries = (data || []).map(normalize);
    _rows  = entries.length > 0 ? entries : [normalize(FALLBACK_ROW)];
  } catch {
    // Network failure — keep existing cache; if empty, use fallback
    if (_rows.length === 0) _rows = [normalize(FALLBACK_ROW)];
  }

  _map   = Object.fromEntries(_rows.map(r => [r.id, r]));
  // Always ensure the built-in blank layout is available, regardless of DB contents
  _map[BLANK_LAYOUT_ID] = normalize(BLANK_ROW);
  _ready = true;
  _scheduleAutoRefresh();
  return _rows;
}

function _scheduleAutoRefresh() {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => { _promise = _fetch(); }, 60 * 60 * 1000);
}

/* ── Public API ──────────────────────────────────────────────── */

/** Fetch layouts from Supabase and populate the in-memory cache.
 *  Safe to call multiple times — returns the same promise while in-flight. */
export async function initLayoutRegistry() {
  if (_ready)   return _rows;
  if (_promise) return _promise;
  _promise = _fetch().finally(() => { _promise = null; });
  return _promise;
}

/** Force a re-fetch from Supabase (call after any admin save/create/delete). */
export async function refreshCache() {
  _ready   = false;
  _promise = _fetch().finally(() => { _promise = null; });
  return _promise;
}

// ── Sync getters (ensure initLayoutRegistry() has resolved first) ──

export function getAllLayouts() { return _rows; }

export function getLayoutDef(id) {
  return _map[id]?.def ?? null; // def.zones = full zone objects
}

export function getLayoutsByIntent(intent) {
  return _rows.filter(l => l.intent === intent);
}

export function getLayoutsByNiche(niche) {
  return _rows.filter(l => !l.niche.length || l.niche.includes(niche));
}

export function findLayouts({ intent, energy, orientation, assetCount, textCount, niche, type, beatType, includeInactive = false } = {}) {
  console.log("[findLayouts] called with:", JSON.stringify({ intent, energy, orientation, niche, type, beatType }));
  console.log("[findLayouts] total registry size:", _rows.length, "| type=layout count:", _rows.filter(l => l.type === "layout").length);
  return _rows.filter(l => {
    if (!includeInactive && !l.isActive)                                  return false; // skip inactive unless explicitly requested
    if (type        && l.type     !== type)                               return false;
    if (beatType    && l.beatType !== beatType)                           return false;
    if (intent && !beatType && l.intent !== intent)                        return false; // beatType drives structural layouts; skip intent when beatType is set
    if (energy      && !l.energy.includes(energy))                        return false;
    if (orientation && l.orientation !== orientation)                     return false;
    if (assetCount  !== undefined && l.assetCount !== assetCount)         return false;
    if (textCount   !== undefined && l.textCount  !== textCount)          return false;
    if (niche && l.niche.length > 0 && !l.niche.includes(niche))         return false;
    return true;
  });
}

export function getAvailableLayouts(filters) {
  return findLayouts(filters);
}

/* ── Proxy: backward-compat object access ─────────────────────
   Allows existing code like:
     layoutRegistry[id]            → entry or undefined
     Object.keys(layoutRegistry)   → all IDs
     layoutRegistry[id]?.zones     → zone-ID array
     layoutRegistry[id]?.def       → full row
     layoutRegistry[id]?.showCaption
 */
export const layoutRegistry = new Proxy({}, {
  get(_t, key) {
    if (typeof key === "symbol" || key === "then") return undefined;
    return _map[key];
  },
  has(_t, key)  { return key in _map; },
  ownKeys()     { return Object.keys(_map); },
  getOwnPropertyDescriptor(_t, key) {
    if (!(key in _map)) return undefined;
    return { configurable: true, enumerable: true, writable: false, value: _map[key] };
  },
});

// Kick off the initial fetch immediately on module import
initLayoutRegistry().catch(() => {});
