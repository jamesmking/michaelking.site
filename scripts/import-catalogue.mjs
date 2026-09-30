/**
 * Rebuilds the catalogue from Dad's Numbers spreadsheet.
 *
 *   Spec2/Poster Product List.numbers   →  src/_data/prints.json
 *                                          CATALOGUE-GAPS.md
 *
 * The spreadsheet is the source of truth for names, sizes, prices, frames and
 * descriptions. This script only adds what a spreadsheet can't carry: which
 * image file(s) belong to each row, which section of the site it lives in,
 * and a stable id. That lives in MAP below, keyed by the exact "Poster Name"
 * in the sheet, so a renamed row fails loudly rather than silently dropping
 * off the site.
 *
 * Run it after he sends a new spreadsheet:
 *
 *   npm run import:catalogue      # exports the .numbers via Numbers.app, then imports
 *   npm run import:images         # re-processes the originals, writes dimensions back
 *
 * Or point it at a CSV you've already exported:
 *
 *   node scripts/import-catalogue.mjs --csv path/to/Posters-Table\ 1.csv
 *
 * The sheet has one row per size, so a print sold in two sizes is two rows
 * with the same name — they're merged into one print with two options.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const NUMBERS = join(REPO, "Spec2", "Poster Product List.numbers");
const IMAGES = join(REPO, "Spec2", "Images");

// ---------------------------------------------------------------------------
// Where each row of the sheet goes on the site.
//
//   "Poster Name in the sheet": { slug, title, category, sub, files, note? }
//
// slug   — the URL and the id. Never change one once a print has sold; it's
//          how past enquiries match up.
// title  — what the site shows. The sheet's names are Dad's working names
//          ("BB King Poster"); these are tidied for customers.
// files  — image(s) in Spec2/Images. Two files = shown as a pair.
// note   — overrides the sheet's Description where his shorthand needs a
//          full sentence. Leave out to use the sheet's text.
//
// A row can also map to an array of prints (the 1984 covers are one row in
// the sheet but three different designs).
// ---------------------------------------------------------------------------

const MAP = {
  // ----- MUSIC : gig posters ----------------------------------------------
  "Specials Tour Poster": {
    slug: "the-specials-1980-tour", title: "The Specials 1980 Tour",
    category: "music", sub: "gig-posters", files: ["Specials Tour Poster 1980 500x700mm.jpg"],
    note: "A recreation of the original 1980 UK tour poster.",
  },
  "The Specials French Poster": {
    slug: "the-specials-french-poster", title: "The Specials — French Poster",
    category: "music", sub: "gig-posters", files: ["The Specials French Poster 500x700mm.jpg"],
  },
  "2-Tone Dance Craze Poster": {
    slug: "2-tone-dance-craze", title: "2-Tone Dance Craze",
    category: "music", sub: "gig-posters", files: ["2-Tone Dance Craze poster 500x700mm.jpg"],
  },
  "Madness Poster 1980 Tour": {
    slug: "madness-1980-tour", title: "Madness 1980 Tour",
    category: "music", sub: "gig-posters", files: ["Madness Poster 1980 Tour 500x700mm.jpg"],
  },
  "2-Tone Tour Poster": {
    slug: "2-tone-tour-1979", title: "2-Tone UK Tour 1979",
    category: "music", sub: "gig-posters", files: ["2-Tone Tour Poster 500x700mm.jpg"],
  },
  "BB King Poster": {
    slug: "bb-king", title: "B.B. King",
    category: "music", sub: "gig-posters", files: ["BB KING Poster 3 500x700mm.jpg"],
    note: "A recreation of the original.",
  },
  "Bob Dylan Poster (Manchester Free Trade Hall 1966)": {
    slug: "bob-dylan-manchester-free-trade-hall-1966", title: "Bob Dylan — Manchester Free Trade Hall 1966",
    category: "music", sub: "gig-posters", files: ["Bob In Manchester 500x700mm.jpg"],
    note: "A recreation of the original poster from the Manchester Free Trade Hall, 1966 — the night Dylan went electric.",
  },
  "Bob Dylan Poster '86": {
    slug: "bob-dylan-86", title: "Bob Dylan ’86",
    category: "music", sub: "gig-posters", files: ["Bob Dylan Poster 86 500x700mm.jpg"],
  },
  "Bob Dylan in New York": {
    slug: "bob-dylan-in-new-york", title: "Bob Dylan in New York",
    category: "music", sub: "gig-posters", files: ["Bob Dylan in New York 2 500x700mm.jpg"],
    note: "A recreation of the original 1964 poster.",
  },
  "Bob Marley Poster (Lyceum 1975)": {
    slug: "bob-marley-lyceum-theatre-1975", title: "Bob Marley — Lyceum Theatre 1975",
    category: "music", sub: "gig-posters", files: ["Bob Marley 500x700mm.jpg"],
    note: "An imagined poster for the two legendary sold-out shows at London's Lyceum Theatre, 17 and 18 July 1975.",
  },
  "Bob Marley The Wailers Poster": {
    slug: "bob-marley-and-the-wailers", title: "Bob Marley & The Wailers — Uprising Tour",
    category: "music", sub: "gig-posters", files: ["Bob Marley Poster 500x700mm.jpg"],
  },
  "Chuck Berry Poster": {
    slug: "chuck-berry", title: "Chuck Berry",
    category: "music", sub: "gig-posters", files: ["Chuck Berry Poster 500x700mm.jpg"],
    note: "After the 2008 poster. Original design and layout by Jerry Clayworth.",
  },
  "Van Morrison Poster": {
    slug: "van-morrison", title: "Van Morrison",
    category: "music", sub: "gig-posters", files: ["Van Morrison 500x700mm.jpg"],
    note: "A recreation of the 1971 event poster.",
  },
  "Anarchy In The UK Poster": {
    slug: "anarchy-in-the-uk", title: "Anarchy in the UK",
    category: "music", sub: "gig-posters", files: ["Anarchy In The UK Poster 500x700mm.jpg"],
    note: "A recreation of the notorious original.",
  },
  "Filthy Lucre Tour 1996": {
    slug: "filthy-lucre-tour-1996", title: "Filthy Lucre Tour 1996",
    category: "music", sub: "gig-posters", files: ["Filthy Lucre Tour 1996 500x700mm.jpg"],
  },
  "Woodstock Poster": {
    slug: "woodstock", title: "Woodstock",
    category: "music", sub: "gig-posters", files: ["Woodstock Poster 594 x 840mm.jpg"],
  },
  "Sam Cooke Poster": {
    slug: "sam-cooke", title: "Sam Cooke",
    category: "music", sub: "gig-posters", files: ["Sam Cooke 500x700mm.jpg"],
    note: "A recreation of a 60s poster.",
  },
  "The Clash Poster (1982 Gig)": {
    slug: "the-clash-1982", title: "The Clash — 1982",
    category: "music", sub: "gig-posters", files: ["The Clash Poster 1982 500x700mm.jpg"],
    note: "An original creation for an actual 1982 gig.",
  },
  "Jimi Hendrix 1968 Gig": {
    slug: "jimi-hendrix-1968", title: "Jimi Hendrix — 1968",
    category: "music", sub: "gig-posters", files: ["Hendrix 1968 Gig 500x700mm.jpg"],
    note: "An original design.",
  },
  "Hendrix Poster 1967 Gig": {
    slug: "jimi-hendrix-1967", title: "Jimi Hendrix — 1967",
    category: "music", sub: "gig-posters", files: ["Hendrix Poster 1967 Gig 500 x 700mm.jpg"],
    note: "A recreation of the 1967 gig poster with a new design.",
  },
  "Stevie Wonder Poster": {
    slug: "stevie-wonder", title: "Stevie Wonder",
    category: "music", sub: "gig-posters", files: ["Stevie Wonder Poster 500x700mm.jpg"],
    note: "A recreation of an original.",
  },
  "David Bowie Poster Oxford 1973": {
    slug: "david-bowie-oxford-1973", title: "David Bowie — Oxford 1973",
    category: "music", sub: "gig-posters", files: ["David Bowie Poster Oxford 400 x 500mm.jpg"],
  },
  "New York Jazz Poster": {
    slug: "new-york-jazz", title: "New York Jazz",
    category: "music", sub: "gig-posters", files: ["New York Jazz poster 594 x 841mm.jpg"],
    note: "A recreation of the original.",
  },
  "Rock Poster 'Tune in Turn Loud'": {
    slug: "tune-in-turn-loud", title: "Tune In, Turn Loud",
    category: "music", sub: "gig-posters", files: ["Rock Poster 500x700mm.jpg"],
  },
  "Alan Freed 'Big Beat' 60s Poster": {
    slug: "alan-freed-big-beat", title: "Alan Freed — The Big Beat",
    category: "music", sub: "gig-posters", files: ["60s Poster 500x700mm.jpg"],
  },
  "Bath Festival Poster": {
    slug: "bath-festival", title: "Bath Festival",
    category: "music", sub: "gig-posters", files: ["Bath Festival Poster 500x700mm.jpg"],
    note: "A recreation of the event poster, in a similar style to the original.",
  },

  // ----- MUSIC : records & promo ------------------------------------------
  "Beatles 60s Cartoon": {
    slug: "beatles-60s-cartoon", title: "Beatles 60s Cartoon",
    category: "music", sub: "records-promo", files: ["Beatles 60s Cartoon 500x700mm.jpg"],
  },
  "Rat Pack Poster": {
    slug: "the-rat-pack", title: "The Rat Pack",
    category: "music", sub: "records-promo", files: ["Rat Pack Poster 508 x 508 mm.jpg"],
    note: "A recreation of a record promo in the mid-century style.",
  },
  "The Clash Poster London Calling": {
    slug: "the-clash-london-calling", title: "The Clash — London Calling",
    category: "music", sub: "records-promo", files: ["The Clash London Calling 500x700mm.jpg"],
  },
  "For the Benefit of Mr Kite Poster": {
    slug: "for-the-benefit-of-mr-kite", title: "For the Benefit of Mr Kite",
    category: "music", sub: "records-promo", files: ["Mr Kite Poster 230 x 500mm.jpg"],
    note: "A reproduction of the original poster that inspired John Lennon to write the song, from Sgt. Pepper's Lonely Hearts Club Band (1967).",
  },

  // ----- MUSIC : Stones No Filter Tour 2017 -------------------------------
  "Stones No Filter Poster 1": {
    slug: "stones-no-filter-poster-1", title: "Stones No Filter — Poster 1",
    category: "music", sub: "stones-no-filter", files: ["Stones No Filter Poster 1 500x700mm.jpg"],
    note: "From the No Filter tour, 2017.",
  },
  "Stones No Filter Europe 2": {
    slug: "stones-no-filter-europe", title: "Stones No Filter — Europe",
    category: "music", sub: "stones-no-filter", files: ["Stones No Filter Europe 2 500x700mm.jpg"],
    note: "From the No Filter tour, 2017.",
  },
  "Stones No Filter Poster (Square)": {
    slug: "stones-no-filter-square", title: "Stones No Filter — Square",
    category: "music", sub: "stones-no-filter", files: ["Stones No Filter Poster 500x500mm.jpg"],
    note: "From the No Filter tour, 2017.",
  },

  // ----- SCREEN & STAGE : film --------------------------------------------
  "Cabaret Poster": {
    slug: "cabaret", title: "Cabaret",
    category: "screen-stage", sub: "film", files: ["Cabaret Poster 500x700mm.jpg"],
  },
  "Blues Brothers Poster": {
    slug: "the-blues-brothers", title: "The Blues Brothers",
    category: "screen-stage", sub: "film", files: ["Blues Brothers Poster 500x700mm.jpg"],
  },
  "Clockwork Orange Film Poster 1": {
    slug: "a-clockwork-orange-film-poster-1", title: "A Clockwork Orange — Film Poster 1",
    category: "screen-stage", sub: "film", files: ["Clockwork Orange 500x700mm.jpg"],
  },
  "Clockwork Orange Film Poster 2": {
    slug: "a-clockwork-orange-film-poster-2", title: "A Clockwork Orange — Film Poster 2",
    category: "screen-stage", sub: "film", files: ["Clockwork Poster 500x700mm_converted.jpg"],
  },
  "Reservoir Dogs": {
    slug: "reservoir-dogs", title: "Reservoir Dogs",
    category: "screen-stage", sub: "film", files: ["Reservoir Dogs  500x700mm.jpg"],
  },
  "Beatles 'A Hard Day's Night' Film Poster": {
    slug: "a-hard-days-night", title: "A Hard Day's Night",
    category: "screen-stage", sub: "film", files: ["Hard Days Night Poster 500x700mm.jpg"],
    note: "A recreation of the original film poster.",
  },

  // ----- SCREEN & STAGE : theatre -----------------------------------------
  "Holborn Poster": {
    slug: "holborn-empire", title: "Holborn Empire",
    category: "screen-stage", sub: "theatre", files: ["Holborn Poster 500x700mm.jpg"],
    note: "A recreation of an old theatre poster.",
  },
  "Vaudeville Poster": {
    slug: "vaudeville", title: "Vaudeville",
    category: "screen-stage", sub: "theatre", files: ["Vaudeville Poster 500x700mm.jpg"],
  },
  "Beyond The Fringe Broadway Show": {
    slug: "beyond-the-fringe", title: "Beyond the Fringe",
    category: "screen-stage", sub: "theatre", files: ["Beyond The Fringe 2 500x700mm.jpg"],
    note: "A recreation for the Broadway run, 1962–64.",
  },
  "Frank Sinatra London Palladium": {
    slug: "frank-sinatra-london-palladium", title: "Frank Sinatra — London Palladium",
    category: "screen-stage", sub: "theatre", files: ["Frank Sinatra 500x700mm.jpg"],
  },
  "Les Mis Poster": {
    slug: "les-mis-rables", title: "Les Misérables",
    category: "screen-stage", sub: "theatre", files: ["Les Mis Poster 500x700mm.jpg"],
    note: "A recreation in the style of the original.",
  },
  "Max Miller Poster London Palladium": {
    slug: "max-miller-london-palladium", title: "Max Miller — London Palladium",
    category: "screen-stage", sub: "theatre", files: ["Max Miller Poster 500x700mm.jpg"],
  },
  "West Side Story": {
    slug: "west-side-story", title: "West Side Story",
    category: "screen-stage", sub: "theatre", files: ["West Side Story Poster New 500x700mm.jpg"],
  },

  // ----- BOOK COVERS ------------------------------------------------------
  "1984 Cover (3 versions)": [
    {
      slug: "1984-book-cover", title: "1984 — Book Cover",
      category: "book-covers", sub: null, files: ["1984 Cover 500x700mm.jpg"],
      note: "A recreation of the book cover. One of three versions.",
    },
    {
      slug: "1984-eye", title: "1984 — Eye",
      category: "book-covers", sub: null, files: ["1984 Eye Poster 500x700mm.jpg"],
      note: "A recreation of the book cover. One of three versions.",
    },
    {
      slug: "1984-poster", title: "1984 — Poster",
      category: "book-covers", sub: null, files: ["1984 Poster 500x700mm.jpg"],
      note: "A recreation of the book cover. One of three versions.",
    },
  ],
  "1984 TV Poster": {
    slug: "1984-tv-poster", title: "1984 — TV Poster",
    category: "book-covers", sub: null, files: ["1984 TV Poster 500x700mm.jpg"],
    note: "An original design.",
  },
  "Animal Farm": {
    slug: "animal-farm", title: "Animal Farm",
    category: "book-covers", sub: null, files: ["Animal Farm Cover 500x700mm.jpg"],
    note: "A recreation of the book cover.",
  },
  "Brave New World": {
    slug: "brave-new-world", title: "Brave New World",
    category: "book-covers", sub: null, files: ["Brave New World Cover 500x700mm.jpg"],
    note: "An amended Penguin book cover.",
  },
  "A Clockwork Orange Book Cover": {
    slug: "a-clockwork-orange-book-cover", title: "A Clockwork Orange — Book Cover",
    category: "book-covers", sub: null, files: ["A Clockwork Orange Poster 500x700mm.jpg"],
  },

  // ----- POP ART (Lichtenstein style) -------------------------------------
  "Brad Darling Poster": {
    slug: "brad-darling", title: "Brad Darling",
    category: "pop-art", sub: null, files: ["Brad Darling Poster 2 500x500mm.jpg"],
  },
  "Go To Him Mandy!": {
    slug: "go-to-him-mandy", title: "Go To Him Mandy!",
    category: "pop-art", sub: null, files: ["Go To Him Mandy!.jpg"],
  },
  "'Whaam!' Poster (Diptych)": {
    slug: "whaam", title: "Whaam!",
    category: "pop-art", sub: null, files: ["Whaam Poster 1.jpg", "Whaam! Poster 2.jpg"],
    note: "Two images, hung as a diptych.",
  },
  "Oh! Jeff Poster": {
    slug: "oh-jeff", title: "Oh! Jeff",
    category: "pop-art", sub: null, files: ["Oh! Jeff Poster 508x508mm.jpg"],
  },
  "Girl Crying - 'I forgot to have babies'": {
    slug: "i-forgot-to-have-babies", title: "I Forgot to Have Babies",
    category: "pop-art", sub: null, files: ["Girl Crying - Babies.jpg"],
  },
  "Give Up Dick Picture": {
    slug: "give-up-dick", title: "Give Up Dick",
    category: "pop-art", sub: null, files: ["Give Up Dick 1 Picture 500 x 500mm.jpg"],
  },
  "Summer Blur of Tears": {
    slug: "summer-was-a-blur-of-tears", title: "Summer Was a Blur of Tears",
    category: "pop-art", sub: null, files: ["Summer Blur of Tears.jpg"],
  },
  "Superwoman": {
    slug: "superwoman", title: "Superwoman",
    category: "pop-art", sub: null, files: ["Superwoman 594x841mm.jpg"],
  },
  "'Satisfaction' - Original Artwork Creation": {
    slug: "satisfaction", title: "Satisfaction",
    category: "pop-art", sub: null, files: ["Satifaction 508x508mm.jpg"],
    note: "An original artwork creation.",
  },
  "The Kiss": {
    slug: "the-kiss", title: "The Kiss",
    category: "pop-art", sub: null, files: ["The Kiss 500x500mm.jpg"],
  },
  "'If your promise...' Oh I Couldn't": {
    slug: "oh-i-couldnt", title: "Oh, I Couldn't",
    category: "pop-art", sub: null, files: ["Oh I Coudn't 500x500mm.jpg"],
    note: "“If your promise means that much, then give up Dick!”",
  },
  "Nurse - 'Just another day pretending to be normal'": {
    slug: "nurse", title: "Nurse",
    category: "pop-art", sub: null, files: ["Nurse 500 x 500.jpg"],
    note: "“Just another day pretending to be normal.”",
  },
  "'Sweet Dreams Baby'": {
    slug: "sweet-dreams-baby", title: "Sweet Dreams Baby",
    category: "pop-art", sub: null, files: ["Sweet Dreams Baby 500x700mm.jpg"],
  },
  "Woman Wow!": {
    slug: "woman-wow", title: "Woman Wow!",
    category: "pop-art", sub: null, files: ["Woman Wow! 508x508mm.jpg"],
  },

  // ----- MISCELLANEOUS ----------------------------------------------------
  "Mickey Mouse BOOM!": {
    slug: "mickey-mouse-boom", title: "Mickey Mouse BOOM!",
    category: "miscellaneous", sub: null, files: ["BOOM! 500 x 700mm.jpg"],
    note: "A vintage recreation.",
  },
  "Che Poster": {
    slug: "che", title: "Che",
    category: "miscellaneous", sub: null, files: ["Che Poster 500x700mm.jpg"],
  },
  "Beatles Tickets": {
    slug: "beatles-tickets", title: "Beatles Tickets",
    category: "miscellaneous", sub: null, files: ["Beatles Ticket 1 203 x 508mm.jpg", "Beatles Ticket 2 203 x 508mm.jpg"],
    note: "A recreation of two tickets — Indiana 1964 and Washington 1966.",
  },
  "Desperate Dan Poster": {
    slug: "desperate-dan", title: "Desperate Dan",
    category: "miscellaneous", sub: null, files: ["Desperate Dan Poster 700x1000mm.jpg", "Desperate Dan Poster 500 x 700mm.jpg"],
  },
  "I Love Vintage": {
    slug: "i-love-vintage", title: "I Love Vintage",
    category: "miscellaneous", sub: null, files: ["I Love Vintage 600 x 800mm.jpg"],
  },
  "Keith Haring Amalgam": {
    slug: "keith-haring", title: "Keith Haring",
    category: "miscellaneous", sub: null, files: ["Keith Haring 500 x 700mm.jpg"],
    note: "An amalgam.",
  },
  "Pin-Up Poster": {
    slug: "pin-up", title: "Pin-Up",
    category: "miscellaneous", sub: null, files: ["Pin-Up Poster 500x700mm.jpg"],
    note: "A recreation of a 50s magazine cover.",
  },
  "Skegness 'It's so Bracing'": {
    slug: "skegness", title: "Skegness — It’s So Bracing",
    category: "miscellaneous", sub: null, files: ["Skegness 500x700mm.jpg"],
  },
};

// Rows in the sheet that are the same print as another row. The sheet flags
// these itself ("Possible duplicate of …"); this is the decision. The row on
// the left is folded into the print on the right and its price checked.
const SAME_AS = {
  // Listed under both Music and Film. It's a film poster — one page, under Film.
  "Hard Day's Night Poster": "Beatles 'A Hard Day's Night' Film Poster",
  // Same print, named two ways. There's only one image.
  "Girl Crying - 'Summer was a blur of tears'": "Summer Blur of Tears",
};

// Files in Spec2/Images that are a second copy of a print already listed,
// at a different crop. Not for sale separately; kept for the record.
const DUPLICATE_FILES = {
  "Bob Dylan Poster 500x700mm.jpg": "bob-dylan-manchester-free-trade-hall-1966",
  "Oh! I coudn't 2.jpg": "oh-i-couldnt",
  "Lichtenstein Nurse Caption 508x508.jpg": "nurse",
};

// ---------------------------------------------------------------------------
// 1. Get the sheet as CSV.
// ---------------------------------------------------------------------------

function exportCSV() {
  const out = join(tmpdir(), "michaelking-catalogue-export");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const target = join(out, "export.csv");

  // Numbers writes a folder of one CSV per sheet when there's more than one.
  const script = `
    set src to POSIX file "${NUMBERS}"
    set dst to POSIX file "${target}"
    tell application "Numbers"
      set doc to open src
      export doc to dst as CSV
      close doc saving no
    end tell`;
  execFileSync("osascript", ["-e", script], { stdio: "inherit" });

  const sheets = existsSync(target) && readdirSync(target).filter((f) => f.endsWith(".csv"));
  const posters = sheets && sheets.find((f) => f.startsWith("Posters"));
  if (!posters) throw new Error(`Export didn't produce a "Posters" sheet in ${target}`);
  return join(target, posters);
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

const argCsv = process.argv.indexOf("--csv");
const csvPath = argCsv > -1 ? process.argv[argCsv + 1] : exportCSV();
const [header, ...lines] = parseCSV(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));

const col = (name) => {
  const i = header.findIndex((h) => h.trim().toLowerCase().startsWith(name));
  if (i < 0) throw new Error(`No "${name}" column in ${csvPath}. Columns: ${header.join(" | ")}`);
  return i;
};
const C = {
  name: col("poster name"), category: col("category"), size: col("size"),
  price: col("price"), frame: col("frame"), description: col("description"),
  query: col("missing"),
};

// ---------------------------------------------------------------------------
// 2. Normalise each row.
// ---------------------------------------------------------------------------

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

/** "500 x 700 mm" → "500 × 700mm" */
const size = (s) => {
  const m = clean(s).match(/(\d+)\s*[x×]\s*(\d+)\s*mm/i);
  return m ? `${m[1]} × ${m[2]}mm` : clean(s);
};

