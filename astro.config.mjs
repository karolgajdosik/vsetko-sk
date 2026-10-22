import { defineConfig } from 'astro/config';

// Canonical production URL. Keep this in sync with the primary Cloudflare Pages custom domain.
export default defineConfig({
  site: 'https://vsetko24.sk',
  output: 'static',
  trailingSlash: 'always'
});
