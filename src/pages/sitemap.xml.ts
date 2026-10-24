import type { APIRoute } from 'astro';
import guides from '../data/guides.json';
import calculators from '../data/calculators.json';
import scenarios from '../data/scenarios.json';
import hubs from '../data/hubs.json';
import tools from '../data/suite-tools.json';
const paths = ['/', '/sluzby/', '/ai/', '/kalendar/', '/moje-centrum/', '/dokumenty/', '/hladat/', ...hubs.map(h=>`/sluzby/${h.slug}/`), ...tools.map(t=>`/nastroje/${t.slug}/`), '/financie/', '/auto/', '/urady/', '/o-projekte/', '/kontakt/', '/ochrana-sukromia/', '/kalkulacky/', '/navody/', '/financie/porovnanie-hypotek/', '/auto/porovnanie-nakladov/', '/kalkulacky/naklady-na-auto/', '/sprievodca/', '/data/', '/data/kurzy/', '/data/firmy/', '/data/nabijacky/', '/data/ukazovatele/', '/data/hypoteky-nbs/', '/data/statdata/', '/pristupnost/', ...scenarios.map(s=>`/sprievodca/${s.slug}/`),...calculators.map(t=>`/kalkulacky/${t.slug}/`),...guides.map(g=>`/navody/${g.slug}/`)];
export const GET: APIRoute = ({site}) => {
 const origin=site ?? new URL('https://vsetko24.sk');
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>`<url><loc>${new URL(path,origin).href}</loc></url>`).join('')+'</urlset>';
 return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
};
