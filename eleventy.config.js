export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/root": "/" });
  eleventyConfig.addWatchTarget("src/assets/css/");

  // --- Filters -------------------------------------------------------------

  const gbp = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  });

  /** 35 -> "£35.00" (display only) */
  eleventyConfig.addFilter("money", (n) => gbp.format(Number(n)));

  /** 35 -> "35.00" (what Snipcart's data-item-price must contain) */
  eleventyConfig.addFilter("price", (n) => Number(n).toFixed(2));

  /**
   * Snipcart custom-field option syntax with price modifiers.
   * [{label:"A3",add:0},{label:"A2",add:15}] -> "A3|A2[+15.00]"
   * The first option is the default, so it must be the one whose price
   * matches data-item-price (i.e. add: 0).
   */
  eleventyConfig.addFilter("sizeOptions", (sizes = []) =>
    sizes
      .map(({ label, add = 0 }) =>
        add ? `${label}[+${Number(add).toFixed(2)}]` : label
      )
      .join("|")
  );

  /** Absolute URL — Snipcart re-crawls this page to verify the price. */
  eleventyConfig.addFilter("absolute", (path, base) =>
    new URL(path, base).href
  );

  /** prints | theme("film") — the catalogue lives in _data, not in collections */
  eleventyConfig.addFilter("byTheme", (prints = [], theme) =>
    prints.filter((p) => p.theme === theme)
  );

  /** prints | inStock */
  eleventyConfig.addFilter("inStock", (prints = []) =>
    prints.filter((p) => Number(p.stock) > 0)
  );

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
