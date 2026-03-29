export function buildAssetPlan(beats = [], assets = []) {

  if (!assets.length) return beats;

  const usedInVideo = new Set();
  let assetIndex = 0;

  function nextAsset() {

    let attempts = 0;

    while (attempts < assets.length) {

      const asset = assets[assetIndex % assets.length];
      assetIndex++;

      if (!usedInVideo.has(asset.url)) {
        usedInVideo.add(asset.url);
        return asset;
      }

      attempts++;
    }

    // fallback if all assets used
    return assets[assetIndex % assets.length];

  }

  return beats.map((beat) => {

    const zones = { ...beat.zones };

    Object.keys(zones).forEach((z) => {

      const zone = zones[z];

      if (zone.role !== "asset") return;

      const asset = nextAsset();

      zones[z] = {
        ...zone,
        content: {
          ...zone.content,
          asset: {
            ...zone.content.asset,
            src: asset.url
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