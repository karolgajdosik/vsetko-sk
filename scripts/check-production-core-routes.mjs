export const expectedHeadings = Object.freeze({
  '/byvanie/': 'Bývanie a nehnuteľnosti',
  '/zivot-a-vzdelavanie/': 'Práca, rodina a vzdelávanie',
  '/faq/': 'Časté otázky',
  '/generator-reklamacie/': 'Generátor reklamačného listu',
  '/kupa-nehnutelnosti/': 'Kúpa nehnuteľnosti: na čo nezabudnúť',
  '/zalozenie-zivnosti/': 'Založenie živnosti: kontrolný zoznam',
  '/umrtie-v-rodine/': 'Úmrtie v rodine: čo treba vybaviť',
  '/strata-dokladov/': 'Strata dokladov: čo urobiť ako prvé',
  '/kalkulacky/naklady-na-byvanie/': 'Koľko vás skutočne stojí bývanie?',
});
export const coreRoutes = ['/', ...Object.keys(expectedHeadings)];
function pageHeading(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
}

export function classifyProbeError(error) {
  const code = error?.cause?.code || error?.code || '';
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(code)) return 'dns_unresolved';
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout';
  return 'network_error';
}

export async function probeCoreRoutes({origin = 'https://vsetko24.sk', fetchImpl = fetch, timeoutMs = 10000, routes = coreRoutes} = {}) {
  const results = [];
  for (const route of routes) {
    const url = new URL(route, origin).href;
    try {
      const response = await fetchImpl(url, {method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: {accept: 'text/html'}});
      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();
      const finalUrl = response.url || url;
      const sameOrigin = new URL(finalUrl).origin === new URL(url).origin;
      const htmlOk = sameOrigin && response.status === 200 && contentType.includes('text/html') && /<html[\s>]/i.test(body);
      const expectedHeading = expectedHeadings[route] ?? null;
      const heading = pageHeading(body);
      const headingOk = !expectedHeading || heading === expectedHeading;
      const ok = htmlOk && headingOk;
      results.push({route, url, finalUrl, status: response.status, ok, expectedHeading, observedHeading: heading, reason: !sameOrigin ? 'unexpected_redirect_origin' : !htmlOk ? 'unexpected_http_or_html' : !headingOk ? 'unexpected_page_heading' : 'ok'});
    } catch (error) {
      results.push({route, url, status: null, ok: false, reason: classifyProbeError(error)});
    }
  }
  return {ok: results.every(item => item.ok), results};
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const result = await probeCoreRoutes();
  console.log(JSON.stringify({checkedAt: new Date().toISOString(), ...result}, null, 2));
  if (!result.ok) process.exitCode = 1;
}
