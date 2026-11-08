import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('AI search splits on whitespace and removes Slovak accents',()=>{
 const source=read('src/pages/ai.astro');
 assert.match(source,/split\(\/\\s\+\/\)/);
 assert.match(source,/replace\(\/\[\\u0300-\\u036f\]\/g/);
 assert.doesNotMatch(source,/split\(\/\\\\s\+\/\)/);
});

test('AI dynamic chat classes retain globally scoped Astro styles',()=>{
 const source=read('src/pages/ai.astro');
 assert.ok(source.includes("div.className='ai-message '+role"),'Runtime-created chat bubbles must have the expected classes');
 assert.ok(source.includes("links.className='ai-sources'"),'Runtime-created source links must have the expected class');
 assert.ok(source.includes("official.className='ai-sources'"),'Official source links must share the styled class');
 for(const selector of ['ai-message','ai-bot','ai-user','ai-sources']){
  assert.ok(source.includes(':global(.'+selector+')'),'Dynamic .'+selector+' must not be scoped away by Astro');
 }
 for(const selector of [':global(.ai-sources strong)',':global(.ai-sources a)',':global(.ai-message){max-width:100%}']){
  assert.ok(source.includes(selector),'Missing dynamic source-link or mobile style: '+selector);
 }
});

test('AI chat renders only allowlisted official sources using a shared URL validator',()=>{
 const source=read('src/pages/ai.astro');
 assert.ok(source.includes("import {trustedOfficialUrl} from '../lib/official-sources.mjs'"));
 assert.ok(source.includes('const trustedUrl=trustedOfficialUrl(source?.url)'));
 assert.ok(source.includes('a.href=trustedUrl'));
 assert.ok(!source.includes("source.url.startsWith('https://www.slovensko.sk/')"),'Old single-domain filter must not hide verified NBS and justice.gov.sk links');
});

test('suite uses local ISO dates instead of locale-specific date strings',()=>{
 const source=read('src/pages/nastroje/[slug].astro');
 assert.match(source,/function localDateISO\(/);
 assert.doesNotMatch(source,/toLocaleDateString\('en-CA'\)/);
});
test('header contains a more-menu and versioned CSS asset',()=>{
 const source=read('src/layouts/Base.astro');
 assert.match(source,/class="nav-more"/);
 assert.match(source,/site\.css\?v=4\.\d+\.\d+/);
});

test('all key portal sections use contextual photographic headers',()=>{
 const source=read('src/layouts/Base.astro');
 for(const section of ['financie','kalkulacky','auto','urady','navody','sprievodca','sluzby','nastroje','data','ai']){
  assert.ok(source.includes(section+':['),section+' should have an image');
 }
 assert.match(source,/class="section-photo"/);
});

test('mobile navigation provides five direct functional section links',()=>{
 const source=read('src/layouts/Base.astro');
 assert.match(source,/class="mobile-bottom-nav"/);
 assert.match(source,/class="mobile-quick-actions"/);
 for(const href of ['/sluzby/','/kalkulacky/','/ai/','/navody/','/moje-centrum/'])assert.ok(source.includes('href="'+href+'"'));
 const css=read('public/site.css');
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.mobile-bottom-nav/);
});

test('mobile accessibility controls and guide index are functional',()=>{
 const source=read('src/layouts/Base.astro');
 assert.match(source,/id="mobile-theme-toggle"/);
 assert.match(source,/id="mobile-font-up"/);
 assert.match(source,/getElementById\('mobile-theme-toggle'\)/);
 assert.match(source,/getElementById\('mobile-font-up'\)/);
 assert.match(read('src/pages/navody/index.astro'),/guides\.map/);
});

test('sitemap includes all main navigable section indexes and key comparison tools',()=>{
 const sitemap=read('src/pages/sitemap.xml.ts');
 for(const route of ['/navody/','/kalkulacky/','/financie/porovnanie-hypotek/','/auto/porovnanie-nakladov/','/pristupnost/']){
  assert.ok(sitemap.includes("'"+route+"'"),'Sitemap missing '+route);
 }
});

test('page titles use current brand and theme toggle exposes accessible state',()=>{
 const base=read('src/layouts/Base.astro');
 assert.match(base,/title === 'VŠETKO24.sk'/);
 assert.match(base,/id="mobile-theme-toggle" aria-pressed="false"/);
 assert.match(base,/noindex,follow/);
 assert.match(read('src/pages/404.astro'),/VŠETKO24.sk/);
});

test('homepage and fulltext use the same ranked search module',()=>{
 const home=read('src/pages/index.astro');
 const fulltext=read('src/pages/hladat.astro');
 assert.match(home,/import \{searchPortal\} from '\.\.\/lib\/search\.mjs'/);
 assert.match(fulltext,/import \{searchPortal\} from '\.\.\/lib\/search\.mjs'/);
});

test('obsolete mortgage calculator URL redirects to a published calculator',()=>{
 const redirects=read('public/_redirects');
 assert.match(redirects,/\/kalkulacky\/hypoteka\/\s+\/kalkulacky\/dostupnost-hypoteky\/\s+301/);
 const home=read('src/pages/index.astro');
 assert.doesNotMatch(home,/href="\/kalkulacky\/hypoteka\/"/);
 const calculators=JSON.parse(read('src/data/calculators.json'));
 assert.ok(calculators.some(x=>x.slug==='dostupnost-hypoteky'));
});

test('production monitor only fails when UI or API smoke check actually fails',()=>{
 const workflow=read('.github/workflows/production-api-health.yml');
 assert.ok(workflow.split('\n').some(line => line.includes('if: ${{') && line.includes("steps.ui.outcome == 'failure'") && line.includes("steps.mobile.outcome == 'failure'") && line.includes("steps.assistantBrowser.outcome == 'failure'")), 'UI, mobile and AI browser failures must all fail production monitoring');
 assert.ok(workflow.includes("steps.mobile.outcome == 'failure'"),'Mobile browser result must be included in outage reporting');
 assert.ok(workflow.includes("if: ${{ steps.health.outcome == 'failure' || steps.assistant.outcome == 'failure' }}"),'API and assistant failure conditions must both fail production monitoring');
 assert.ok(workflow.includes("steps.assistant.outcome == 'failure'"),'Assistant failure must be included in outage reporting');
 assert.ok(workflow.includes('run: node scripts/check-production-assistant.mjs'),'Production assistant smoke must be executed');
 assert.ok(!workflow.includes('if: \\${{'),'Failure conditions must not be escaped');
});

test('RPO lookup provides official fallback only on lookup errors',()=>{
 const source=read('src/pages/data/firmy.astro');
 assert.match(source,/id="rpo-fallback"[^>]*hidden/);
 assert.match(source,/https:\/\/rpo\.minv\.sk\/new\//);
 assert.match(source,/getElementById\('rpo-fallback'\)\.hidden=true/);
 assert.match(source,/getElementById\('rpo-fallback'\)\.hidden=false/);
});

test('production RPO monitor rejects empty company results and requires exact IČO',()=>{
 const source=read('scripts/check-production-apis.mjs');
 assert.match(source,/data\.ico==='31333532'/);
 assert.match(source,/data\.results\.some\(/);
 assert.match(source,/x\.identifier==='31333532'/);
 assert.match(source,/x\.name\.trim\(\)\.length>0/);
});

test('mobile search has accessible results and touch-friendly controls',()=>{
 const source=read('src/pages/hladat.astro');
 assert.match(source,/enterkeyhint="search"/);
 assert.match(source,/aria-controls="fulltext-results"/);
 assert.match(source,/id="result-count" aria-live="polite"/);
 assert.match(source,/\.finder-input button\{[^}]*min-height:48px/);
 assert.match(source,/@media\(max-width:520px\)/);
 assert.match(source,/\.finder-input input\{font-size:16px;min-height:48px\}/);
 assert.match(source,/\.finder-result:focus-visible/);
});

test('navigation highlights parent sections on nested routes without marking homepage',()=>{
 const source=read('src/layouts/Base.astro');
 assert.match(source,/const activeNav=\(href\)=>href==='\/'\?path==='\/':path===href\|\|path\.startsWith\(href\)/);
 assert.match(source,/aria-current=\{activeNav\(href\)\?'page':undefined\}/);
});

test('finance hub exposes verified task-first links to published calculators',()=>{
 const source=read('src/pages/financie.astro');
 for(const route of ['/kalkulacky/dostupnost-hypoteky/','/financie/porovnanie-hypotek/','/kalkulacky/refinancovanie/','/kalkulacky/financna-rezerva/','/kalkulacky/sporenie/','/kalkulacky/inflacia/'])assert.ok(source.includes('href="'+route+'"'),'Missing finance shortcut '+route);
 assert.match(source,/aria-labelledby="finance-tasks"/);
 assert.match(source,/Výpočty sú orientačné/);
});

test('homepage SEO metadata uses the current brand in search and social previews',()=>{
 const home=read('src/pages/index.astro');
 const base=read('src/layouts/Base.astro');
 const description=home.match(/<Base[^>]*\bdescription="([^"]+)"/)?.[1];
 assert.ok(description,'Homepage must provide a description');
 assert.match(description,/^VŠETKO24\.sk – /);
 assert.match(description,/kalkulačky/);
 assert.match(description,/financiách, aute a úradoch/);
 assert.doesNotMatch(description,/VŠETKO\.sk/);
 assert.match(base,/<meta name="description" content=\{description\}/);
 assert.match(base,/<meta property="og:description" content=\{description\}/);
});


test('mortgage guide renders practical comparison advice only when present',()=>{
 const guides=JSON.parse(read('src/data/guides.json'));
 const mortgage=guides.find(x=>x.slug==='porovnanie-hypotek');
 assert.ok(mortgage,'Mortgage guide must exist');
 assert.match(mortgage.description,/RPMN/);
 assert.equal(mortgage.practical?.length,5);
 for(const item of mortgage.practical){
  assert.ok(item.title?.length>8,'Practical tip needs a meaningful heading');
  assert.ok(item.body?.length>60,'Practical tip needs actionable guidance');
 }
 assert.equal(guides.filter(x=>Array.isArray(x.practical) && x.practical.length>0).length,guides.length,'Every published guide must have practical advice');
 const template=read('src/pages/navody/[slug].astro');
 assert.match(template,/guide\.practical\?\.length > 0 && <li><a href="#prakticke-tipy">/);
 assert.match(template,/guide\.practical\?\.length > 0 && <section class="panel" id="prakticke-tipy">/);
 assert.match(template,/guide\.practical\.map\(item=><article><h3>\{item\.title\}<\/h3><p>\{item\.body\}<\/p><\/article>\)/);
});


test('refinancing guide has actionable tips and preserves conditional rendering for other guides',()=>{
 const guides=JSON.parse(read('src/data/guides.json'));
 const refinancing=guides.find(x=>x.slug==='refinancovanie-uveru');
 assert.ok(refinancing,'Refinancing guide must exist');
 assert.match(refinancing.description,/celkovými nákladmi/);
 assert.equal(refinancing.practical?.length,5);
 for(const tip of refinancing.practical){
  assert.ok(tip.title?.length>8,'Practical tip needs a meaningful heading');
  assert.ok(tip.body?.length>60,'Practical tip needs actionable guidance');
 }
 assert.ok(refinancing.practical.some(x=>/predĺženia splatnosti/.test(x.body)),'Explain the longer-term cost risk');
 assert.ok(refinancing.practical.some(x=>/predčasného splatenia/.test(x.body)),'Mention early repayment conditions');
 const otherGuides=guides.filter(x=>!['porovnanie-hypotek','refinancovanie-uveru','domace-nabijanie','stk-priprava'].includes(x.slug));
 assert.ok(otherGuides.every(x=>Array.isArray(x.practical) && x.practical.length>0),'Every additional guide must have practical tips');
 const template=read('src/pages/navody/[slug].astro');
 assert.match(template,/guide\.practical\?\.length > 0 && <section class="panel" id="prakticke-tipy">/);
});


test('home EV charging guide explains safe installation, realistic power and charging costs',()=>{
 const guides=JSON.parse(read('src/data/guides.json'));
 const charging=guides.find(x=>x.slug==='domace-nabijanie');
 assert.ok(charging,'Home charging guide must exist');
 assert.match(charging.description,/wallbox/);
 assert.equal(charging.practical?.length,5);
 for(const tip of charging.practical){
  assert.ok(tip.title?.length>8,'Each practical tip needs a meaningful heading');
  assert.ok(tip.body?.length>60,'Each practical tip needs actionable guidance');
 }
 assert.ok(charging.practical.some(x=>/kvalifikovaného elektrikára/.test(x.body)),'Recommend qualified assessment');
 assert.ok(charging.practical.some(x=>/palubnej nabíjačky/.test(x.body)),'Charging power must account for the car');
 assert.ok(charging.practical.some(x=>/ochranné prvky/.test(x.body)),'Safety protections must be mentioned');
 assert.ok(charging.practical.some(x=>/stratami pri nabíjaní/.test(x.body)),'Cost estimate must account for charging losses');
 const template=read('src/pages/navody/[slug].astro');
 assert.ok(template.includes('guide.practical?.length > 0 && <section class="panel" id="prakticke-tipy">'),'Home charging tips must use the conditional guide section');
});


test('STK preparation guide offers vehicle-specific checks without unsupported legal deadlines',()=>{
 const guides=JSON.parse(read('src/data/guides.json'));
 const stk=guides.find(x=>x.slug==='stk-priprava');
 assert.ok(stk,'STK guide must exist');
 assert.match(stk.description,/pneumatiky/);
 assert.equal(stk.practical?.length,5);
 for(const tip of stk.practical){
  assert.ok(tip.title?.length>8,'STK advice needs a clear heading');
  assert.ok(tip.body?.length>60,'STK advice needs an actionable explanation');
 }
 assert.ok(stk.practical.some(x=>/svetl/.test(x.title+' '+x.body)),'Include lighting checks');
 assert.ok(stk.practical.some(x=>/pneumatik/.test(x.title+' '+x.body)),'Include tyre checks');
 assert.ok(stk.practical.some(x=>/brzd/.test(x.title+' '+x.body)),'Include brake safety');
 assert.ok(stk.practical.some(x=>/doklad/.test(x.title+' '+x.body)),'Include document preparation');
 assert.ok(stk.steps.every(step=>!/podaním žiadosti|podpisom zmluvy/.test(step)),'No generic application instructions in STK steps');
 assert.ok(stk.steps.some(step=>/podľa typu vozidla/.test(step)),'Emissions check must be conditional on vehicle type');
 assert.ok(stk.practical.some(x=>/overte podľa typu vozidla/.test(x.body)),'Avoid asserting one legal tyre limit for all vehicles');
 const template=read('src/pages/navody/[slug].astro');
 assert.ok(template.includes('guide.practical?.length > 0 && <section class="panel" id="prakticke-tipy">'),'Only guides with practical tips render the section');
});
