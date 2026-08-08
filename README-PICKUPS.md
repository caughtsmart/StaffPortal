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

> **Note:** Shopify retired the old *Settings → Apps → Develop apps* route on
> **1 January 2026**. New apps are made in the **Dev Dashboard** instead. You no
> longer get a permanent password — you get an ID and a secret, and the site
> swaps them for a 24-hour token whenever it needs one. It does that by itself;
> there is nothing to renew.

1. Go to the **Dev Dashboard** at **shopify.dev/dashboard** and sign in with the
   same account you use for the shop.
2. **Apps** → **Create app**. Name it `Staff Portal Pickups`.
3. Set the app's **access scopes** to these, and nothing else:
   - `read_orders` — see the orders
   - `write_orders` — add the Picked / Ready tags
   - `read_products` — read the pre-order flag and Release Date off the product
   - `read_merchant_managed_fulfillment_orders` — see what's left to fulfil
   - `write_merchant_managed_fulfillment_orders` — mark it collected
   - `read_all_orders` — see orders older than 60 days (needs Shopify's approval;
     see "Seeing older orders" below)
4. **Install** the app on the Loaded Dice store. (It must be installed, or the
   ID and secret won't open anything.)
5. Open the app's **Settings** page and copy the **Client ID** and
   **Client secret**.

> The secret can read and change your orders. Treat it like a bank password:
> paste it straight into step 2, don't email it, and don't put it in a document.

---

## Step 2 — Tell Cloudflare about it

In **Cloudflare dashboard** → **Workers & Pages** → your **StaffPortal** project →
**Settings** → **Variables and Secrets** → **Add**, add these three:

| Variable name | Value | Type |
|---------------|-------|------|
| `SHOPIFY_STORE` | `orcs-bazaar.myshopify.com` | Plaintext |
| `SHOPIFY_CLIENT_ID` | the Client ID from step 1 | Plaintext |
| `SHOPIFY_CLIENT_SECRET` | the Client secret from step 1 | **Secret** |

Choose **Secret** (or tick **Encrypt**) for the client secret — that encrypts it,
so nobody can read it back out afterwards, not even you. Copy it carefully.

Make sure you're adding them to **Production**, not Preview.

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
   - Google will warn *"Google hasn't verified this app"* the first time. That's
     normal for your own script: **Advanced** → **Go to (project) (unsafe)** →
     **Allow**.
   - The shop address, phone and opening hours are constants at the top of the
     file. Change them there, then **Deploy → Manage deployments → edit → Deploy**
     to push the new version.
3. **Sending as `noreply@loadeddice.uk`.** Google only lets a script send from an
   address the account is verified to send as. So before this works:
   - In Gmail (as the account that owns the script): **See all settings** →
     **Accounts** → **Send mail as** → **Add another email address** →
     `noreply@loadeddice.uk` → complete the verification.
   - Back in the script editor, choose **checkAliases** from the function
     dropdown and press **Run**. The Execution log tells you whether it's set up.

   If it isn't, the email still goes out — from the account's own address — and
   the board shows a warning saying so, rather than quietly using the wrong
   sender. Replies go to `info@loadeddice.uk` either way, so a customer replying
   about their order still reaches someone.
4. Copy the web app address, and add two more variables in Cloudflare:

| Name | Value | Type |
|------|-------|------|
| `READY_EMAIL_URL` | the Apps Script web app address | Plaintext |
| `READY_EMAIL_SECRET` | the same phrase as `SHARED_SECRET` | **Secret** |

5. Retry the deployment again.

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

## Seeing older orders

Shopify only shows an app the last 60 days of orders unless it has the
`read_all_orders` scope. That matters for pre-orders, which are often placed
months before release.

**That scope has been granted for this store**, so the board sees the full
history. If it's ever re-created, request it again from the Dev Dashboard under
the app's **API access** → **Read all orders** → **Request access**.

The board reads **every** unfulfilled order, however far back it goes.

---

## Which orders appear

Unfulfilled, open orders whose shipping method is called **In Store Pickup**.

Worth knowing: your pickup orders come through the **Shipx** app rather than
Shopify's own local-pickup feature, so Shopify doesn't flag them as pickups
internally — they look like ordinary shipping. The shipping method's *name* is the
only reliable signal, which is why `PICKUP_SHIPPING_TITLE` exists. **If someone
renames that rate in Shipx, the board will go empty** — that's the first thing to
check if it ever does.

The board refreshes itself every minute and lists newest first.

**How it finds them, and why it works this way.** Shopify has no way to search
orders by shipping method — putting `shipping_line:` in a search query is
silently ignored, and you get every order back regardless. So every unfulfilled
order has to be looked at.

This shop currently has around **1,800 unfulfilled orders**, mostly old
`PRE/BACK ORDER` and similar, so that is not a small job. It is done in two
passes:

1. **Skim** — ask only for each order's id and shipping method. That is cheap
   enough to fetch 250 at a time, so ~1,800 orders takes about 8 requests.
2. **Detail** — fetch the full information for the pickups only, 25 at a time.

Roughly ten requests a refresh, and nothing is left out. Doing it in one pass
would mean 25 orders per request — over 70 requests every minute — because
asking for line items and product data at 250 an page exceeds Shopify's limit on
how much one query may ask for.

### Standard Orders vs Pre-Orders

An order lands in **Pre-Orders** if any item on it is a pre-order. That's read
from the **product**, two ways — either is enough:

- the product tag `Preorder`, or
- the `custom.preorder` metafield set to true.

Both are checked because in your catalogue the tag is on every pre-order product
while the metafield is only on some of them.

Both of those live on the product, so this needs the `read_products` scope. If
that permission is ever missing, the board doesn't fall over — it shows every
pickup in a single list and says why at the top.

The **Release** column comes from the product metafield **`custom.release_date`**
("Release Date", a date field) and nothing else. Products also carry a
`Release 2026-11-20` tag with the same information, but the metafield is the
source of truth, so **a product with an empty Release Date shows no date** — even
if it has the tag. Where an order has several pre-order items, the column shows
the **latest** date, since that's when the order can be handed over complete. A
date in the past is highlighted, meaning it should have arrived.

One thing to know: this reads the product's status **now**, not at the moment of
purchase — Shopify doesn't record that on the order. So when a product releases
and you clear its `Preorder` tag, any outstanding orders for it move into
Standard Orders. That's usually what you want, but it's worth knowing why a row
moved table.
