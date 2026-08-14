export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets/css": "assets/css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img/placeholder.svg": "assets/img/placeholder.svg" });
  eleventyConfig.addPassthroughCopy({ "src/root": "/" });
  eleventyConfig.addWatchTarget("src/assets/css/");

  // Image markup is generated in src/_data/pictures.js, not here — see the
  // note in that file for why it can't be a shortcode.

  // --- Filters -------------------------------------------------------------

  const gbp = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  /** 35 -> "£35". Whole pounds — every price in the list is round. */
  eleventyConfig.addFilter("money", (n) =>
    n === null || n === undefined ? "Price on enquiry" : gbp.format(Number(n))
  );

  eleventyConfig.addFilter("byCategory", (prints = [], slug) =>
    prints.filter((p) => p.category === slug)
  );

  eleventyConfig.addFilter("bySub", (prints = [], slug) =>
    prints.filter((p) => p.sub === slug)
  );

  /** A handful of prints have two images — a diptych, or a pair of tickets. */
  eleventyConfig.addFilter("hasImage", (prints = []) =>
    prints.filter((p) => p.images.length > 0)
  );

  /**
   * "From £35" only earns the word "from" when there's more than one price.
   * Prints Dad hasn't priced yet fall through to "Price on enquiry".
   */
  eleventyConfig.addFilter("priceLabel", (print) => {
    const prices = print.options.map((o) => o.price).filter((p) => p !== null);
    if (!prices.length) return "Price on enquiry";
    const low = Math.min(...prices);
    return prices.length > 1 && Math.max(...prices) !== low
      ? `From ${gbp.format(low)}`
      : gbp.format(low);
  });

  /**
   * n items spread evenly through the list. The catalogue is ordered by
   * category, so this samples across all five rather than showing eight
   * gig posters. Deterministic on purpose — a random pick would churn the
   * home page on every build for no reason.
   */
  eleventyConfig.addFilter("spread", (list = [], n) => {
    if (list.length <= n) return list;
    const step = list.length / n;
    return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
  });

  eleventyConfig.addFilter("find", (list = [], key, value) =>
    list.find((item) => item[key] === value)
  );

  /** Absolute URL for canonicals and JSON-LD. */
  eleventyConfig.addFilter("absolute", (p, base) => new URL(p, base).href);

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
}
