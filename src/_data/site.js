// Everything that isn't a print lives here. Edit this file first.

export default {
  year: new Date().getFullYear(),

  name: "Michael King Prints",
  tagline:
    "Framed prints of film posters, gig posters, book covers and more — recreated, reimagined, and made one at a time.",

  // The wordmark is set in three parts so each can take its own ink.
  wordmark: ["Michael", "King", "Prints"],

  // Used for canonical URLs. Must match the live domain exactly, no trailing slash.
  url: process.env.SITE_URL || "https://example.com",

  // Where enquiries land. Also the fallback if the form's API key isn't set.
  email: "hello@michaelking.site",
  phone: "",

  // There is no checkout. Prints are reserved by enquiry, then paid for
  // by bank transfer or in cash on collection or delivery.
  payment: ["Bank transfer", "Cash on collection", "Cash on delivery"],

  // Collection and delivery area. Displayed only — nothing is enforced,
  // because nothing is charged online.
  localArea: "Coventry and Warwickshire",
  localPostcodes: ["CV1", "CV2", "CV3", "CV4", "CV5", "CV6", "CV7", "CV8"],
  deliveryNote: "A small charge applies for delivery. Collection is free.",
};
