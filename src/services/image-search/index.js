import puppeteer from "puppeteer";
import fs from "fs-extra";
import axios from "axios";
import sharp from "sharp";

const query = "dhurandhar movie";
const orientation = "portrait"; // landscape | portrait | square
const downloadDir = "./images";

async function run() {

  await fs.ensureDir(downloadDir);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"]
  });

  const page = await browser.newPage();

  await page.goto(
    `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`,
    { waitUntil: "networkidle2" }
  );

  await page.waitForSelector(".iusc");

  const links = await page.$$(".iusc");

  let count = 0;

  for (const el of links) {

    if (count >= 10) break;

    try {

      const m = await page.evaluate(el => el.getAttribute("m"), el);
      const data = JSON.parse(m);
      const imgUrl = data.murl;

      const res = await axios.get(imgUrl, { responseType: "arraybuffer" });

      const meta = await sharp(res.data).metadata();

      const w = meta.width;
      const h = meta.height;

      let valid = false;

      if (orientation === "landscape" && w > h) valid = true;
      if (orientation === "portrait" && h > w) valid = true;
      if (orientation === "square" && Math.abs(w - h) < 50) valid = true;

      if (!valid) continue;

      await fs.writeFile(`${downloadDir}/img_${count}.jpg`, res.data);

      count++;

    } catch {}

  }

  console.log("Downloaded", count, "images");

}

run();