# Loaded Dice Staff Handbook — Setup Guide

This is your internal staff handbook site. It's an **Astro** static site (same tech as UAP Times), gated by a **login wall**, with a **built-in editor** and **automatic version history**.

You don't need to understand the code. Follow the steps below in order. Each one is a "do this in a website dashboard" job, not coding. Shout if any step gets sticky — I can walk you through or do it with you.

> **Rough time:** 45–60 minutes the first time. After that, adding a starter or editing a page takes seconds.

---

## What's in this folder

- `src/content/procedures/` — the 21 lorem-ipsum procedure pages (one file each). This is your content.
- `src/` (everything else) — the site itself (layout, menu, styling). Set-and-forget.
- `public/admin/` — the **editor** (Sveltia CMS) that Leigh & Chris will use.
- `public/logo.svg` — placeholder Loaded Dice logo (swap for the real one anytime).

---

## Step 1 — Put it on GitHub (your version history lives here)

You already use **GitHub Desktop** for UAP Times, so this is familiar ground.

1. Open **GitHub Desktop** → **File ▸ New Repository** (or drag this folder in).
2. Name it **`staff-handbook`**, pick this folder, click **Create Repository**.
3. Click **Publish repository**. **Untick "Keep this code private"? — NO, leave it PRIVATE (ticked).**
4. Note the owner/name it creates, e.g. `loadeddice/staff-handbook`.

✅ *From now on, every change is saved here with a full history — that's your rollback safety net, for free.*

---

## Step 2 — Deploy it on Cloudflare Pages (free hosting)

1. Go to **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pick your new **`staff-handbook`** repo.
3. Set the build settings **exactly** like this:
   - **Framework preset:** `Astro`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variable:** add one called `NODE_VERSION` with value `20`
4. Click **Save and Deploy**. Wait ~2 minutes. You'll get a temporary link like `staff-handbook.pages.dev` — open it, the site should appear. 🎉

---

## Step 3 — Point your address at it (`ldhq.uk`)

> **Note:** `loadeddice.uk` DNS lives at Squarespace, not Cloudflare, so instead of
> `staff.loadeddice.uk` the handbook uses its own dedicated domain **`ldhq.uk`**,
> registered directly with Cloudflare.

1. Still in the Pages project → **Custom domains** → **Set up a domain**.
2. Type **`ldhq.uk`** and follow the prompt. Because the domain is registered with Cloudflare, it wires up automatically.
3. Give it a couple of minutes, then visit **https://ldhq.uk** — that's your handbook.

---

## Step 4 — Put the login wall in front (the "secure" bit)

This is **Cloudflare Access** — free for up to 50 users. Staff type their work email, get a one-time code, they're in.

1. In Cloudflare dash → **Zero Trust** (left menu). If it asks you to pick a plan, choose the **Free** plan.
2. Go to **Access ▸ Applications** → **Add an application** → **Self-hosted**.
3. **Application name:** `Staff Handbook`. **Domains:** add **both** `ldhq.uk` **and** the `*.pages.dev` address, so the temporary link is locked down too.
4. Add a **policy**:
   - **Policy name:** `Loaded Dice staff`
   - **Action:** `Allow`
   - **Include** → **Emails** → add each staff email (graham@, leigh@, chris@, and the rest of the team).
   - *(Tip: to add whole domain later, use "Emails ending in" `@loadeddice.uk`.)*
5. For the login method, make sure **One-time PIN** is enabled (Settings ▸ Authentication) — that's the "email then code" login you asked for.
6. Save. Now visiting `ldhq.uk` asks for an email + code first. Test it in a private browser window.

**Adding a starter:** add their email to the policy. **Removing a leaver:** delete their email. Instant.

---

## Step 5 — Connect the editor (so Leigh & Chris can edit without code)

The editor lives at **`ldhq.uk/admin`**. It needs a one-time connection to GitHub so it can save changes. This is the only slightly techie step — **happy to do this bit with you.**

1. In `public/admin/config.yml`, check the **`repo:`** line matches your GitHub repo (e.g. `loadeddice/staff-handbook`). If you named it differently, change it, save, and push via GitHub Desktop.
2. Set up GitHub sign-in for the editor. Easiest route: deploy the free **Sveltia CMS Authenticator** (a tiny Cloudflare Worker) and create a **GitHub OAuth App**. It's a 10-minute copy-paste job — I'll give you the exact clicks when you're ready, or do it for you.
3. Once connected: go to `/admin`, sign in with GitHub, and you'll see a friendly list of pages. Click one, edit like a Word doc, hit **Save/Publish** — the site updates itself in ~1 minute, and GitHub records who changed what.

> Editors get read access to everything via Access (Step 4) **and** edit access via GitHub. Everyone else only has Access — so they're read-only, exactly as you wanted.

---

## Editing day-to-day (the whole point)

- **Read:** anyone on the staff list just visits `ldhq.uk`.
- **Edit:** you / Leigh / Chris go to `ldhq.uk/admin`.
- **Undo a mistake:** GitHub Desktop → History → right-click the change → **Revert**. Or ask me.

## Swapping the logo & colours

- Replace `public/logo.svg` with the real Loaded Dice logo (keep the filename), push via GitHub Desktop.
- Colours live at the top of `src/styles/global.css` (the `--ld-red`, `--ld-gold` etc. lines). Change the hex codes, push, done.

## Replacing the lorem ipsum

The 21 pages are dummy content so you can see it working. Rewrite them in the `/admin` editor at your pace — the titles and structure are already the real ones from the plan.

---

*Built for Loaded Dice. Keep this handbook private — it's for the team's eyes only.* 🎲
