/**
 * assetAutoMatcher.js
 * src/core/assetAutoMatcher.js
 *
 * Generates images via Fal.ai (per asset zone, per beat context).
 * Only fills zones where type === "asset" in the layout definition.
 * Never fills text zones.
 */

import { getLayoutDef } from "./registries/layoutRegistry";
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
  const motions = ["none", "pushSlow", "cinematicPush", "slowZoom", "pullSlow"];
  return motions[(beatIndex + zoneIndex) % motions.length];
}

const STOP_WORDS_MATCHER = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was",
  "were","be","been","have","has","had","do","does","did","will","would","could","should",
  "you","your","we","our","they","their","it","its","this","that","what","how","when",
  "where","who","not","no","so","just","very","really","one","two","three","like","more",
]);

function extractKeywords(text) {
  return [...new Set(
    (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS_MATCHER.has(w))
  )].slice(0, 5);
}

/* ── Main export ── */
export async function autoMatchAssets(
  beats,
  orientation,
  { assetSource = "ai", uploadedAssets = [], topic = "", language = "english", dna = null } = {},
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

  /* ── Only generate AI images when explicitly requested ── */
  if (assetSource !== "ai") return beats;

  /* ── AI image generation — one prompt per asset zone per beat ── */
  const zoneJobs = [];

  beats.forEach((beat, beatIndex) => {
    const assetZones = findAssetZones(beat.layout, beat.zones);
    assetZones.forEach(zoneId => {
      const spoken     = beat.spoken || topic;
      const visualHint = beat.visual_hint || "none";
      const keywords   = extractKeywords(`${spoken} ${topic}`);
      const assetHint  = keywords.length ? { keywords, visual_type: visualHint } : null;
      zoneJobs.push({
        beatIndex,
        zoneId,
        spoken,
        intent:      beat.intent || "explanation",
        visual_hint: visualHint,
        topic,
        assetHint,
        dna,
        beat,
      });
    });
  });

  if (!zoneJobs.length) return beats;

  console.log(`[assetAutoMatcher] Generating ${zoneJobs.length} images via Fal.ai (library reuse enabled: ${!!dna?.niche})...`);

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