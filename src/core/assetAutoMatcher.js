import { supabase } from "../lib/supabase";
import { layoutRegistry } from "./layoutRegistry";
import { layoutDefaultsRegistry } from "./layoutDefaultsRegistry";
import { buildAssetPlan } from "./assetStrategyEngine";

function chooseMotion(index) {

  const motions = [
    "pushSlow",
    "kenburns",
    "cinematicPush"
  ];

  return motions[index % motions.length];

}

function getLayoutZones(layout) {

  const def = layoutRegistry[layout];

  if (!def) return ["z1"];

  return def.zones;

}

function findAssetZones(layout, zones) {

  const layoutZones = getLayoutZones(layout);

  const result = [];

  layoutZones.forEach((z) => {

    const zone = zones[z];

    if (!zone) {
      result.push(z);
      return;
    }

    if (zone.role === "asset") {
      result.push(z);
    }

  });

  return result;

}

function detectObjectFit(asset, layout) {

  if (!asset?.width || !asset?.height) return "cover";

  const ratio = asset.width / asset.height;

  const isHorizontal = ratio > 1.2;

  if (layout === "FullZone" && isHorizontal) {
    return "contain";
  }

  return "cover";

}

export async function autoMatchAssets(
  beats,
  orientation,
  {
    assetSource = "stock",
    uploadedAssets = []
  } = {}
) {

  let assets = [];

  if (assetSource === "user" && uploadedAssets.length) {

    assets = uploadedAssets.map(a => ({
      url: a.url,
      type: a.type || "image",
      width: a.width,
      height: a.height
    }));

  } else {

    const { data } = await supabase
      .from("assets_library")
      .select("*");

    assets = data || [];

  }

  if (!assets.length) return beats;

  beats = buildAssetPlan(beats, assets);

  return beats.map((beat, beatIndex) => {

    const zones = { ...beat.zones };

    const assetZones =
      findAssetZones(beat.layout, zones);

    const layoutDefaults =
      layoutDefaultsRegistry[beat.layout] || {};

    assetZones.forEach((zoneKey, zoneIndex) => {

      const assetSrc =
        zones?.[zoneKey]?.content?.asset?.src;

      const asset =
        assets.find(a => a.url === assetSrc) ||
        assets[(beatIndex + zoneIndex) % assets.length];

      const zoneDefaults =
        layoutDefaults?.zones?.[zoneKey] || {};

      const objectFit =
        detectObjectFit(asset, beat.layout);

      zones[zoneKey] = {

        ...zones[zoneKey],

        role: "asset",

        content: {
          kind: "asset",
          asset: {
            src: asset.url,
            type: asset.type || "image",
            objectFit,
            motion:
              zoneDefaults.assetMotion ||
              chooseMotion(beatIndex + zoneIndex),
            enterTransition:
              zoneDefaults.assetEnter || "fadeIn",
            exitTransition:
              zoneDefaults.assetExit || "none"
          }
        }

      };

    });

    return {
      ...beat,
      zones
    };

  });

}