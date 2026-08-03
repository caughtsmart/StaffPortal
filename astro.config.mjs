import { defineConfig } from 'astro/config';

// Loaded Dice — Staff Handbook
// Static site. Deploys to Cloudflare Pages.
// Update `site` to the live URL once the domain is set up.
export default defineConfig({
  site: 'https://ldhq.uk',
  build: {
    format: 'directory',
  },
});
