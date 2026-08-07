# In-Store Pickups board — setup

The board lives at **ldhq.uk/shop**. The code is all written and deployed, but it
can't talk to Shopify until you give it a password to do so. That's the setup
below — three jobs, about 20 minutes, all in website dashboards.

Until you finish step 1 and 2, the page will politely say *"Shopify is not set up
yet"*. Nothing is broken; it just has no way in.

---

## Why it needs a "backend"

The rest of this site is a plain static site: files that get sent to a browser.
This board is different, because it has to hold a Shopify password. Anything sent
to a browser can be read by whoever's using it — so the password can't go there.

So the Shopify part runs on Cloudflare's own servers instead, in
`functions/api/pickups.js`. The browser asks that for the list; only it ever sees
the password. It's still free, and it needs no separate hosting.

**Important:** those addresses are protected by the same Cloudflare Access login
wall as the rest of the site. If you ever switch Access off, they'd be open to
anyone. Don't.

---

## Step 1 — Give it a Shopify key

1. In **Shopify admin** → **Settings** → **Apps and sales channels** →
   **Develop apps** → **Create an app**. Name it `Staff Portal Pickups`.
2. Open **Configuration** → **Admin API integration** → **Configure**, and tick
   these four:
   - `read_orders`
   - `write_orders`
   - `read_merchant_managed_fulfillment_orders`
   - `write_merchant_managed_fulfillment_orders`
3. **Save**, then go to **API credentials** → **Install app**.
4. Copy the **Admin API access token** (starts `shpat_`). Shopify shows it once —
   copy it now.

> That token can read and change your orders. Treat it like a bank password: paste
> it straight into step 2 and don't email it or put it in a document.

---

## Step 2 — Tell Cloudflare about it

In **Cloudflare dashboard** → **Workers & Pages** → your **StaffPortal** project →
**Settings** → **Environment variables**, add these to **Production**:

| Name | Value | Type |
|------|-------|------|
| `SHOPIFY_STORE` | `orcs-bazaar.myshopify.com` | Plaintext |
| `SHOPIFY_ADMIN_TOKEN` | the `shpat_…` token from step 1 | **Secret** |

Use the **Secret** type for the token — that encrypts it so nobody can read it
back out afterwards.

Then **Deployments** → **⋯** → **Retry deployment** so it picks them up. Visit
**ldhq.uk/shop** and your pickups should appear.

*(Optional: add `PICKUP_SHIPPING_TITLE` if the shipping method is ever renamed.
It defaults to `In Store Pickup`, which is what your Shipx rate is called today.)*

---

## Step 3 — The "Ready" email

The Ready button always marks the order ready. To also email the customer, deploy
the Apps Script:

1. Open `apps-script/ready-for-collection.gs` in this repo. The instructions are
   at the top of the file.
2. In short: paste it into a new project at **script.google.com**, change
   `SHARED_SECRET` to a long random phrase, then **Deploy → New deployment → Web
   app**, with *Execute as: Me* and *Who has access: Anyone*.
3. Copy the web app address, and add two more variables in Cloudflare:

| Name | Value | Type |
|------|-------|------|
| `READY_EMAIL_URL` | the Apps Script web app address | Plaintext |
| `READY_EMAIL_SECRET` | the same phrase as `SHARED_SECRET` | **Secret** |

4. Retry the deployment again.

If this step isn't done, pressing Ready still works — the board just tells staff
the email didn't go and to ring the customer instead.

> "Who has access: Anyone" sounds alarming, but it only means the address doesn't
> require a Google login — which it can't, because a server is calling it, not a
> person. The shared secret is what actually keeps strangers out.

---

## How the three buttons behave

| Button | What it does | Who presses it |
|--------|--------------|----------------|
| **Picked** | Tags the order `Picked` in Shopify | Warehouse — tells the shop it's on the way |
| **Ready** | Tags the order `Ready for Collection` and emails the customer | Shop |
| **Collected** | Fulfils the order in Shopify, so it drops off the board | Shop, at the counter |

The stages are stored as **order tags in Shopify**, not in this website. That
means the board and Shopify can never disagree, everyone sees the same thing
instantly, and you can look at any order in Shopify and see where it got to.

**Collected asks "are you sure" first**, because it can't be undone from here —
the order becomes fulfilled and leaves the list. (You can still un-fulfil it in
Shopify admin if someone mis-clicks.)

Collected deliberately does **not** send Shopify's "your order has shipped"
email — the customer is standing at the counter. If you'd rather it did, change
`notifyCustomer` to `true` in `functions/api/pickups.js`.

---

## Which orders appear

Unfulfilled, open orders whose shipping method is called **In Store Pickup**.

Worth knowing: your pickup orders come through the **Shipx** app rather than
Shopify's own local-pickup feature, so Shopify doesn't flag them as pickups
internally — they look like ordinary shipping. The shipping method's *name* is the
only reliable signal, which is why `PICKUP_SHIPPING_TITLE` exists. **If someone
renames that rate in Shipx, the board will go empty** — that's the first thing to
check if it ever does.

The board looks through the 250 most recent unfulfilled orders, refreshes itself
every minute, and lists the longest wait first.
