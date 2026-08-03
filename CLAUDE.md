# CLAUDE.md — Loaded Dice Staff Handbook

Context for Claude Code working in this repo. Read this first.

## What this is

A **private, login-gated internal staff handbook** for Loaded Dice (a tabletop games shop).
Staff read procedures; a few managers edit them. Built as a static site, same pattern as
the owner's UAP Times site (Astro + Cloudflare + GitHub Desktop).

- **Live domain:** `ldhq.uk` (dedicated domain on Cloudflare; `staff.loadeddice.uk` not used — loadeddice.uk DNS lives at Squarespace)
- **Hosting:** Cloudflare Pages (free)
- **Login wall:** Cloudflare Access, email → one-time PIN (free ≤50 users)
- **Editors (edit rights):** graham@loadeddice.uk, leigh@loadeddice.uk, chris@loadeddice.uk
- **Everyone else:** read-only (they only get past Cloudflare Access)
- **Owner:** Graham. Novice coder, learning — explain changes in plain English, keep it simple.

## Tech stack

- **Astro 4** static site (`output: static`, directory URLs)
- **Content Collections** — procedures are markdown files with typed frontmatter
- **Pagefind** — static full-text search, generated at build time
- **Sveltia CMS** — Decap-compatible web editor at `/admin` (GitHub backend)

## Commands

```bash
npm install        # first time
npm run dev        # local dev server (search won't work in dev — needs a build)
npm run build      # astro build + pagefind index → dist/
npm run preview    # preview the built dist/
```

Node 20+ required (Cloudflare Pages: set env var `NODE_VERSION=20`).

## Project structure

```
src/
  content/
    config.ts              # frontmatter schema for procedures
    procedures/*.md         # ONE FILE PER PAGE (currently lorem ipsum)
  sections.ts               # ORDER of sections in the left menu
  layouts/Base.astro        # header, sidebar, search, footer
  components/Sidebar.astro   # groups pages by section, current-page highlight
  pages/
    index.astro             # home (cards grouped by section)
    [...slug].astro          # renders each procedure
  styles/global.css          # ALL styling + brand colour variables (top of file)
public/
  admin/index.html          # Sveltia CMS loader
  admin/config.yml          # CMS config (collections, fields, GitHub repo)
  logo.svg / favicon.svg    # placeholder Loaded Dice logo (swap for real)
```

## Content model (frontmatter on every procedure)

```yaml
title: "Opening the Shop"
section: "Opening & Closing"   # must match a name in src/sections.ts
order: 1                        # position within its section (low = top)
summary: "Morning open checklist."
updated: 2026-07-02             # date only
updatedBy: "Leigh"
```

The page **body** is the markdown after the frontmatter. Slug/URL = the filename.

## How to make common changes

- **Add a page:** create `src/content/procedures/<slug>.md` with the frontmatter above. It
  appears in the menu + home automatically under its `section`.
- **Add/reorder a section:** edit the list in `src/sections.ts`. Sections not listed there
  fall to the bottom.
- **Change branding:** colours are CSS variables at the top of `src/styles/global.css`
  (`--ld-red`, `--ld-gold`, `--ld-ink`, etc.). Logo = replace `public/logo.svg` (keep the name).
- **Everything is private:** pages carry `noindex`; never make this publicly crawlable.
- **British English** throughout (en-GB).

## Deployment (already documented in README-DEPLOY.md)

Cloudflare Pages build settings: build command `npm run build`, output dir `dist`,
env `NODE_VERSION=20`. Custom domain `ldhq.uk`. Then Cloudflare Access
policy allowing the staff emails, One-time PIN enabled.

## Outstanding / next tasks

1. **[TECHY — main open item] Connect the editor's GitHub auth.** Sveltia CMS needs GitHub
   OAuth to save. Deploy the Sveltia CMS Authenticator (Cloudflare Worker) + create a GitHub
   OAuth App, then confirm `repo:` in `public/admin/config.yml` matches the real repo.
2. **Replace lorem ipsum** — the 21 pages are placeholders with real titles/structure.
3. **Swap the placeholder logo** for the real Loaded Dice logo.
4. Optional: quarterly "review stale pages" reminder; image uploads via CMS (`public/uploads`).

## Conventions for Claude Code

- Keep dependencies minimal (it's a static site — resist adding frameworks).
- Explain what you changed and why, in plain English (owner is learning).
- Test with `npm run build` before claiming something works; search only exists after a build.
- Don't commit `node_modules/`, `dist/`, `.astro/` (see `.gitignore`).
