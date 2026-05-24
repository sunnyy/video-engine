import { createRequire } from "module";
const require = createRequire(import.meta.url);
const data = require("./testScene.json");
console.log(JSON.stringify(data, null, 2));
