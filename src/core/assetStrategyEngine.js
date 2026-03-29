export function buildAssetPlan(beats = [], assets = []) {

  if (!assets.length) return beats;

  let assetIndex = 0;
  const usedRecently = [];

  function nextAsset() {

    let attempts = 0;

    while (attempts < assets.length) {

      const asset = assets[assetIndex % assets.length];
      assetIndex++;

      if (!usedRecently.includes(asset.url)) {

        usedRecently.push(asset.url);

        if (usedRecently.length > 5) {
          usedRecently.shift();
        }

        return asset;
      }

      attempts++;

    }

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