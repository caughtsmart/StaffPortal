// A tiny file recording which code this build came from, written at build time.
//
// The footer shows the same thing, but a page can be served to you from your
// browser's cache — so the footer can lie about how old it is. This file is read
// back by /api/health, which never caches, giving one answer that can be trusted.

import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      commit: process.env.CF_PAGES_COMMIT_SHA || null,
      branch: process.env.CF_PAGES_BRANCH || null,
      builtAt: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
