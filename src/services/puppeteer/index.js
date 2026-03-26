import axios from "axios";
import fs from "fs-extra";

const query = "dhurandhar movie";
const downloadDir = "./images";

async function run() {

  await fs.ensureDir(downloadDir);

  const tokenRes = await axios.get(
    "https://duckduckgo.com/?q=" + encodeURIComponent(query),
    {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    }
  );

  const match = tokenRes.data.match(/vqd=([\d-]+)/);

  if (!match) {
    console.log("Token not found");
    return;
  }

  const vqd = match[1];

  const res = await axios.get("https://duckduckgo.com/i.js", {
    params: {
      q: query,
      vqd: vqd,
      o: "json",
      iax: "images",
      ia: "images"
    },
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  let count = 0;

  for (const img of res.data.results.slice(0, 10)) {
    try {
      const image = await axios.get(img.image, { responseType: "arraybuffer" });
      await fs.writeFile(`${downloadDir}/img_${count}.jpg`, image.data);
      count++;
    } catch {}
  }

  console.log("Downloaded", count, "images");
}

run();