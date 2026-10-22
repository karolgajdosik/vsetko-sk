import { defineConfig } from 'astro/config';

// Change SITE_URL in Cloudflare Pages when the custom domain is connected.
export default defineConfig({
  site: process.env.SITE_URL || 'https://vsetko-sk.pages.dev',
  output: 'static',
  trailingSlash: 'always'
});
