/**
 * Turns Dad's print-ready originals into web masters in src/assets/img/prints/,
 * and writes the real pixel dimensions back into prints.json.
 *
 * Two things the originals need fixing:
 *
 *  - They're CMYK, straight out of Photoshop's print setup. Browsers render
 *    CMYK JPEGs with badly shifted colours, so everything is converted to sRGB.
 *  - They're 3000–9000px and up to 63MB. Resized to a 1600px long edge; the
 *    build then generates smaller responsive variants from these.
 *
 * The originals in ~/Downloads are left alone — they're the archive, and the
 * only thing to go back to if a print ever needs reprinting.
 *
 *   node import-images.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import sharp from "sharp";

const SRC = join(homedir(), "Downloads", "JPEG Images");
const REPO = "/Users/jamesking/Development/Development/michaelking.site";
const OUT = join(REPO, "src/assets/img/prints");

const MAX = 1600;

mkdirSync(OUT, { recursive: true });

const prints = JSON.parse(readFileSync(join(REPO, "src/_data/prints.json"), "utf8"));
let done = 0;
const cmyk = [];

for (const print of prints) {
  for (const image of print.images) {
    const from = join(SRC, image.source);
    const to = join(OUT, basename(image.src));

    if (!existsSync(from)) {
      console.error(`missing source: ${image.source}`);
      continue;
    }

    if ((await sharp(from).metadata()).space === "cmyk") cmyk.push(image.source);

    const { width, height } = await sharp(from)
      .rotate()                                   // honour any EXIF orientation
      .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
      .toColourspace("srgb")
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(to);

    image.width = width;
    image.height = height;
    done++;
  }

  // The grid needs each print's shape before the image loads, so it can
  // reserve the right box. The collection is a genuine mix.
  const first = print.images[0];
  print.shape = !first
    ? "portrait"
    : first.width / first.height > 1.15 ? "landscape"
    : first.height / first.width > 1.9 ? "tall"
    : Math.abs(first.width - first.height) / first.width < 0.1 ? "square"
    : "portrait";
}

writeFileSync(join(REPO, "src/_data/prints.json"), JSON.stringify(prints, null, 2) + "\n");

const shapes = prints.reduce((a, p) => ({ ...a, [p.shape]: (a[p.shape] || 0) + 1 }), {});
console.log(`${done} images written. ${cmyk.length} converted from CMYK to sRGB.`);
console.log("shapes:", shapes);
