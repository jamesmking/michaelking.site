/**
 * Turns Dad's print-ready originals into web masters in src/assets/img/prints/,
 * and writes the real pixel dimensions back into prints.json.
 *
 * Two things the originals need fixing:
 *
 *  - Most are CMYK, straight out of Photoshop's print setup. Browsers render
 *    CMYK JPEGs with badly shifted colours, so everything is converted to sRGB.
 *  - They're 3000–9000px and many megabytes. Resized to a 1600px long edge;
 *    the build then generates smaller responsive variants from these.
 *
 * The originals in Spec2/Images are left alone — they're the archive, and the
 * only thing to go back to if a print ever needs reprinting.
 *
 * Run after import-catalogue.mjs:
 *
 *   node scripts/import-images.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(REPO, "Spec2", "Images");
const OUT = join(REPO, "src/assets/img/prints");
const DATA = join(REPO, "src/_data/prints.json");

const MAX = 1600;

mkdirSync(OUT, { recursive: true });

const prints = JSON.parse(readFileSync(DATA, "utf8"));
let done = 0;
const cmyk = [];
const missing = [];
const wanted = new Set();

for (const print of prints) {
  for (const image of print.images) {
    const from = join(SRC, image.source);
    const to = join(OUT, basename(image.src));
    wanted.add(basename(image.src));

    if (!existsSync(from)) {
      missing.push(`${print.title} → ${image.source}`);
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

writeFileSync(DATA, JSON.stringify(prints, null, 2) + "\n");

// Masters for prints that have since been removed or renamed would otherwise
// sit in the repo forever.
const stale = readdirSync(OUT).filter((f) => f.endsWith(".jpg") && !wanted.has(f));
for (const f of stale) unlinkSync(join(OUT, f));

const shapes = prints.reduce((a, p) => ({ ...a, [p.shape]: (a[p.shape] || 0) + 1 }), {});
console.log(`${done} images written. ${cmyk.length} converted from CMYK to sRGB.`);
if (stale.length) console.log(`${stale.length} stale master(s) removed: ${stale.join(", ")}`);
console.log("shapes:", shapes);
if (missing.length) {
  console.error(`\nNOT FOUND IN Spec2/Images:\n${missing.join("\n")}`);
  process.exit(1);
}