/** "£35" → 35. Anything else → null, which renders as "Price on enquiry". */
const price = (s) => {
  const m = clean(s).match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

/** "Black Frame" / "Black Frames" → "Black frame"; "Framed (colour not stated)" → "Framed". */
const frame = (s) => {
  let f = clean(s).replace(/\s*\(colour not stated\)/i, "").replace(/\bframes\b/i, "frame");
  f = f.toLowerCase();
  return f ? f[0].toUpperCase() + f.slice(1) : "Framed";
};

/** Sheet descriptions are shorthand; give them a capital and a full stop. */
const sentence = (s) => {
  const t = clean(s);
  if (!t) return "";
  const cap = t[0].toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(cap) ? cap : `${cap}.`;
};

const rows = lines.map((r) => ({
  name: clean(r[C.name]),
  category: clean(r[C.category]),
  size: size(r[C.size]),
  price: price(r[C.price]),
  frame: frame(r[C.frame]),
  description: sentence(r[C.description]),
  query: clean(r[C.query]),
}));

// ---------------------------------------------------------------------------
// 3. Group rows into prints and join with MAP.
// ---------------------------------------------------------------------------

const problems = [];
const grouped = new Map(); // primary sheet name → { rows, mergedFrom }

for (const row of rows) {
  const key = SAME_AS[row.name] || row.name;
  if (!grouped.has(key)) grouped.set(key, { rows: [], mergedFrom: [] });
  const g = grouped.get(key);
  g.rows.push(row);
  if (key !== row.name) g.mergedFrom.push(row.name);
}

for (const name of Object.keys(MAP)) {
  if (!grouped.has(name)) problems.push(`MAP has "${name}" but the sheet doesn't. Renamed? Update MAP.`);
}
for (const name of Object.keys(SAME_AS)) {
  if (!grouped.has(SAME_AS[name])) problems.push(`SAME_AS points "${name}" at "${SAME_AS[name]}", which isn't in the sheet.`);
}

const onDisk = new Set(readdirSync(IMAGES).filter((f) => !f.startsWith(".")));
const used = new Set();
const prints = [];

for (const [name, { rows: group, mergedFrom }] of grouped) {
  const mapped = MAP[name];
  if (!mapped) {
    problems.push(`Sheet has "${name}" (${group[0].category}) but MAP doesn't. Add it — image, section, slug.`);
    continue;
  }

  // One row per size in the sheet. Same size twice = a merged duplicate; keep one.
  const options = [];
  for (const r of group) {
    const dup = options.find((o) => o.size === r.size);
    if (dup) {
      if (dup.price !== r.price) problems.push(`"${name}": merged rows disagree on price (£${dup.price} vs £${r.price}).`);
      if (dup.frame !== r.frame) problems.push(`"${name}": merged rows disagree on frame (${dup.frame} vs ${r.frame}).`);
      continue;
    }
    options.push({ size: r.size, frame: r.frame, price: r.price });
  }

  const queries = [...new Set(group.map((r) => r.query).filter(Boolean))];
  const description = group.map((r) => r.description).find(Boolean) || "";

  for (const entry of [].concat(mapped)) {
    for (const f of entry.files) {
      if (!onDisk.has(f)) problems.push(`"${entry.title}": image not in Spec2/Images: ${f}`);
      if (used.has(f)) problems.push(`Image used twice: ${f}`);
      used.add(f);
    }

    const prices = options.map((o) => o.price).filter((p) => p !== null);

    prints.push({
      id: entry.slug,
      slug: entry.slug,
      title: entry.title,
      listName: name,
      category: entry.category,
      sub: entry.sub,
      options,
      priceFrom: prices.length ? Math.min(...prices) : null,
      images: entry.files.map((f, i) => ({
        src: `/assets/img/prints/${entry.slug}${i ? `-${i + 1}` : ""}.jpg`,
        source: f,
      })),
      alt: `${entry.title} — framed print`,
      note: entry.note ?? description,
      queries,
      mergedFrom,
    });
  }
}

for (const f of Object.keys(DUPLICATE_FILES)) {
  if (!onDisk.has(f)) problems.push(`DUPLICATE_FILES lists ${f} but it isn't in Spec2/Images.`);
  if (used.has(f)) problems.push(`DUPLICATE_FILES lists ${f} but MAP uses it too.`);
}
const unaccounted = [...onDisk].filter((f) => !used.has(f) && !(f in DUPLICATE_FILES));
for (const f of unaccounted) problems.push(`Image in Spec2/Images with no row in the sheet: ${f}`);

// Slugs must be unique — they're the URLs.
const seen = new Set();
for (const p of prints) {
  if (seen.has(p.slug)) problems.push(`Two prints with slug "${p.slug}".`);
  seen.add(p.slug);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n\n${problems.map((p) => `  - ${p}`).join("\n")}\n`);
  process.exit(1);
}

// Keep sheet order within each section, but present the sections in site order.
const categories = JSON.parse(readFileSync(join(REPO, "src/_data/categories.json"), "utf8"));
const order = new Map(categories.flatMap((c, ci) =>
  [[`${c.slug}/`, ci * 100], ...c.subs.map((s, si) => [`${c.slug}/${s.slug}`, ci * 100 + si + 1])]
));
for (const p of prints) {
  const key = `${p.category}/${p.sub || ""}`;
  if (!order.has(key)) problems.push(`"${p.title}" is in ${key}, which isn't in categories.json.`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
prints.sort((a, b) => order.get(`${a.category}/${a.sub || ""}`) - order.get(`${b.category}/${b.sub || ""}`));

// Carry image dimensions and shapes over from the last image import, so a
// catalogue-only re-run doesn't leave the build without them.
const previousPath = join(REPO, "src/_data/prints.json");
if (existsSync(previousPath)) {
  const previous = new Map(JSON.parse(readFileSync(previousPath, "utf8")).map((p) => [p.slug, p]));
  for (const p of prints) {
    const old = previous.get(p.slug);
    if (!old) continue;
    for (const img of p.images) {
      const o = old.images.find((x) => x.source === img.source);
      if (o?.width) { img.width = o.width; img.height = o.height; }
    }
    if (old.shape && p.images.every((i) => i.width)) p.shape = old.shape;
  }
}

writeFileSync(previousPath, JSON.stringify(prints, null, 2) + "\n");

// ---------------------------------------------------------------------------
// 4. Gaps report — the sheet's own queries, plus what this import decided.
// ---------------------------------------------------------------------------

const catTitle = (p) => {
  const c = categories.find((x) => x.slug === p.category);
  const s = c?.subs.find((x) => x.slug === p.sub);
  return s ? `${c.title} / ${s.title}` : c?.title || p.category;
};
const withQueries = prints.filter((p) => p.queries.length);
const noPrice = prints.filter((p) => p.priceFrom === null);
const noImage = prints.filter((p) => !p.images.length);

const gaps = `# Catalogue gaps

Generated by \`npm run import:catalogue\` from *Spec2/Poster Product List.numbers*
(${rows.length} rows) and the ${onDisk.size} files in \`Spec2/Images\`.
${prints.length} prints on the site. Every one has a price and an image.

## 1. Queries carried over from the spreadsheet (${withQueries.length})

The "Missing / Query" column, as written. Nothing here blocks the site —
the price shown is the one in the Price column — but each wants a yes or no.

${withQueries.map((p) => `- **${p.title}** — ${catTitle(p)}\n${p.queries.map((q) => `  - ${q}`).join("\n")}`).join("\n")}

## 2. Decisions made by the import

These are judgement calls in \`scripts/import-catalogue.mjs\`, not the sheet.
Change the script if any are wrong.

- **A Hard Day's Night** is in the sheet twice, under Music and under Film,
  with the same size, frame and price. Listed once, under Film.
- **Summer Was a Blur of Tears** is in the sheet twice ("Summer Blur of Tears"
  and "Girl Crying — 'Summer was a blur of tears'"), same size and price, one
  image. Listed once.
- **1984 Cover (3 versions)** is one row in the sheet but three different
  images, so it's three pages, each at the row's price (£35). The sheet's own
  note says the original text read "£30/£35" — if one version is £30, say
  which.
- **Bob Marley** — the two Marley files were the wrong way round in the last
  import. The Lyceum 1975 design is now \`Bob Marley 500x700mm.jpg\` and the
  Uprising tour design is \`Bob Marley Poster 500x700mm.jpg\`. Worth a glance.
- **Three image files are second copies at a different crop** and aren't
  listed separately:
${Object.entries(DUPLICATE_FILES).map(([f, slug]) => `  - \`${f}\` → same as **${prints.find((p) => p.slug === slug)?.title}**`).join("\n")}
- **Desperate Dan** has two files (700 × 1000 and 500 × 700) — shown as a pair
  on one page, with both sizes priced.
