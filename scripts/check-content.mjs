import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const guides=read('src/data/guides.json'),search=read('src/data/search.json'),calc=read('src/data/calculators.json');
assert.ok(guides.length>=40);assert.equal(calc.length+3,18);
const slugs=new Set();for(const g of guides){assert.ok(!slugs.has(g.slug),'duplicate guide: '+g.slug);slugs.add(g.slug);assert.ok(g.steps.length>=3);assert.ok(g.audience?.length>10);assert.ok(g.preparation?.length>=2);assert.ok(g.verification?.length>10);assert.ok(g.source.url.startsWith('https://'));}
const details=read('src/data/guide-details.json');
for(const slug of Object.keys(details))assert.ok(slugs.has(slug),'orphan detailed guide: '+slug);
for(const guide of guides){const detail=guide.detail??details[guide.slug];assert.ok(detail,'missing detailed guide: '+guide.slug);assert.ok(detail.before?.length>=3,'missing preparation: '+guide.slug);assert.ok(detail.detailed?.length>=4,'incomplete procedure: '+guide.slug);assert.ok(detail.pitfalls?.length>=3,'missing pitfalls: '+guide.slug);assert.ok(detail.outcome?.length>15,'missing outcome: '+guide.slug);for(const step of detail.detailed)assert.ok(step.title?.length>3&&step.body?.length>30,'empty detailed step: '+guide.slug);}
const scenarios=read('src/data/scenarios.json');assert.ok(scenarios.length>=15);for(const s of scenarios){assert.ok(s.guides.length>0);for(const slug of s.guides)assert.ok(slugs.has(slug),'unknown guide '+slug);}const urls=new Set();for(const item of search){assert.ok(!urls.has(item.url),'duplicate search URL: '+item.url);urls.add(item.url);if(item.url.startsWith('/navody/'))assert.ok(slugs.has(item.url.split('/')[2]));}
for(const t of calc)assert.ok(urls.has('/kalkulacky/'+t.slug+'/'));
assert.ok(existsSync('src/pages/kalkulacky/[slug].astro'));console.log('Content integrity passed:',guides.length,'guides,',calc.length+3,'calculators.');

const operations=read('src/data/site-operations.json');
assert.match(operations.privacyEmail,/^[^\s@]+@vsetko24\.sk$/,'privacy contact must use the project domain');
assert.equal(typeof operations.privacyEmailActive,'boolean');
if(operations.privacyEmailActive)assert.ok(operations.privacyEmailVerifiedAt && Number.isFinite(Date.parse(operations.privacyEmailVerifiedAt)),'active privacy email requires a real verification timestamp');
