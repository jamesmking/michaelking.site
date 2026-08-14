# Michael King Prints

Catalogue of framed prints — film, music, theatre, book covers, pop art and
ephemera. **11ty** for the site, **Cloudflare Pages** for hosting and one
serverless function.

```
npm install
cp .env.example .env
npm run dev               # http://localhost:8080
```

The site builds and renders without any keys — the enquiry form just won't send.

---

## There is no checkout

This is a catalogue with an enquiry form, not a shop. Michael's terms are bank
transfer, or cash on collection or delivery, so there is nothing to charge and
no card details to handle. Each print has a **Reserve this print** form that
posts to `/api/enquiry`, which emails him and redirects to `/enquiry-sent/`.

That removes a lot: no Snipcart, no Stripe, no price-validation crawl, no stock
sync, no shipping webhook, no PCI surface. If a real basket is ever wanted,
it's a rebuild of this layer, not a config change.

Prints aren't posted — they're framed behind glass, and collection or local
delivery in Coventry and Warwickshire is the only option offered.

---

## How it's put together

```
src/_data/site.js          Shop name, contact, area, payment methods. Edit first.
src/_data/prints.json      The whole catalogue. One object per print.
src/_data/categories.json  The five sections and their subcategories.
src/_data/pictures.js      Generates responsive <picture> markup at build time.

src/index.njk              Home
src/prints.njk             /prints/ — everything, grouped by section
src/categories.njk         Paginates categories.json into /music/, /pop-art/, …
src/prints/print.njk       Paginates prints.json into /prints/<slug>/
src/about.njk              /about/ — includes commissions
src/enquiry-sent.njk       Where the form lands

functions/api/enquiry.js   Takes the reserve form, emails it, redirects.
scripts/import-catalogue.mjs  One-time import from Dad's product list.
scripts/import-images.mjs     One-time import of his image files.
```

There is no CMS. A print is a JSON object plus an image.

---

## The catalogue

`src/_data/prints.json` is the source of truth. One entry:

```json
{
  "id": "hendrix-1968",
  "slug": "hendrix-1968",
  "title": "Jimi Hendrix — 1968",
  "category": "music",
  "sub": "gig-posters",
  "options": [
    { "size": "500 × 700mm", "frame": "Black, with glass", "price": 45 }
  ],
  "priceFrom": 45,
  "images": [
    { "src": "/assets/img/prints/hendrix-1968.jpg", "width": 1139, "height": 1600 }
  ],
  "shape": "portrait",
  "alt": "Jimi Hendrix — 1968 — framed print",
  "note": "An original design.",
  "needs": []
}
```

- **`options`** is size / frame / price. Most prints have one row; a few have
  two. `"price": null` renders as *Price on enquiry* rather than a wrong number.
- **`shape`** is `portrait`, `square`, `landscape` or `tall`, set by the image
  import. Cards use one frame ratio regardless and letterbox inside it, so this
  is metadata rather than a layout switch.
- **`needs`** lists what's still missing — `price`, `image`, `size`,
  `which-image`. `CATALOGUE-GAPS.md` is generated from these.
- **`id` must never change** once a print has sold. It's how past enquiries
  match up.

### Adding a print by hand

Drop the photo in `src/assets/img/prints/`, add the object, commit. Cloudflare
rebuilds. Images want to be sRGB and about 1600px on the long edge — see below
for why that matters.

### Re-importing from Dad's list

When he sends corrections, edit the `ROWS` table in
`scripts/import-catalogue.mjs` and run both scripts:

```
npm run import:catalogue   # rewrites prints.json and CATALOGUE-GAPS.md
npm run import:images      # re-processes the originals, writes dimensions back
```

They read from `~/Downloads/JPEG Images` and fail loudly if a named file isn't
there. The originals are never modified — they're the archive, and the only
thing to go back to if a print needs reprinting.

---

## Images

His originals are print files: 3000–9000px, up to 63MB, and **51 of the 71 were
CMYK**. Browsers render CMYK JPEGs with badly shifted colours, so
`scripts/import-images.mjs` converts everything to sRGB and resizes to a 1600px
long edge. Those masters are what's committed.

`src/_data/pictures.js` then generates 400/800/1200px WebP and JPEG at build
time. The derivatives are not committed.

Two things that will cost an afternoon if you forget them:

**Image markup is built in a data file, not a shortcode.** An async Nunjucks
shortcode called from inside an `{% include %}` renders as *nothing at all* —
silently, with no build error. Card markup is shared by three templates so it
has to be an include, hence generating the HTML in `_data/pictures.js` where
async is expected.

**`<source>` is hidden explicitly in the CSS.** `display: contents` on a
`<picture>` promotes its children to grid items, and an unstyled `<source>`
then takes a grid cell of its own, silently pushing every image one place
along. The rule is in `style.css` under the base `img` styles.

---

## The enquiry form

`functions/api/enquiry.js` posts to [Resend](https://resend.com). Set in the
Cloudflare Pages dashboard:

- `RESEND_API_KEY`
- `ENQUIRY_FROM` — a verified sender on the domain
- `ENQUIRY_TO` — where enquiries land, defaults to `ENQUIRY_FROM`

Without a key the form returns a visible error telling the customer to email
instead. That's deliberate: a silently dropped enquiry is a lost sale nobody
finds out about.

It's a plain HTML form post with a 303 redirect, so it works with JavaScript
off and a refresh on the confirmation page doesn't resubmit. Spam is handled
with an off-screen honeypot field.

---

## Deploying to Cloudflare Pages

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `_site` |
| Node version | `18` or later |

Environment variables: `SITE_URL` (live URL, no trailing slash), plus the three
Resend values above. `functions/` is picked up automatically.

---

## Design notes

The palette is the process inks, one per section. Key, cyan and magenta are the
process three; vermilion and green are spot colours — the extra plates a printer
loads when three won't cover it. Yellow stays a marker only: it has no contrast
on this paper and never sets text. Change the values at the top of `style.css`
and the whole site follows.

Cards all use one frame ratio and centre the artwork inside it, the way a mount
does the work in a real frame. The collection is a genuine mix — 57 portrait,
10 square, 3 landscape and one very tall panel — and sizing each frame to its
own print gives a ragged grid that reads as a mistake rather than a decision.

Type is Archivo at 125% width for display, Newsreader for body, DM Mono for
anything numeric or label-like.

The crop marks in the page corners are the one bit of decoration. Four empty
spans in `base.njk`. Delete them if they wear thin.

---

## Before launch

`CATALOGUE-GAPS.md` is the list — 16 prints with no price, 6 with no image, 8
image files with no entry in the list, and a handful of size and duplicate
questions. It's regenerated by `npm run import:catalogue`.

One thing worth a conversation: a fair number of these are recreations of works
still in copyright — Mickey Mouse, Batman, Superman, Wonder Woman, the Joker,
Lichtenstein, Keith Haring. Selling privately is one thing; a public shop with
prices attached is more visible, and Disney and DC are the two most active
enforcers going. Michael's call, but he should make it knowingly.

---

## Not built, deliberately

- **A CMS.** If he wants to add prints himself, put
  [Sveltia CMS](https://github.com/sveltia/sveltia-cms) over `src/_data/` — the
  JSON shape is already CMS-friendly.
- **A basket.** See above — his terms don't need one.
- **Stock levels.** Nothing in his list mentions editions or quantities.
  Everything reads as available to order until he says otherwise.
- **A sitemap.** Eighty pages and five sections. Worth adding if search traffic
  ever matters.
