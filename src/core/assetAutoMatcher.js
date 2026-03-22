import { supabase } from "../lib/supabase";

function extractTags(text = "") {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ""))
    .filter(Boolean);
}

function chooseAnimation(index) {
  const cinematic = [
    "pushSlow",
    "driftLeft",
    "driftRight",
    "driftUp",
    "driftDown",
    "kenburnsPro",
    "cinematicPush",
  ];

  return cinematic[index % cinematic.length];
}

function scoreAsset(asset, tags) {
  let score = 0;

  const title = (asset.title || "").toLowerCase();
  const category = (asset.category || "").toLowerCase();
  const description = (asset.description || "").toLowerCase();

  tags.forEach((tag) => {
    if (title.includes(tag)) score += 3;
    if (category.includes(tag)) score += 2;
    if (description.includes(tag)) score += 1;
  });

  return score;
}

export async function autoMatchAssets(beats, orientation) {
  const { data: assets, error } = await supabase
    .from("assets_library")
    .select("*");

  if (error || !assets?.length) {
    console.warn("Asset library empty or error:", error);
    return beats;
  }

  const usedAssets = new Set();

  return beats.map((beat, index) => {
    const text =
      (beat.heading || "") +
      " " +
      (beat.text || "") +
      " " +
      (beat.caption?.text || "") +
      " " +
      (beat.spoken || "");

    const tags = extractTags(text);

    let bestAsset = null;
    let bestScore = -1;

    for (const asset of assets) {
      if (usedAssets.has(asset.url)) continue;

      const score = scoreAsset(asset, tags);

      if (score > bestScore) {
        bestScore = score;
        bestAsset = asset;
      }
    }

    if (!bestAsset) {
      const fallback = assets.find((a) => !usedAssets.has(a.url));
      bestAsset = fallback || assets[index % assets.length];
    }

    usedAssets.add(bestAsset.url);

    const firstZone = Object.keys(beat.zones || {})[0];
    if (!firstZone) return beat;

    const animation = chooseAnimation(index);

    return {
      ...beat,
      zones: {
        ...beat.zones,
        [firstZone]: {
          type: "asset",
          src: bestAsset.url,
          objectFit: "cover",
        },
      },
      asset_settings: {
        ...(beat.asset_settings || {}),
        [firstZone]: {
          animation,
        },
      },
    };
  });
}