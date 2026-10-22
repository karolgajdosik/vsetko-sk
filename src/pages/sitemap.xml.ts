import type { APIRoute } from 'astro';
const paths = ['/', '/financie/', '/auto/', '/urady/', '/o-projekte/', '/kontakt/', '/ochrana-sukromia/'];
export const GET: APIRoute = ({site}) => {
  const origin = site ?? new URL('https://vsetko24.sk');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    paths.map(path => `<url><loc>${new URL(path, origin).href}</loc></url>`).join('') +
    '</urlset>';
  return new Response(xml, {headers:{'Content-Type':'application/xml; charset=utf-8'}});
};
