/**
 * assetAutoMatcher.js
 * src/core/assetAutoMatcher.js
 *
 * Fetches assets from Pixabay based on topic, then distributes
 * them across beat zones using dedup logic from assetStrategyEngine.
 *
 * No longer reads from Supabase assets_library.
 * User-uploaded assets still take priority when assetSource === "user".
 */

import { layoutRegistry } from "./layoutRegistry";
import { layoutDefaultsRegistry } from "./layoutDefaultsRegistry";
import { buildAssetPlan } from "./assetStrategyEngine";
import { fetchAssets } from "../services/image-search";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

function getLayoutZones(layout) {
  return layoutRegistry[layout]?.zones || ["z1"];
}

function findAssetZones(layout, zones) {
  return getLayoutZones(layout).filter((z) => {
    const zone = zones[z];
    return !zone || zone.role === "asset";
  });
}

function detectObjectFit(asset, layout) {
  if (!asset?.width || !asset?.height) return "cover";
  const ratio = asset.width / asset.height;
  const isHorizontal = ratio > 1.2;
  return layout === "FullZone" && isHorizontal ? "contain" : "cover";
}

function chooseMotion(beatIndex, zoneIndex) {
  const motions = ["kenburns", "pushSlow", "cinematicPush", "slowZoom", "pullSlow"];
  return motions[(beatIndex + zoneIndex) % motions.length];
}

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────── */

export async function autoMatchAssets(
  beats,
  orientation,
  { assetSource = "stock", uploadedAssets = [], topic = "", language = "english" } = {},
) {
  let assets = [];

  /* ── User uploaded assets take full priority ── */
  if (assetSource === "user" && uploadedAssets.length) {
    assets = uploadedAssets.map((a) => ({
      url: a.url,
      type: a.type || "image",
      width: a.width,
      height: a.height,
    }));
  } else {
    /* ── Fetch from Pixabay based on topic ── */

    // Count total asset zones needed across all beats
    const totalZonesNeeded = beats.reduce((sum, beat) => {
      return sum + findAssetZones(beat.layout, beat.zones).length;
    }, 0);

    // Fetch 1.5× what we need to allow for dedup variety
    const fetchCount = Math.min(Math.ceil(totalZonesNeeded * 1.5), 40);
    
    assets = await fetchAssets({
      query: topic || "lifestyle people",
      language,
      orientation,
      count: fetchCount,
    });

    // If Pixabay returns nothing, return beats unchanged
    if (!assets.length) {
      console.warn("[assetAutoMatcher] No assets fetched — beats will have empty zones");
      return beats;
    }
  }

  /* ── Distribute assets across beats using strategy engine ── */
  beats = buildAssetPlan(beats, assets);

  /* ── Apply zone-level settings (objectFit, motion, transitions) ── */
  return beats.map((beat, beatIndex) => {
    const zones = { ...beat.zones };
    const assetZones = findAssetZones(beat.layout, zones);
    const layoutDefs = layoutDefaultsRegistry[beat.layout] || {};

    assetZones.forEach((zoneKey, zoneIndex) => {
      const currentSrc = zones[zoneKey]?.content?.asset?.src;
      const asset = assets.find((a) => a.url === currentSrc) || assets[(beatIndex + zoneIndex) % assets.length];

      const zoneDefs = layoutDefs?.zones?.[zoneKey] || {};
      const objectFit = detectObjectFit(asset, beat.layout);

      zones[zoneKey] = {
        ...zones[zoneKey],
        role: "asset",
        content: {
          kind: "asset",
          asset: {
            src: asset.url,
            type: asset.type || "image",
            objectFit,
            motion: zoneDefs.assetMotion || chooseMotion(beatIndex, zoneIndex),
            enterTransition: zoneDefs.assetEnter || "fadeIn",
            exitTransition: zoneDefs.assetExit || "none",
          },
        },
      };
    });

    return { ...beat, zones };
  });
}
