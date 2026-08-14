/**
 * POST /api/enquiry — the "Reserve this print" form.
 *
 * There is no checkout on this site. This takes the form, emails it to
 * Michael, and sends the customer to /enquiry-sent/. Payment is arranged
 * by reply: bank transfer, or cash on collection or delivery.
 *
 * Environment variables (Cloudflare Pages → Settings → Environment variables):
 *
 *   RESEND_API_KEY  — from resend.com. Free tier covers this volume many
 *                     times over.
 *   ENQUIRY_TO      — where enquiries land. Defaults to ENQUIRY_FROM.
 *   ENQUIRY_FROM    — a verified sender on the domain, e.g.
 *                     "Michael King Prints <shop@michaelking.site>".
 *
 * Without RESEND_API_KEY the form deliberately fails visibly rather than
 * pretending to have sent something. A silently dropped enquiry is a lost
 * sale nobody finds out about.
 */

const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ESCAPE[c]);

/** Keeps a pasted-in newline from becoming an extra header. */
const oneLine = (s = "", max = 200) =>
  String(s).replace(/[\r\n]+/g, " ").trim().slice(0, max);

function page({ title, body, status = 200 }) {
  return new Response(
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="stylesheet" href="/assets/css/style.css"></head>
<body><main class="frame"><div class="prose"><h1>${esc(title)}</h1>${body}</div></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return page({
      title: "That didn't send",
      body: "<p>The form couldn't be read. Please try again.</p>",
      status: 400,
    });
  }

  const get = (k) => oneLine(form.get(k) || "");

  // Honeypot. Real people never see this field, so anything in it is a bot.
  // Answer as though it worked — telling a bot it failed just invites a retry.
  if (get("website")) return Response.redirect(new URL("/enquiry-sent/", request.url), 303);

  const name = get("name");
  const email = get("email");
  const print = get("print");

  if (!name || !email || !print) {
    return page({
      title: "Something was missing",
      body: "<p>A name, an email address and a print are all needed. Please go back and try again.</p>",
      status: 400,
    });
  }

  // Deliberately loose — the only real test of an address is sending to it,
  // and a strict pattern rejects valid addresses more often than it catches
  // typos.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return page({
      title: "Check that email address",
      body: "<p>That doesn't look like an email address. Please go back and try again.</p>",
      status: 400,
    });
  }

  const key = env.RESEND_API_KEY;
  const from = env.ENQUIRY_FROM;
  const to = env.ENQUIRY_TO || from;

  if (!key || !from) {
    console.error("[enquiry] RESEND_API_KEY or ENQUIRY_FROM not set — enquiry not sent.");
    return page({
      title: "The form isn't working",
      body: `<p>Sorry — this couldn't be sent, and it's this end, not you.
             Please email <a href="mailto:hello@michaelking.site">hello@michaelking.site</a>
             and mention <strong>${esc(print)}</strong>.</p>`,
      status: 500,
    });
  }

  const rows = [
    ["Print", print],
    ["Option", get("option")],
    ["Name", name],
    ["Email", email],
    ["Phone", get("phone")],
    ["Collection or delivery", get("fulfilment")],
    ["Message", oneLine(form.get("message") || "", 2000)],
    ["Page", get("printUrl")],
  ].filter(([, v]) => v);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: `Print enquiry — ${print}`,
      html: `<h2>Print enquiry</h2><table>${rows
        .map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`)
        .join("")}</table>`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
    }),
  });

  if (!res.ok) {
    console.error(`[enquiry] Resend responded ${res.status}: ${await res.text()}`);
    return page({
      title: "That didn't send",
      body: `<p>Sorry — something went wrong sending this. Please email
             <a href="mailto:hello@michaelking.site">hello@michaelking.site</a>
             and mention <strong>${esc(print)}</strong>.</p>`,
      status: 502,
    });
  }

  // 303 so a refresh on the confirmation page doesn't resubmit the form.
  return Response.redirect(new URL("/enquiry-sent/", request.url), 303);
}
