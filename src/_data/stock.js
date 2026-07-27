/**
 * OPTIONAL. Pulls live stock levels from Snipcart at build time so that
 * "sold out" is baked into the HTML rather than only appearing at checkout.
 *
 * Needs SNIPCART_SECRET_KEY in the build environment. Without it this
 * returns null and templates fall back to the `stock` field in prints.json.
 *
 * Snipcart is still the authority either way — it blocks checkout on a
 * product with zero stock regardless of what the static page says. This
 * just stops someone clicking Add to basket on a print that has gone.
 *
 * Pair it with a Snipcart webhook that hits a Cloudflare Pages deploy hook
 * on order.completed, so the site rebuilds after each sale.
 */

const KEY = process.env.SNIPCART_SECRET_KEY;

export default async function () {
  if (!KEY) {
    console.log("[stock] No SNIPCART_SECRET_KEY — using prints.json values.");
    return null;
  }

  try {
    const res = await fetch(
      "https://app.snipcart.com/api/products?limit=100",
      {
        headers: {
          Accept: "application/json",
          Authorization: "Basic " + Buffer.from(`${KEY}:`).toString("base64"),
        },
      }
    );

    if (!res.ok) throw new Error(`Snipcart responded ${res.status}`);

    const { items = [] } = await res.json();

    // { "the-long-goodbye": 2, ... }
    return Object.fromEntries(
      items.map((p) => [p.userDefinedId, p.stock ?? 0])
    );
  } catch (err) {
    console.warn(`[stock] Sync failed (${err.message}) — using prints.json.`);
    return null;
  }
}
