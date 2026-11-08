import {readFile, mkdir, writeFile, appendFile} from 'node:fs/promises';
const guides = JSON.parse(await readFile('src/data/guides.json', 'utf8'));
const references = new Map();
function collect(value, slug) {
  if (Array.isArray(value)) { for (const child of value) collect(child, slug); }
  else if (value && typeof value === 'object') { for (const child of Object.values(value)) collect(child, slug); }
  else if (typeof value === 'string' && value.startsWith('https://')) {
    const url = new URL(value);
    if (url.hostname === 'vsetko24.sk') return; // Internal destinations are covered by the built-site link audit.
    if (!references.has(value)) references.set(value, new Set());
    references.get(value).add(slug);
  }
}
for (const guide of guides) collect(guide, guide.slug);
const urls = [...references.keys()].sort();
async function probe(url) {
  const linkedGuides = [...references.get(url)];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(15000), headers: {accept: 'text/html,application/pdf'}});
      const type = response.headers.get('content-type') || '';
      // Read a bounded prefix only; do not store full third-party articles.
      const reader = response.body?.getReader();
      let prefix = '', bytes = 0;
      if (reader) { while (bytes < 65536) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; prefix += new TextDecoder().decode(part.value); } await reader.cancel(); }
      const title = prefix.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/<[^>]+>/g, '').trim() ?? null;
      const state = response.status === 200 ? 'reachable_not_semantically_certified' : [404,410].includes(response.status) ? 'broken' : 'unverified';
      const result = {url, finalUrl: response.url, status: response.status, type, title, state, attempt, linkedGuides};
      if (attempt === 1 && (response.status >= 500 || response.status === 429)) continue;
      return result;
    } catch (error) {
      if (attempt === 2) return {url, status: null, state: 'unverified', error: error.name, attempt, linkedGuides};
    }
  }
}
const results = [];
let next = 0;
await Promise.all(Array.from({length: 5}, async () => { while (next < urls.length) { const url = urls[next++]; const result = await probe(url); results.push(result); console.log(JSON.stringify(result)); } }));
const report = {checkedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA ?? null, guides: guides.length, scope: 'All external HTTPS URLs in guide source, detailed links and screen guides', primarySourceUrls: new Set(guides.map(g=>g.source.url)).size, uniqueSources: urls.length, reachable: results.filter(x => x.status === 200).length, broken: results.filter(x => x.state === 'broken').length, unverified: results.filter(x => x.state === 'unverified').length, semanticReview: 'HTTP availability and page titles do not certify all legal or factual details', results: results.sort((a,b) => a.url.localeCompare(b.url))};
await mkdir('quality-reports', {recursive: true});
await writeFile('quality-reports/official-sources.json', JSON.stringify(report, null, 2));
const summary = `## Official source availability\n\n${report.reachable}/${report.uniqueSources} reachable; ${report.broken} confirmed 404/410; ${report.unverified} unresolved. Semantic review remains separate.\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
if (report.broken) process.exitCode = 1;
