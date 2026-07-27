# Poster shop

Static shop for original film and music poster prints.
**11ty** for the site, **Snipcart** for cart/checkout/stock, **Cloudflare Pages** for hosting and the one serverless function.

```
npm install
cp .env.example .env      # add your Snipcart test key
npm run dev               # http://localhost:8080
```

The site builds and renders without any keys — you just can't check out.

---

## How it's put together

```
src/_data/site.js        Shop name, contact, postcodes, shipping prices. Edit this first.
src/_data/prints.json    The entire catalogue. One object per design.
src/_data/themes.json    Drives /film/ and /music/. You'll rarely touch it.
src/_data/stock.js       Optional live stock sync (see below).

src/index.njk            Home
src/prints.njk           /prints/ — everything
src/themes.njk           Paginates themes.json into /film/ and /music/
src/prints/print.njk     Paginates prints.json into /prints/<slug>/
src/about.njk            /about/

functions/api/shipping.js  Snipcart shipping webhook. Decides free-local vs postage.
```

There is no CMS. A print is a JSON object plus an image — see "Adding a print" below.

---

## Adding a print

1. Drop the photo in `src/assets/img/prints/`. Portrait, ~1000×1414, JPG or WebP.
2. Add an object to `src/_data/prints.json`:

```json
{
  "id": "unique-and-permanent",
  "slug": "url-slug",
  "title": "Title",
  "theme": "film",
  "year": 1973,
  "price": 35,
  "sizes": [
    { "label": "A3 (297 × 420mm)", "add": 0 },
    { "label": "A2 (420 × 594mm)", "add": 15 }
  ],
  "stock": 3,
  "paper": "Somerset Satin 300gsm",
  "technique": "Three-colour screenprint",
  "image": "/assets/img/prints/url-slug.jpg",
  "alt": "Describe the artwork",
  "blurb": "A sentence or two."
}
```

3. Commit and push. Cloudflare rebuilds.

**`id` must never change** once a print has sold — it's the key Snipcart uses to
track stock and match past orders.

**The first entry in `sizes` must have `add: 0`.** It's the default option, and its
price has to match `price` or Snipcart's validation will reject the item.

---

## Snipcart setup

1. Sign up, stay in **Test mode**. Copy the **public** API key into `.env` as
   `SNIPCART_PUBLIC_KEY` (it's public by design — safe to commit if you'd rather
   hardcode it in `site.js`).
2. Store configurations → **Regional settings** → set currency to **GBP**.
3. Connect **Stripe** as the payment gateway.
4. Store configurations → **Webhooks** → Shipping rates → `https://yourdomain.com/api/shipping`.
5. Products → import or add each print, matching the `id` from `prints.json`, and
   set the stock level. Turn on **inventory management** per product.
6. Test a full checkout with card `4242 4242 4242 4242`.
7. Swap the test key for the live key and switch the dashboard to Live mode.

### Two gotchas that will cost you an afternoon

**Price validation.** Before charging, Snipcart re-fetches `data-item-url` and
re-reads the button's attributes to confirm the price hasn't been tampered with in
the browser. So every product needs a publicly reachable page whose button matches,
and prices can't be assembled client-side. On a static site this is free — just
don't move the button into JS.

**Stock lives in the Snipcart dashboard, not in this repo.** The `stock` field in
`prints.json` is for display only — it's what renders the dots and the "Sold out"
band. Snipcart holds the real number and blocks checkout at zero. Keeping them
roughly in sync is a manual job unless you turn on the sync below.

### Optional: live stock at build time

`src/_data/stock.js` pulls real stock levels from the Snipcart API during the build
and overrides the JSON values, so "Sold out" is baked into the HTML rather than only
appearing at checkout. Set `SNIPCART_SECRET_KEY` in the Cloudflare build environment
to switch it on; without it, it logs a line and falls back silently.

To keep the built site fresh, add a Snipcart webhook on `order.completed` pointing
at a Cloudflare Pages **deploy hook**. Each sale then triggers a rebuild.

---

## Local delivery and collection

`functions/api/shipping.js` matches the customer's **outward code** (the bit before
the space) against a list. Local addresses get free collection and free delivery;
everyone else gets tracked postage. Non-UK addresses get a polite error at checkout.

Widening the area is one line:

```js
const LOCAL_OUTWARD = ["B37", "B36", "B46", "B26", "CV7"];
```

Keep it in sync with `localPostcodes` in `src/_data/site.js`, which is what the site
*displays*. The function is what's *enforced*.

Sanity-check the logic in a browser without going through checkout:

```
/api/shipping?postcode=B37+7WB
```

The GET handler exists purely for that. Delete it if you'd rather not expose it.

Note it matches on the outward code deliberately rather than a radius — no geocoding
call, no API key, no per-request cost, and it's obvious at a glance which areas are
covered. The trade-off is that outward codes aren't circles, so a couple of addresses
at the edges will be on the wrong side of the line. At this volume, handling those by
email is cheaper than the alternative.

---

## Deploying to Cloudflare Pages

Connect the repo, then:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `_site` |
| Node version | `18` or later |

Environment variables (Settings → Environment variables):

- `SITE_URL` — the live URL, no trailing slash. Used for canonicals and JSON-LD.
- `SNIPCART_PUBLIC_KEY`
- `SNIPCART_SECRET_KEY` — **production only**, never in the repo.

`functions/` is picked up automatically. `/api/shipping` will be live as soon as the
first deploy finishes; no config needed.

---

## Design notes

The palette is the four process inks: **key** for text, **cyan** for film, **magenta**
for music, **yellow** as a marker only. The theme a print belongs to sets its accent,
so the two halves of the catalogue are literally two spot colours. Everything is
driven by custom properties at the top of `style.css` — change the six hex values and
the whole site follows.

Type is Archivo at 125% width for display (expanded rather than the condensed you'd
expect on a poster site), Newsreader for body, DM Mono for anything numeric or
label-like. All three from Google Fonts.

Remaining stock renders as three dots rather than a number, because at a run of three
"● ● ○" is more legible at a glance than "2". If runs get bigger than three, swap the
`dots` macro in `src/_includes/partials/print-card.njk` for a plain count.

The crop marks in the page corners are the one bit of decoration. They're in
`base.njk` as four empty spans. Delete them if they wear thin.

---

## Not built, deliberately

- **A CMS.** If your dad wants to add prints himself, put [Sveltia CMS](https://github.com/sveltia/sveltia-cms) or Decap over `src/_data/` — the JSON shape is already CMS-friendly. If he's happy emailing you a photo four times a year, skip it.
- **Image optimisation.** Add `@11ty/eleventy-img` when the real photos land.
- **A sitemap.** Ten pages. Not worth the plugin until it is.
- **VAT.** Leave tax config off entirely unless he's VAT-registered (over £90k turnover). Adding it "just in case" puts a confusing line on the invoice.