- **Van Morrison, Reservoir Dogs, David Bowie, Desperate Dan** are one row per
  size in the sheet; each is one page with two options.
- **Sections** follow the sheet's headings, with two tweaks: Film and Theatre
  share the Screen & Stage section, and Music keeps its gig posters / records
  & promo split from before (the sheet doesn't split it). Stones No Filter Tour
  2017 is a sub-heading in the sheet and is one here too.

## 3. Still missing

${noPrice.length ? `Without a price: ${noPrice.map((p) => `**${p.title}**`).join(", ")}.` : "Nothing without a price."}
${noImage.length ? `Without an image: ${noImage.map((p) => `**${p.title}**`).join(", ")}.` : "Nothing without an image."}

## 4. Also worth confirming

- Stock and edition sizes aren't mentioned anywhere. Nothing shows as
  "sold out"; everything reads as available to order.
- Print-only (unframed) isn't offered. Every row in the sheet is framed.
`;

writeFileSync(join(REPO, "CATALOGUE-GAPS.md"), gaps);

console.log(`${prints.length} prints written from ${rows.length} rows.`);
console.log(`${used.size} images matched, ${Object.keys(DUPLICATE_FILES).length} duplicates set aside, ${onDisk.size} on disk.`);
console.log(`${withQueries.length} prints carry a query from the sheet — see CATALOGUE-GAPS.md.`);
if (prints.some((p) => p.images.some((i) => !i.width))) {
  console.log("\nSome images have no dimensions yet — run `npm run import:images`.");
}
