// ---------------------------------------------------------------------------
// In-Store Pickups — the bit that talks to Shopify.
//
// This is a Cloudflare Pages Function: a small piece of code that runs on
// Cloudflare's servers, not in the staff member's browser. That matters,
// because the Shopify password (the "Admin API token") lives here and must
// never be sent to a browser — anyone could read it there.
//
// The whole site sits behind the Cloudflare Access login wall, so only signed-in
// staff can reach these addresses. If you ever remove that login wall, these
// addresses become open to the world — so don't.
//
// Settings live in Cloudflare Pages > Settings > Environment variables:
//   SHOPIFY_STORE          e.g. orcs-bazaar.myshopify.com
//   SHOPIFY_ADMIN_TOKEN    the Admin API access token  (add as a SECRET)
//   READY_EMAIL_URL        (optional) your Google Apps Script web app address
//   READY_EMAIL_SECRET     (optional) shared password the Apps Script checks
//   PICKUP_SHIPPING_TITLE  (optional) defaults to "In Store Pickup"
// ---------------------------------------------------------------------------

const API_VERSION = '2025-07';

// The order tags used to remember which stage an order has reached. They show
// up on the order in Shopify too, so the board and Shopify never disagree.
const PICKED_TAG = 'Picked';
const READY_TAG = 'Ready for Collection';

// How many unfulfilled orders to look through. 50 per request, so 5 pages is
// the 250 most recent unfulfilled orders — far more than a day's pickups.
const MAX_PAGES = 5;

const ORDERS_QUERY = `
  query PickupOrders($cursor: String) {
    orders(
      first: 50
      after: $cursor
      query: "fulfillment_status:unfulfilled AND status:open"
      sortKey: CREATED_AT
      reverse: true
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        createdAt
        tags
        email
        customer { displayName }
        shippingAddress { name }
        shippingLine { title }
        fulfillmentOrders(first: 10) { nodes { id status } }
        lineItems(first: 50) { nodes { name quantity sku } }
      }
    }
  }
`;

const TAGS_ADD = `
  mutation AddTag($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors { field message }
    }
  }
`;

const FULFILL = `
  mutation Fulfil($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment { id status }
      userErrors { field message }
    }
  }
`;

