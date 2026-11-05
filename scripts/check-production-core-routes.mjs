export const coreRoutes = ['/', '/byvanie/', '/zivot-a-vzdelavanie/'];

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
      const ok = response.status === 200 && contentType.includes('text/html') && /<html[\s>]/i.test(body);
      results.push({route, url, finalUrl, status: response.status, ok, reason: !sameOrigin ? 'unexpected_redirect_origin' : ok ? 'ok' : 'unexpected_http_or_html'});
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
