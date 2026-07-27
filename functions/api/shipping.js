/**
 * POST /api/shipping — Snipcart "shippingrates.fetch" webhook.
 *
 * Local postcodes get free delivery and free collection. Everyone else
 * gets tube post. Matching is on the outward code only (the bit before
 * the space), so widening the area is a one-line edit.
 *
 * Register this URL in the Snipcart dashboard under
 * Store configurations → Webhooks → Shipping rates.
 *
 * Environment variable required in Cloudflare Pages:
 *   SNIPCART_SECRET_KEY — used to verify the request really came from
 *   Snipcart. Without it the endpoint still works but is unauthenticated,
 *   which is fine locally and not fine in production.
 */

// Keep in sync with site.localPostcodes in src/_data/site.js
const LOCAL_OUTWARD = ["B37", "B36", "B46", "B26", "CV7"];

const RATES = {
  standard: { cost: 4.95, description: "Royal Mail Tracked 48 — rolled in a tube", guaranteedDaysToDelivery: 3 },
  express: { cost: 7.95, description: "Royal Mail Tracked 24 — rolled in a tube", guaranteedDaysToDelivery: 1 },
  localDelivery: { cost: 0, description: "Free local delivery — hand delivered", guaranteedDaysToDelivery: 2 },
  collection: { cost: 0, description: "Free collection — we'll email to arrange a time" },
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * "b37 7wb" -> "B37" ; "cv7-8ab" -> "CV7" ; "sw1a 1aa" -> "SW1A"
 *
 * Don't try to match the outward code with a greedy prefix pattern — it
 * can't tell CV7|8AB from CV78|AB. The UK inward code is *always* the
 * last three characters, so measure from the end instead.
 */
const OUTWARD = /^[A-Z]{1,2}\d[A-Z\d]?$/;

function outwardCode(postcode = "") {
  const clean = String(postcode).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const outward = clean.length >= 5 ? clean.slice(0, -3) : clean;
  return OUTWARD.test(outward) ? outward : "";
}

function isLocal(postcode) {
  const outward = outwardCode(postcode);
  return outward !== "" && LOCAL_OUTWARD.includes(outward);
}

/** Snipcart signs each webhook with a token we hand back to them to verify. */
async function verify(request, secretKey) {
  if (!secretKey) {
    console.warn("[shipping] No SNIPCART_SECRET_KEY set — skipping verification.");
    return true;
  }

  const token = request.headers.get("x-snipcart-requesttoken");
  if (!token) return false;

  const res = await fetch(
    `https://app.snipcart.com/api/requestvalidation/${token}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: "Basic " + btoa(`${secretKey}:`),
      },
    }
  );

  return res.ok;
}

export async function onRequestPost({ request, env }) {
  if (!(await verify(request, env.SNIPCART_SECRET_KEY))) {
    return json({ errors: [{ key: "invalid_token", message: "Unrecognised request." }] }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ errors: [{ key: "bad_payload", message: "Could not read the request." }] }, 400);
  }

  if (payload.eventName !== "shippingrates.fetch") {
    // Snipcart sends other events to the same URL if you configure it that way.
    return json({ rates: [] });
  }

  const address = payload.content?.shippingAddress ?? payload.content ?? {};
  const country = (address.country || "GB").toUpperCase();
  const postcode = address.postalCode || "";

  if (country !== "GB") {
    return json({
      errors: [
        {
          key: "unsupported_country",
          message: "Prints are only posted within the UK at the moment. Email us and we'll sort something out.",
        },
      ],
    });
  }

  const rates = isLocal(postcode)
    ? [RATES.collection, RATES.localDelivery, RATES.standard]
    : [RATES.standard, RATES.express];

  return json({ rates });
}

// Handy for eyeballing the logic in a browser: /api/shipping?postcode=B37+7WB
export async function onRequestGet({ request }) {
  const postcode = new URL(request.url).searchParams.get("postcode") || "";
  return json({
    postcode,
    outward: outwardCode(postcode),
    local: isLocal(postcode),
    rates: isLocal(postcode)
      ? [RATES.collection, RATES.localDelivery, RATES.standard]
      : [RATES.standard, RATES.express],
  });
}
