// Everything that isn't a print lives here. Edit this file first.

export default {
  year: new Date().getFullYear(),

  // PLACEHOLDER — replace with the real shop name.
  name: "Michael King Prints",
  tagline: "Reinterpreted, recreated film and music posters, printed in small runs.",

  // The wordmark is set in three parts so the two halves of the catalogue
  // can each take their own ink. Change the words, keep the three slots.
  wordmark: ["Michael", "King", "Prints"],

  // Used for canonical URLs and for Snipcart's price-validation crawl.
  // Must match the live domain exactly, with no trailing slash.
  url: process.env.SITE_URL || "https://example.com",

  email: "hello@michaelking.site",
  phone: "",

  // Snipcart PUBLIC API key. Safe to commit — it is public by design.
  // Use the TEST key while building; swap for the LIVE key at launch.
  snipcart: {
    publicApiKey: process.env.SNIPCART_PUBLIC_KEY || "REPLACE_WITH_TEST_KEY",
    version: "3.7.1",
    currency: "gbp",
  },

  // Outward postcodes that qualify for free local delivery or collection.
  // Shown on the site; enforced in functions/api/shipping.js.
  // KEEP THE TWO LISTS IN SYNC.
  localPostcodes: ["CV5", "CV1", "CV4", "CV6", "CV7"],
  localArea: "Coventry and the surrounding areas",

  shipping: {
    standard: 4.95,
    express: 7.95,
  },
};
