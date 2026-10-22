import type { APIRoute } from 'astro';
export const GET: APIRoute = ({site}) => {
 const url = new URL('/sitemap.xml', site ?? 'https://vsetko-sk.pages.dev');
 return new Response(`User-agent: *\nAllow: /\nSitemap: ${url.href}\n`, {headers:{'Content-Type':'text/plain; charset=utf-8'}});
};
