import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const webDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(webDirectory, "dist");
const dataDirectory = join(webDirectory, "data");
const batteryFiles = (await readdir(dataDirectory)).filter(file => file.endsWith(".json"));
const webFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "storage.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon192.png",
  "icon512.png",
  "sw.js"
];

if (batteryFiles.length === 0) {
  throw new Error(`No question battery JSON files found in ${dataDirectory}`);
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(join(outputDirectory, "data"), { recursive: true });

for (const file of webFiles) {
  await cp(join(webDirectory, file), join(outputDirectory, file));
}

for (const file of batteryFiles) {
  await cp(join(dataDirectory, file), join(outputDirectory, "data", file));
}

globalThis.console.log(`Built ${webFiles.length} web files and ${batteryFiles.length} batteries in ${outputDirectory}`);
