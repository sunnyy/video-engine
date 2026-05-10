/**
 * assetAutoMatcher.js
 * src/core/assetAutoMatcher.js
 *
 * Routes asset generation per beat based on asset_hint:
 *   entity != null          → /api/search-image with entity as query
 *   entity == null && image_needed → Fal.ai with asset_prompt
 *   image_needed == false   → skip
 */

import { getLayoutDef } from "./registries/layoutRegistry";
import { generateImages } from "../server/assets/falService";
import { serverFetch }    from "../services/serverApi";

function getAssetZoneIds(layoutId) {
  const def = getLayoutDef(layoutId);
  if (!def) return ["z1"];
  return def.zones.filter(z => z.type === "asset").map(z => z.id);
}

function findAssetZones(layoutId, zones) {
  return getAssetZoneIds(layoutId).filter(zId => {
    const zone = zones?.[zId];
    if (!zone) return true;
    if (zone.content?.kind === "block") return false;
    if (zone.content?.asset?.src) return false;
    return true;
  });
}

function chooseMotion(beatIndex, zoneIndex) {
  const motions = ["none", "pushSlow", "cinematicPush", "slowZoom", "pullSlow"];
  return motions[(beatIndex + zoneIndex) % motions.length];
}

function makeAssetZone(src, beatIndex, zoneIndex) {
  return {
    content: {
      kind: "asset",
      asset: {
        src,
        type:            "image",
        objectFit:       "cover",
        motion:          chooseMotion(beatIndex, zoneIndex),
        enterTransition: "none",
        exitTransition:  "none",
      },
    },
  };
}

export async function autoMatchAssets(
  beats,
  orientation,
  { assetSource = "ai", uploadedAssets = [], topic = "", language: _language = "english", dna = null } = {},
) {
  /* ── User uploaded assets ── */
  if (assetSource === "user" && uploadedAssets.length) {
    const assets = uploadedAssets.map(a => ({ url: a.url, type: a.type || "image" }));
    return beats.map((beat, beatIndex) => {
      const zones      = { ...beat.zones };
      const assetZones = findAssetZones(beat.layout, zones);
      assetZones.forEach((zoneId, zoneIndex) => {
        const asset = assets[(beatIndex + zoneIndex) % assets.length];
        zones[zoneId] = { ...zones[zoneId], ...makeAssetZone(asset.url, beatIndex, zoneIndex) };
      });
      return { ...beat, zones };
    });
  }

  if (assetSource !== "ai") return beats;

  /* ── Route beats: entity → search, image_needed → Fal.ai ── */
  const entityJobs = []; // { beatIndex, zoneId, entity }
  const falJobs    = []; // prompts array for generateImages

  beats.forEach((beat, beatIndex) => {
    const hint = beat.asset_hint;
    if (!hint) return;

    const assetZones = findAssetZones(beat.layout, beat.zones);
    if (!assetZones.length) return;

    const zoneId = assetZones[0];

    if (hint.entity) {
      // Store asset_prompt too so we can fall back to scene generation if search fails
      entityJobs.push({ beatIndex, zoneId, entity: hint.entity, assetPrompt: hint.prompt || null, beat });
    } else if (hint.image_needed) {
      falJobs.push({
        beatIndex,
        zoneId,
        spoken:         beat.spoken || topic,
        intent:         beat.intent || "explanation",
        visual_hint:    "none",
        topic,
        promptOverride: hint.prompt || null,
        assetHint:      hint,
        dna,
        beat,
      });
    }
  });

  const updatedBeats = beats.map(b => ({ ...b, zones: { ...b.zones } }));

  /* ── Entity image search, with scene-generation fallback ── */
  const entityFallbackJobs = [];

  await Promise.allSettled(
    entityJobs.map(async ({ beatIndex, zoneId, entity, assetPrompt, beat: entityBeat }) => {
      let found = false;
      const ENTITY_LOGO_TYPES = new Set(["example", "point"]);
      const searchQuery = ENTITY_LOGO_TYPES.has(entityBeat.beatType)
        ? `${entity} app logo transparent`
        : entity;
      try {
        const res = await serverFetch("/api/search-image", {
          method: "POST",
          body:   JSON.stringify({ query: searchQuery }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            updatedBeats[beatIndex].zones[zoneId] = {
              ...updatedBeats[beatIndex].zones[zoneId],
              ...makeAssetZone(data.url, beatIndex, 0),
            };
            found = true;
          }
        }
      } catch (e) {
        console.warn("[assetAutoMatcher] entity search failed:", entity, e.message);
      }

      if (!found) {
        // Never pass the entity name to Fal.ai — use asset_prompt (scene description) instead
        if (assetPrompt) {
          entityFallbackJobs.push({
            beatIndex,
            zoneId,
            spoken:         entityBeat.spoken || topic,
            intent:         entityBeat.intent || "explanation",
            visual_hint:    "none",
            topic,
            promptOverride: assetPrompt,
            assetHint:      { prompt: assetPrompt },
            dna,
            beat:           entityBeat,
          });
        }
        // If no assetPrompt, leave src null — no image for this beat
      }
    })
  );

  /* ── Fal.ai generation (initial + entity fallbacks) ── */
  const allFalJobs = [...falJobs, ...entityFallbackJobs];
  if (allFalJobs.length) {
    console.log(`[assetAutoMatcher] Generating ${allFalJobs.length} images via Fal.ai...`);
    const images = await generateImages({ prompts: allFalJobs, orientation, concurrency: 3 });

    allFalJobs.forEach(({ beatIndex, zoneId }, i) => {
      const image = images[i];
      if (!image?.url) return;
      updatedBeats[beatIndex].zones[zoneId] = {
        ...updatedBeats[beatIndex].zones[zoneId],
        ...makeAssetZone(image.url, beatIndex, 0),
      };
    });
  }

  return updatedBeats;
}
