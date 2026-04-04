/**
 * assetAutoMatcher.js
 * src/core/assetAutoMatcher.js
 *
 * Generates images via Fal.ai (per asset zone, per beat context).
 * Only fills zones where type === "asset" in the layout definition.
 * Never fills text zones.
 */

import { getLayoutDef } from "./layoutRegistry";
import { generateImages } from "../server/assets/falService";

/* ── Get asset-type zones from layout definition ── */
function getAssetZoneIds(layoutId) {
  const def = getLayoutDef(layoutId);
  if (!def) return ["z1"];
  return def.zones.filter(z => z.type === "asset").map(z => z.id);
}

/* ── Find which asset zones still need a src filled ── */
function findAssetZones(layoutId, zones) {
  return getAssetZoneIds(layoutId).filter(zId => {
    const zone = zones?.[zId];
    if (!zone) return true; // missing — needs asset
    if (zone.content?.kind === "block") return false; // block zone — skip
    if (zone.content?.asset?.src) return false; // already has asset — skip
    return true;
  });
}

function chooseMotion(beatIndex, zoneIndex) {
  const motions = ["kenburns", "pushSlow", "cinematicPush", "slowZoom", "pullSlow"];
  return motions[(beatIndex + zoneIndex) % motions.length];
}

/* ── Main export ── */
export async function autoMatchAssets(
  beats,
  orientation,
  { assetSource = "ai", uploadedAssets = [], topic = "", language = "english" } = {},
) {

  /* ── User uploaded assets — full priority ── */
  if (assetSource === "user" && uploadedAssets.length) {
    const assets = uploadedAssets.map(a => ({
      url:  a.url,
      type: a.type || "image",
    }));

    return beats.map((beat, beatIndex) => {
      const zones      = { ...beat.zones };
      const assetZones = findAssetZones(beat.layout, zones);

      assetZones.forEach((zoneId, zoneIndex) => {
        const asset = assets[(beatIndex + zoneIndex) % assets.length];
        zones[zoneId] = {
          ...zones[zoneId],
          content: {
            kind: "asset",
            asset: {
              src:             asset.url,
              type:            asset.type,
              objectFit:       "cover",
              motion:          chooseMotion(beatIndex, zoneIndex),
              enterTransition: "none",
              exitTransition:  "none",
            },
          },
        };
      });

      return { ...beat, zones };
    });
  }

  /* ── AI image generation — one prompt per asset zone per beat ── */
  const zoneJobs = [];

  beats.forEach((beat, beatIndex) => {
    const assetZones = findAssetZones(beat.layout, beat.zones);
    assetZones.forEach(zoneId => {
      zoneJobs.push({
        beatIndex,
        zoneId,
        spoken:      beat.spoken      || topic,
        intent:      beat.intent      || "explanation",
        visual_hint: beat.visual_hint || "none",
        topic,
      });
    });
  });

  if (!zoneJobs.length) return beats;

  console.log(`[assetAutoMatcher] Generating ${zoneJobs.length} images via Fal.ai...`);

  const images = await generateImages({
    prompts:     zoneJobs,
    orientation,
    concurrency: 3,
  });

  const updatedBeats = beats.map(b => ({ ...b, zones: { ...b.zones } }));
  let imageIndex = 0;

  beats.forEach((beat, beatIndex) => {
    const assetZones = findAssetZones(beat.layout, beat.zones);

    assetZones.forEach((zoneId, zoneIndex) => {
      const image = images[imageIndex++];
      if (!image) return;

      updatedBeats[beatIndex].zones[zoneId] = {
        ...updatedBeats[beatIndex].zones[zoneId],
        content: {
          kind: "asset",
          asset: {
            src:             image.url,
            type:            "image",
            objectFit:       "cover",
            motion:          chooseMotion(beatIndex, zoneIndex),
            enterTransition: "none",
            exitTransition:  "none",
          },
        },
      };
    });
  });

  return updatedBeats;
}