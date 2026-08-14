/**
 * Responsive <picture> markup for every print, keyed by slug.
 *
 *   {{ pictures[print.slug].card | safe }}
 *   {{ pictures[print.slug].detail[0] | safe }}
 *
 * Why a data file rather than a shortcode: eleventy-img is async, and an async
 * Nunjucks shortcode called from inside an {% include %} renders as nothing at
 * all — silently, with no build error. Card markup is shared by three templates,
 * so it has to live in an include. Generating the HTML here, where async is
 * expected, keeps the templates synchronous and the markup in one place.
 *
 * The masters in src/assets/img/prints/ are 1600px sRGB, made by
 * scripts/import-images.mjs. This makes the delivery sizes from them.
 */

import Image from "@11ty/eleventy-img";
import path from "node:path";
import prints from "./prints.json" with { type: "json" };

// A card is never wider than ~420px; the detail view never wider than ~900px.
// 1200 covers a 2× card and a comfortable detail view.
const WIDTHS = [400, 800, 1200];

const CARD_SIZES = "(min-width: 62rem) 22rem, (min-width: 40rem) 30vw, 45vw";
const DETAIL_SIZES = "(min-width: 62rem) 44rem, 92vw";

async function render(src, { alt, sizes, klass, eager }) {
  const metadata = await Image(path.join("src", src), {
    widths: WIDTHS,
    formats: ["webp", "jpeg"],
    outputDir: "_site/assets/img/prints/",
    urlPath: "/assets/img/prints/",
    sharpJpegOptions: { quality: 78, mozjpeg: true },
    sharpWebpOptions: { quality: 76 },
  });

  return Image.generateHTML(metadata, {
    alt,
    sizes,
    class: klass,
    loading: eager ? "eager" : "lazy",
    decoding: "async",
  });
}

export default async function () {
  const out = {};

  for (const print of prints) {
    if (!print.images.length) {
      out[print.slug] = { card: "", detail: [] };
      continue;
    }

    const [first] = print.images;

    out[print.slug] = {
      card: await render(first.src, {
        alt: print.alt,
        sizes: CARD_SIZES,
        klass: "card__img",
        eager: false,
      }),
      detail: await Promise.all(
        print.images.map((image, i) =>
          render(image.src, {
            alt: print.alt,
            sizes: DETAIL_SIZES,
            klass: "print__img",
            // The first detail image is the largest thing above the fold.
            eager: i === 0,
          })
        )
      ),
    };
  }

  return out;
}