/** Call the Shopify Admin API and hand back the `data` block. */
async function shopify(env, query, variables = {}) {
  const store = env.SHOPIFY_STORE;
  const token = env.SHOPIFY_ADMIN_TOKEN;
  if (!store || !token) {
    throw new Error('Shopify is not set up yet: SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN are missing.');
  }

  const response = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify replied ${response.status}. Check the store address and token.`);
  }

  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }
  return body.data;
}

/** Shopify puts mistakes in `userErrors` rather than failing outright. */
function throwOnUserErrors(result, label) {
  const errors = result?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`${label}: ${errors.map((e) => e.message).join('; ')}`);
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/**
 * Is this an in-store pickup order?
 *
 * Loaded Dice uses the Shipx app for shipping rates, not Shopify's built-in
 * local pickup, so these orders are NOT flagged as pickups in Shopify's own
 * delivery data — they look like ordinary shipping. The reliable signal is the
 * shipping method's name.
 */
function isPickup(order, title) {
  return (order.shippingLine?.title ?? '').trim().toLowerCase() === title.trim().toLowerCase();
}

/** Turn a Shopify order into just what the board needs. */
function toCard(order) {
  const tags = order.tags ?? [];
  return {
    id: order.id,
    number: order.name,
    createdAt: order.createdAt,
    customer: order.customer?.displayName || order.shippingAddress?.name || 'Guest',
    email: order.email || null,
    items: (order.lineItems?.nodes ?? []).map((li) => ({
      name: li.name,
      quantity: li.quantity,
      sku: li.sku,
    })),
    picked: tags.includes(PICKED_TAG),
    ready: tags.includes(READY_TAG),
    fulfillmentOrderIds: (order.fulfillmentOrders?.nodes ?? [])
      .filter((fo) => fo.status === 'OPEN' || fo.status === 'IN_PROGRESS')
      .map((fo) => fo.id),
  };
}

// --- GET /api/pickups : the list ------------------------------------------
export async function onRequestGet({ env }) {
  const title = env.PICKUP_SHIPPING_TITLE || 'In Store Pickup';

  try {
    const pickups = [];
    let cursor = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await shopify(env, ORDERS_QUERY, { cursor });
      const orders = data.orders;

      for (const order of orders.nodes) {
        if (isPickup(order, title)) pickups.push(toCard(order));
      }

      if (!orders.pageInfo.hasNextPage) break;
      cursor = orders.pageInfo.endCursor;
    }

    // Oldest first: the person who has waited longest is at the top.
    pickups.reverse();
    return json({ ok: true, orders: pickups });
  } catch (error) {
    return json({ ok: false, error: error.message }, 500);
  }
}

// --- POST /api/pickups : the three buttons ---------------------------------
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Could not read the request.' }, 400);
  }

  const { action, orderId } = body ?? {};
  if (!orderId || !['picked', 'ready', 'collected'].includes(action)) {
    return json({ ok: false, error: 'Need an orderId and an action of picked, ready or collected.' }, 400);
  }

  try {
    if (action === 'picked') {
      const data = await shopify(env, TAGS_ADD, { id: orderId, tags: [PICKED_TAG] });
      throwOnUserErrors(data.tagsAdd, 'Marking as picked');
      return json({ ok: true });
    }

    if (action === 'ready') {
      const data = await shopify(env, TAGS_ADD, { id: orderId, tags: [READY_TAG] });
      throwOnUserErrors(data.tagsAdd, 'Marking as ready');

      // Tell the customer. If the email step fails we still report success for
      // the tag, but say so plainly, so staff know to ring them instead.
      const emailed = await sendReadyEmail(env, body);
      return json({ ok: true, emailed: emailed.sent, emailError: emailed.error });
    }

    // action === 'collected' — fulfil in Shopify, which drops it off the board.
    const ids = Array.isArray(body.fulfillmentOrderIds) ? body.fulfillmentOrderIds : [];
    if (ids.length === 0) {
      return json({ ok: false, error: 'That order has nothing left to fulfil.' }, 400);
    }

    for (const fulfillmentOrderId of ids) {
      const data = await shopify(env, FULFILL, {
        fulfillment: {
          lineItemsByFulfillmentOrder: [{ fulfillmentOrderId }],
          // The customer is standing at the counter — a "your order has been
          // shipped" email would only confuse them.
          notifyCustomer: false,
        },
      });
      throwOnUserErrors(data.fulfillmentCreate, 'Marking as collected');
    }

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error.message }, 500);
  }
}

/**
 * Ask the Google Apps Script web app to email the customer.
 * Returns { sent, error } rather than throwing, so a broken email setup never
 * stops the order being marked ready.
 */
async function sendReadyEmail(env, body) {
  if (!env.READY_EMAIL_URL) {
    return { sent: false, error: 'No email address set up yet (READY_EMAIL_URL).' };
  }
  if (!body.email) {
    return { sent: false, error: 'That order has no email address on it.' };
  }

  try {
    const response = await fetch(env.READY_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.READY_EMAIL_SECRET ?? '',
        email: body.email,
        customer: body.customer ?? '',
        orderNumber: body.number ?? '',
        items: body.items ?? [],
      }),
    });

    const text = await response.text();
    if (!response.ok) return { sent: false, error: `Email service replied ${response.status}.` };

    // Apps Script answers with JSON when it is happy.
    try {
      const result = JSON.parse(text);
      if (result.ok === false) return { sent: false, error: result.error || 'Email service refused.' };
    } catch {
      // Not JSON — Apps Script sometimes returns an HTML page when the web app
      // is deployed with the wrong access setting.
      return { sent: false, error: 'Email service did not reply properly. Check its deployment access is "Anyone".' };
    }

    return { sent: true, error: null };
  } catch (error) {
    return { sent: false, error: error.message };
  }
}
