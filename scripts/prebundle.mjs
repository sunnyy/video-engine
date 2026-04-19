/**
 * scripts/prebundle.mjs
 *
 * Pre-builds the Remotion composition bundle locally so the production server
 * never needs to run esbuild (which crashes on restricted hosts like Hostinger).
 *
 * Run: npm run prebundle
 * Output: ./remotion-bundle/  (commit this directory and deploy it)
 */
import { bundle } from "@remotion/bundler";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR    = path.join(PROJECT_ROOT, "remotion-bundle");

console.log("=== Remotion pre-bundle ===");
console.log("Entry:  ", path.join(PROJECT_ROOT, "src/remotion/Root.jsx"));
console.log("Public: ", path.join(PROJECT_ROOT, "public"));
console.log("Output: ", OUT_DIR);
console.log("");

const tmpBundle = await bundle({
  entryPoint: path.join(PROJECT_ROOT, "src/remotion/Root.jsx"),
  publicDir:  path.join(PROJECT_ROOT, "public"),
});

console.log("Bundle created at temp:", tmpBundle);

// Copy temp bundle → project remotion-bundle/
if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.cpSync(tmpBundle, OUT_DIR, { recursive: true });

console.log("Copied to:", OUT_DIR);

const sizeKb = Math.round(getDirSize(OUT_DIR) / 1024);
console.log(`Bundle size: ${sizeKb} KB (${Math.round(sizeKb / 1024)} MB)`);
console.log("");
console.log("Done! Commit remotion-bundle/ and redeploy.");

function getDirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? getDirSize(full) : fs.statSync(full).size;
  }
  return total;
}
