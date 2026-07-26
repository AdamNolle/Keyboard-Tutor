import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [directory, expectedBase] = process.argv.slice(2);
if (!directory || !expectedBase)
  throw new Error("Usage: verify-build.mjs <dist-directory> <expected-base>");

const read = (file) => readFileSync(join(directory, file), "utf8");
const index = read("index.html");
if (/Guitar-Tutor|Program Files\/Git/i.test(index))
  throw new Error(`${directory}/index.html contains leaked or converted paths`);

const urls = [...index.matchAll(/(?:href|src)="([^"]+)"/g)].map(
  (match) => match[1],
);
for (const url of urls) {
  if (/^https?:\/\//.test(url)) continue;
  const relative = url.startsWith(expectedBase)
    ? url.slice(expectedBase.length)
    : url.startsWith("/")
      ? null
      : url.replace(/^\.\//, "");
  if (relative === null)
    throw new Error(`${url} does not use expected base ${expectedBase}`);
  if (!existsSync(join(directory, decodeURIComponent(relative))))
    throw new Error(`${url} does not resolve to a built file`);
}

const manifest = JSON.parse(read("manifest.webmanifest"));
if (manifest.start_url !== "./" || manifest.scope !== "./")
  throw new Error("Manifest start_url and scope must remain relative");
for (const icon of manifest.icons ?? [])
  if (!existsSync(join(directory, icon.src)))
    throw new Error(`Manifest icon is missing: ${icon.src}`);

const worker = read("sw.js");
for (const asset of [
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "fonts/manrope.woff2",
  "fonts/space-grotesk.woff2",
  "fonts/bravura.woff2",
]) {
  const count = worker.split(asset).length - 1;
  if (count !== 1)
    throw new Error(`${asset} appears ${count} times in the precache manifest`);
}

const stylesheetUrl = urls.find(
  (url) => url.includes("/assets/") && url.endsWith(".css"),
);
if (!stylesheetUrl) throw new Error("Built stylesheet was not linked");
const stylesheet = read(
  decodeURIComponent(stylesheetUrl.slice(expectedBase.length)),
);
for (const font of ["manrope", "space-grotesk", "bravura"])
  if (!stylesheet.includes(`${expectedBase}fonts/${font}.woff2`))
    throw new Error(`${font} font URL is not base-aware`);

console.log(`Verified ${directory} at base ${expectedBase}`);
