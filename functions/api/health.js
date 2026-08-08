// ---------------------------------------------------------------------------
// A settings check you can read in a browser.
//
// Visit https://ldhq.uk/api/health while signed in and it tells you which
// settings Cloudflare is actually passing to the running site. This exists
// because the Deployments list is easy to misread — a deployment can be new
// but built from old code, or built before a setting was added.
//
// It never prints the values of secrets. Only whether they are there, plus a
// harmless shape check (does the ready-email address look like an Apps Script
// address, is the store a myshopify.com address). Even so, it's behind the same
// Cloudflare Access login wall as everything else.
// ---------------------------------------------------------------------------

// The ready-email address must be a deployed Apps Script *web app*. The two
// usual mistakes are pasting the editor URL (…/edit) or the /dev address, which
// only works while you're signed in — neither will ever work from a server.
const APPS_SCRIPT_PREFIX = 'https://script.google.com/';

function describeReadyEmail(url) {
  if (!url) {
    return 'Not set. The Ready button will still mark orders ready, but no email is sent.';
  }
  if (!url.startsWith(APPS_SCRIPT_PREFIX)) {
    return `Set, but it does not start with ${APPS_SCRIPT_PREFIX} — that is not an Apps Script address.`;
  }
  if (url.endsWith('/dev')) {
    return 'Set, but it ends with /dev. That address only works for you in a browser. ' +
      'Use Deploy > Manage deployments and copy the /exec address instead.';
  }
  if (!url.endsWith('/exec')) {
    return 'Set, but it does not end with /exec. Copy the web app address from ' +
      'Deploy > Manage deployments.';
  }
  return 'Set, and it looks like a deployed Apps Script web app.';
}

// Which code the running site was built from. This is read out of the
// deployment's own files (version.json, written at build time), so it always
// describes the code answering this request — unlike the footer, which a
// browser may be showing you from its cache.
async function readVersion(env, request) {
  try {
    if (!env.ASSETS) return { commit: null, branch: null, builtAt: null, note: 'Not available here.' };
    const response = await env.ASSETS.fetch(new URL('/version.json', request.url));
    if (!response.ok) return { commit: null, branch: null, builtAt: null, note: 'version.json missing.' };
    return await response.json();
  } catch (error) {
    return { commit: null, branch: null, builtAt: null, note: String(error.message || error) };
  }
}

export async function onRequestGet({ env, request }) {
  const settings = {
    SHOPIFY_STORE: {
      set: Boolean(env.SHOPIFY_STORE),
      // Not a secret — it's the public shop address, and seeing it confirms
      // there's no stray space or typo.
      value: env.SHOPIFY_STORE || null,
      required: true,
    },
    SHOPIFY_CLIENT_ID: { set: Boolean(env.SHOPIFY_CLIENT_ID), required: !env.SHOPIFY_ADMIN_TOKEN },
    SHOPIFY_CLIENT_SECRET: { set: Boolean(env.SHOPIFY_CLIENT_SECRET), required: !env.SHOPIFY_ADMIN_TOKEN },
    SHOPIFY_ADMIN_TOKEN: { set: Boolean(env.SHOPIFY_ADMIN_TOKEN), required: false },
    READY_EMAIL_URL: {
      set: Boolean(env.READY_EMAIL_URL),
      note: describeReadyEmail(env.READY_EMAIL_URL),
      required: false,
    },
    READY_EMAIL_SECRET: {
      set: Boolean(env.READY_EMAIL_SECRET),
      // Length only — enough to spot an accidentally blank or truncated paste
      // without revealing the secret itself.
      length: env.READY_EMAIL_SECRET ? String(env.READY_EMAIL_SECRET).length : 0,
      required: false,
    },
    PICKUP_SHIPPING_TITLE: {
      set: Boolean(env.PICKUP_SHIPPING_TITLE),
      value: env.PICKUP_SHIPPING_TITLE || 'In Store Pickup (default)',
      required: false,
    },
  };

  const missing = Object.entries(settings)
    .filter(([, s]) => s.required && !s.set)
    .map(([name]) => name);

  const readyEmail = Boolean(env.READY_EMAIL_URL) && Boolean(env.READY_EMAIL_SECRET);
  const version = await readVersion(env, request);

  return new Response(
    JSON.stringify(
      {
        ok: missing.length === 0,
        deployed: version,
        shopifyReady: missing.length === 0,
        readyEmailConfigured: readyEmail,
        summary: [
          missing.length === 0
            ? 'Shopify settings are all present.'
            : `Shopify cannot work — missing: ${missing.join(', ')}.`,
          readyEmail
            ? 'Ready-email settings are both present.'
            : 'Ready email is off: ' +
              [!env.READY_EMAIL_URL && 'READY_EMAIL_URL', !env.READY_EMAIL_SECRET && 'READY_EMAIL_SECRET']
                .filter(Boolean)
                .join(' and ') +
              ' missing. Add it, then make a NEW deployment.',
        ].join(' '),
        settings,
      },
      null,
      2
    ),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
}
