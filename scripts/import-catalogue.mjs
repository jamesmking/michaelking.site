/**
 * One-time import: reconciles "New Text for Website.pdf" against ~/Downloads/JPEG Images.
 *
 * Each row is the product list line as Dad wrote it, mapped to the image file(s)
 * that belong to it. Re-run when he fills the gaps; it rewrites src/_data/prints.json
 * and CATALOGUE-GAPS.md, and fails loudly if a named image isn't on disk.
 *
 *   node import-catalogue.mjs
 *
 * Columns: [title, category, sub, files, options, note, needs]
 *   options — [size, frame, price]. price null = Dad hasn't given one.
 *   needs   — gaps to chase: "price", "image", "size", "which-image"
 */

import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SRC = join(homedir(), "Downloads", "JPEG Images");
const REPO = "/Users/jamesking/Development/Development/michaelking.site";

const P = (size, frame, price) => ({ size, frame, price });

// ---------------------------------------------------------------------------
// The catalogue, in Dad's order.
// ---------------------------------------------------------------------------

const ROWS = [
  // ----- MUSIC ------------------------------------------------------------
  ["The Specials 1980 Tour", "music", "gig-posters", ["Specials Tour Poster 1980 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A recreation of the original 1980 UK tour poster."],

  ["2-Tone Dance Craze", "music", "gig-posters", ["2-Tone Dance Craze poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], ""],

  ["Madness 1980 Tour", "music", "gig-posters", ["Madness Poster 1980 Tour 500x700mm.jpg", "Madness 1980 Tour 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "", ["which-image"]],

  ["B.B. King", "music", "gig-posters", ["BB KING Poster 3 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A recreation of the original."],

  ["Beatles 60s Cartoon", "music", "records-promo", ["Beatles 60s Cartoon 500x700mm.jpg"],
    [P("500 × 700mm", "Silver", 35)], ""],

  ["Bob Dylan — Manchester Free Trade Hall 1966", "music", "gig-posters", ["Bob In Manchester 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", null)],
    "A recreation of the original poster from the Manchester Free Trade Hall, 1966 — the night Dylan went electric.",
    ["price", "which-image"]],

  ["Bob Dylan in New York", "music", "gig-posters", ["Bob Dylan in New York 2 500x700mm.jpg"],
    [P("500 × 700mm", "Silver", 35)], "A recreation of the original 1964 poster."],

  ["Bob Marley — Lyceum Theatre 1975", "music", "gig-posters", ["Bob Marley Poster 500x700mm.jpg"],
    [P("594 × 841mm", "Framed", 45)],
    "An imagined poster for the two legendary sold-out shows at London's Lyceum Theatre, 17 and 18 July 1975.",
    ["size", "which-image"]],

  ["Bob Marley & The Wailers", "music", "gig-posters", ["Bob Marley 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "", ["which-image"]],

  ["Chuck Berry", "music", "gig-posters", ["Chuck Berry Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", null)],
    "After the 2008 poster. Original design and layout by Jerry Clayworth.", ["price"]],

  ["Van Morrison", "music", "gig-posters", ["Van Morrison 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35), P("594 × 841mm", "Framed", 45)],
    "A recreation of the 1971 event poster."],

  ["A Hard Day's Night", "music", "records-promo", ["Hard Days Night Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Silver", 35)],
    "A recreation of the original film poster.", ["duplicate-listing"]],

  ["The Rat Pack", "music", "records-promo", ["Rat Pack Poster 508 x 508 mm.jpg"],
    [P("508 × 508mm", "Framed", 35)],
    "A recreation of a record promo in the mid-century style.", ["duplicate-listing"]],

  ["Anarchy in the UK", "music", "gig-posters", ["Anarchy In The UK Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Black", 35)], "A recreation of the notorious original."],

  ["Filthy Lucre Tour 1996", "music", "gig-posters", ["Filthy Lucre Tour 1996 500x700mm.jpg"],
    [P("500 × 700mm", "Black", 35)], ""],

  ["Woodstock", "music", "gig-posters", ["Woodstock Poster 594 x 840mm.jpg"],
    [P("594 × 841mm", "Black", 40)], ""],

  ["Sam Cooke", "music", "gig-posters", ["Sam Cooke 500x700mm.jpg"],
    [P("594 × 841mm", "Framed", null)], "A recreation of a 60s poster.", ["price", "size"]],

  ["The Clash — 1982", "music", "gig-posters", ["The Clash Poster 1982 500x700mm.jpg"],
    [P("500 × 700mm", "Black", 35)], "An original creation for an actual 1982 gig."],

  ["Jimi Hendrix — 1968", "music", "gig-posters", ["Hendrix 1968 Gig 500x700mm.jpg"],
    [P("500 × 700mm", "Black, with glass", 45)], "An original design."],

  ["Jimi Hendrix — 1967", "music", "gig-posters", ["Hendrix Poster 1967 Gig 500 x 700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A recreation of the 1967 gig poster with a new design."],

  ["Stevie Wonder", "music", "gig-posters", ["Stevie Wonder Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 30)], "A recreation of an original."],

  ["David Bowie — Oxford 1973", "music", "gig-posters", ["David Bowie Poster Oxford 400 x 500mm.jpg"],
    [P("500 × 700mm", "Black, mounted", 35), P("400 × 500mm", "Silver, mounted", 30)], ""],

  ["For the Benefit of Mr Kite", "music", "records-promo", ["Mr Kite Poster 230 x 500mm.tif"],
    [P("280 × 550mm", "Framed", 35)],
    "A reproduction of the original poster that inspired John Lennon to write the song, from Sgt. Pepper's Lonely Hearts Club Band (1967).",
    ["size"]],

  ["New York Jazz", "music", "gig-posters", ["New York Jazz poster 594 x 841mm.jpg"],
    [P("594 × 841mm", "Framed", 40)], "A recreation of the original."],

  ["Stones No Filter — Poster 1", "music", "gig-posters", ["Stones No Filter Poster 1 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", null)], "From the No Filter tour, 2017.", ["price"]],

  ["Stones No Filter — Europe", "music", "gig-posters", ["Stones No Filter Europe 2 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", null)], "From the No Filter tour, 2017.", ["price"]],

  ["Stones No Filter — Square", "music", "gig-posters", ["Stones No Filter Poster 500x500mm.jpg"],
    [P("500 × 500mm", "Framed", null)], "From the No Filter tour, 2017.", ["price"]],

  // ----- SCREEN & STAGE : FILM -------------------------------------------
  ["Cabaret", "screen-stage", "film", ["Cabaret Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], ""],

  ["The Blues Brothers", "screen-stage", "film", ["Blues Brothers Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], ""],

  ["A Clockwork Orange — Film Poster 1", "screen-stage", "film", ["Clockwork Orange 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], ""],

  ["Reservoir Dogs", "screen-stage", "film", ["Reservoir Dogs  500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35), P("594 × 841mm", "Framed", 40)], ""],

  ["A Clockwork Orange — Film Poster 2", "screen-stage", "film", ["Clockwork Poster 500x700mm_converted.jpg"],
    [P("500 × 700mm", "Framed", 30)], ""],

  // ----- SCREEN & STAGE : THEATRE ----------------------------------------
  ["Holborn Empire", "screen-stage", "theatre", ["Holborn Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", null)], "A recreation of an old theatre poster.", ["price"]],

  ["Vaudeville", "screen-stage", "theatre", ["Vaudeville Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", null)], "", ["price"]],

  ["Beyond the Fringe", "screen-stage", "theatre", ["Beyond The Fringe 2 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A recreation for the Broadway run, 1962–64."],

  ["Frank Sinatra — London Palladium", "screen-stage", "theatre", ["Frank Sinatra 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], ""],

  ["Les Misérables", "screen-stage", "theatre", ["Les Mis Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A recreation in the style of the original."],

  ["Max Miller — London Palladium", "screen-stage", "theatre", ["Max Miller Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "", ["moved-from-books"]],

  ["West Side Story", "screen-stage", "theatre", [],
    [P("500 × 700mm", "Framed", 35)], "", ["image", "moved-from-books"]],

  // ----- BOOKS & COMICS ---------------------------------------------------
  ["1984 — Book Cover", "books-comics", "book-covers", ["1984 Cover 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 30)], "A recreation of the book cover. One of three versions."],

  ["1984 — Eye", "books-comics", "book-covers", ["1984 Eye Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A recreation of the book cover. One of three versions."],

  ["1984 — Poster", "books-comics", "book-covers", ["1984 Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A recreation of the book cover. One of three versions."],

  ["1984 — TV Poster", "books-comics", "book-covers", ["1984 TV Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Black", 35)], "An original design."],

  ["Animal Farm", "books-comics", "book-covers", ["Animal Farm Cover 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A recreation of the book cover."],

  ["Brave New World", "books-comics", "book-covers", ["Brave New World Cover 500x700mm.jpg"],
    [P("500 × 700mm", "Black", 35)], "An amended Penguin book cover.", ["size"]],

  ["A Clockwork Orange — Book Cover", "books-comics", "book-covers", ["A Clockwork Orange Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Black", 25)], ""],

  ["Desperate Dan", "books-comics", "comics", ["Desperate Dan Poster 700x1000mm.jpg", "Desperate Dan Poster 500 x 700mm.jpg"],
    [P("700 × 1000mm", "White", 45), P("500 × 700mm", "White", 35)], ""],

  // ----- POP ART : LICHTENSTEIN STYLE ------------------------------------
  ["Brad Darling", "pop-art", "lichtenstein", ["Brad Darling Poster 2 500x500mm.jpg"],
    [P("500 × 500mm", "Framed", 5)], "", ["price"]],

  ["Go To Him Mandy!", "pop-art", "lichtenstein", ["Go To Him Mandy!.jpg"],
    [P("500 × 500mm", "Framed", 35)], ""],

  ["Whaam!", "pop-art", "lichtenstein", ["Whaam Poster 1.jpg", "Whaam! Poster 2.jpg"],
    [P("400 × 500mm", "Framed", 40)], "Two images, hung as a diptych."],

  ["Oh! Jeff", "pop-art", "lichtenstein", ["Oh! Jeff Poster 508x508mm.jpg"],
    [P("508 × 508mm", "Framed", 35)], ""],

  ["I Forgot to Have Babies", "pop-art", "lichtenstein", ["Girl Crying - Babies.jpg"],
    [P("500 × 700mm", "Framed", 35)], ""],

  ["Give Up Dick", "pop-art", "lichtenstein", ["Give Up Dick 1 Picture 500 x 500mm.jpg"],
    [P("500 × 500mm", "Framed", 35)], ""],

  ["Summer Was a Blur of Tears", "pop-art", "lichtenstein", ["Summer Blur of Tears.jpg"],
    [P("500 × 700mm", "Framed", null)], "", ["price"]],

  ["Superwoman", "pop-art", "lichtenstein", ["Superwoman 594x841mm.jpg"],
    [P("594 × 841mm", "Black", 45)], ""],

  ["Satisfaction", "pop-art", "lichtenstein", ["Satifaction 508x508mm.jpg"],
    [P("508 × 508mm", "Framed", null)], "An original artwork creation.", ["price"]],

  ["The Kiss", "pop-art", "lichtenstein", ["The Kiss 500x500mm.jpg"],
    [P("500 × 500mm", "Framed", null)], "", ["price"]],

  ["Oh, I Couldn't", "pop-art", "lichtenstein", ["Oh I Coudn't 500x500mm.jpg", "Oh! I coudn't 2.jpg"],
    [P("500 × 500mm", "Black", 35)], "“If your promise…”", ["which-image"]],

  ["Nurse", "pop-art", "lichtenstein", ["Nurse 500 x 500.jpg", "Lichtenstein Nurse Caption 508x508.jpg"],
    [P("500 × 500mm", "Framed", 35)], "“Just another day pretending to be normal.”", ["which-image"]],

  ["Sweet Dreams Baby", "pop-art", "lichtenstein", ["Sweet Dreams Baby 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", null)], "", ["price"]],

  // ----- POP ART : OTHER --------------------------------------------------
  ["Mickey Mouse BOOM!", "pop-art", "other", ["BOOM! 500 x 700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "A vintage recreation."],

  ["Keith Haring", "pop-art", "other", ["Keith Haring 500 x 700mm.jpg"],
    [P("500 × 700mm", "Framed", 35)], "An amalgam."],

  // ----- POP ART : SUPER HEROES (no images supplied) ----------------------
  ["Batman", "pop-art", "super-heroes", [], [P("400 × 500mm", "Framed", 25)], "", ["image"]],
  ["Robin", "pop-art", "super-heroes", [], [P("400 × 500mm", "Framed", 25)], "", ["image"]],
  ["The Joker", "pop-art", "super-heroes", [], [P("400 × 500mm", "Framed", 25)], "", ["image"]],
  ["Superman", "pop-art", "super-heroes", [], [P("400 × 500mm", "Framed", 25)], "", ["image"]],
  ["Wonder Woman", "pop-art", "super-heroes", [], [P("400 × 500mm", "Framed", 25)], "", ["image"]],

  // ----- VINTAGE & EPHEMERA ----------------------------------------------
  ["Che", "vintage", null, ["Che Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Silver", null)], "", ["price"]],

  ["Beatles Tickets", "vintage", null, ["Beatles Ticket 1 203 x 508mm.jpg", "Beatles Ticket 2 203 x 508mm.jpg"],
    [P("203 × 508mm", "Black", null)],
    "A recreation of two tickets — Indiana 1964 and Washington 1966.", ["price", "one-or-two-products"]],

  ["I Love Vintage", "vintage", null, ["I Love Vintage 600 x 800mm.jpg"],
    [P("600 × 800mm", "Gold", 45)], ""],

  ["Pin-Up", "vintage", null, ["Pin-Up Poster 500x700mm.jpg"],
    [P("500 × 700mm", "Framed", null)], "A recreation of a 50s magazine cover.", ["price"]],
];

// Images sitting in the folder that no line in the list accounts for.
const ORPHANS = [
  "60s Poster 500x700mm.jpg",
  "Bath Festival Poster 500x700mm.jpg",
  "Bob Dylan Poster 500x700mm.jpg",
  "Bob Dylan Poster 86 500x700mm.jpg",
  "Rock Poster 500x700mm.jpg",
  "Skegness 500x700mm.jpg",
  "The Clash London Calling 500x700mm.jpg",
  "The Specials French Poster 500x700mm.jpg",
];

// ---------------------------------------------------------------------------

const slugify = (s) =>
  s.toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/[''"".!?,]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const onDisk = new Set(readdirSync(SRC));
const missing = [];

const prints = ROWS.map(([title, category, sub, files, options, note = "", needs = []]) => {
  const slug = slugify(title);

  files.forEach((f) => { if (!onDisk.has(f)) missing.push(`${title} → ${f}`); });

  const images = files.map((f, i) => ({
    src: `/assets/img/prints/${slug}${i ? `-${i + 1}` : ""}.jpg`,
    source: f,
  }));

  const prices = options.map((o) => o.price).filter((p) => p !== null);

  return {
    id: slug,
    slug,
    title,
    category,
    sub,
    options,
    priceFrom: prices.length ? Math.min(...prices) : null,
    images,
    alt: `${title} — framed print`,
    note,
    needs,
  };
});

// --- gaps report -----------------------------------------------------------

const by = (k) => prints.filter((p) => p.needs.includes(k));
const line = (p) => `- **${p.title}** — ${p.category}${p.sub ? ` / ${p.sub}` : ""}`;

const gaps = `# Catalogue gaps

Generated from *New Text for Website.pdf* and the 79 files in \`JPEG Images\`.
${prints.length} products matched. Everything below needs a decision before launch.

## 1. No price given (${by("price").length})

${by("price").map(line).join("\n")}

## 2. No image supplied (${by("image").length})

${by("image").map(line).join("\n")}

The five Super Heroes are a whole section with nothing to show.

## 3. Two files, one listing — which is it? (${by("which-image").filter((p) => p.images.length > 1).length})

Both are currently shown on the page. Say which to keep, or whether they're
two different prints that each need their own listing and price.

${by("which-image").filter((p) => p.images.length > 1).map((p) => `- **${p.title}** — \`${p.images.map((i) => i.source).join("`  vs  `")}\``).join("\n")}

## 3b. Guessed which file goes with which listing (${by("which-image").filter((p) => p.images.length === 1).length})

Two listings, two similarly named files, no obvious pairing. These are a guess
— worth eyeballing the pages to check they're the right way round.

${by("which-image").filter((p) => p.images.length === 1).map((p) => `- **${p.title}** — currently \`${p.images[0].source}\``).join("\n")}

## 4. Images with no entry in the list (${ORPHANS.length})

${ORPHANS.map((f) => `- \`${f}\``).join("\n")}

Are these for sale, or were they sent for reference?

## 5. Size disagrees with the filename (${by("size").length})

${prints.filter((p) => p.needs.includes("size")).map((p) => `- **${p.title}** — list says ${p.options.map((o) => o.size).join(", ")}, file is named differently`).join("\n")}

## 6. Listed twice

- **A Hard Day's Night** — under both Music and Film.
- **The Rat Pack** — under both Music and Miscellaneous.

Listed once each here, in Music.

## 7. Also worth confirming

- **Brad Darling** is priced at £5. Every comparable print is £35 — assumed typo, currently £5 in the data.
- **"Frame or Print needed"** heads the list. If print-only is an option, it needs its own prices — none given.
- **Max Miller** and **West Side Story** were filed under Book Covers; moved to Theatre.
- **Mr Kite** is a 63MB \`.tif\` — converted on import.
- Stock and edition sizes aren't mentioned anywhere. Nothing shows as "sold out"; everything reads as available to order.
`;

writeFileSync(join(REPO, "CATALOGUE-GAPS.md"), gaps);
writeFileSync(join(REPO, "src/_data/prints.json"), JSON.stringify(prints, null, 2) + "\n");

const matched = new Set(ROWS.flatMap((r) => r[3]));
console.log(`${prints.length} products written.`);
console.log(`${matched.size} images matched, ${ORPHANS.length} orphaned, ${onDisk.size} on disk.`);
console.log(`Gaps: ${by("price").length} without price, ${by("image").length} without image.`);
if (missing.length) {
  console.error(`\nNOT FOUND ON DISK:\n${missing.join("\n")}`);
  process.exit(1);
}

// This file writes the catalogue but not the image dimensions or shapes — those
// come from the image import, and the build needs them. Running only this one
// leaves prints.json half-populated, so don't let that pass quietly.
console.log("\nNow run `npm run import:images` — this script doesn't write");
console.log("image dimensions, and the templates need them.");
