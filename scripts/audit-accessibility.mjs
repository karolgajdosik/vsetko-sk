import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {readdir, mkdir, writeFile, appendFile} from 'node:fs/promises';
async function pages(dir = 'dist') {
  const found = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = dir + '/' + entry.name;
    if (entry.isDirectory()) found.push(...await pages(path));
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}
const routes = (await pages()).map(p => p.slice(4).replace(/index\.html$/, ''));
const core = ['/', '/ai/', '/hladat/', '/byvanie/', '/kalkulacky/', '/kalkulacky/cista-mzda/', '/kalkulacky/naklady-na-byvanie/', '/auto/porovnanie-nakladov/', '/kalendar/', '/generator-reklamacie/', '/ochrana-sukromia/', '/pristupnost/', '/metriky/'];
const variants = [...routes.map(route => ({route, width: 390, theme: 'light'})), ...core.flatMap(route => [{route, width: 1280, theme: 'light'}, {route, width: 390, theme: 'dark'}])];
const report = {checkedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA ?? null, engine: 'axe-core WCAG 2 A/AA, 2.1 A/AA, 2.2 AA', limitation: 'Automated coverage only; manual screen-reader, usability and full conformance review remain necessary', results: []};
await mkdir('quality-reports', {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  for (const variant of variants) {
    const context = await browser.newContext({viewport: {width: variant.width, height: 900}, colorScheme: variant.theme});
    const page = await context.newPage();
    try {
      const response = await page.goto('http://127.0.0.1:4321' + variant.route, {waitUntil: 'load', timeout: 20000});
      if (response.status() !== 200) throw new Error('HTTP ' + response.status());
      const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
      const item = {...variant, violations: results.violations.map(v => ({id:v.id, impact:v.impact, help:v.help, helpUrl:v.helpUrl, nodes:v.nodes.map(n=>({target:n.target, summary:n.failureSummary}))})), incomplete:results.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})), passes:results.passes.length};
      report.results.push(item);
      console.log(JSON.stringify({route: variant.route, width: variant.width, theme: variant.theme, violations:item.violations.length, incomplete:item.incomplete.length}));
      if (core.includes(variant.route)) {
        await page.keyboard.press('Tab');
        item.skipLinkFocused = await page.locator('.skip').evaluate(el => el === document.activeElement);
        if (!item.skipLinkFocused) item.keyboardError = 'First keyboard stop is not the skip link';
      }
    } catch (error) { report.results.push({...variant, error: error.message}); }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
report.variants = report.results.length;
report.violationInstances = report.results.reduce((sum,x)=>sum+(x.violations?.length||0),0);
report.errors = report.results.filter(x=>x.error||x.keyboardError).length;
await writeFile('quality-reports/accessibility.json', JSON.stringify(report,null,2));
const summary = `## Automated accessibility audit\n\n${routes.length} pages; ${report.variants} display variants; ${report.violationInstances} violation instances; ${report.errors} execution/keyboard errors. Manual conformance review remains open.\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
if (report.violationInstances || report.errors) process.exitCode=1;
