import contract from './contract.json' with {type:'json'};
export const states={done:'Hotové',progress:'Rozpracované',blocked:'Blokované',remaining:'Zostávajúce'};
export const reasons={ok:'Overené',http:'HTTP chyba',html:'Neplatné HTML',h1:'Nezhoda H1',origin:'Cudzia doména',redirect:'Presmerovanie',dns:'Chyba DNS sondy',timeout:'Časový limit',network:'Sieť sondy'};
const evidence={
  1:['docs/TECHNICAL-AUDIT.md'],2:['docs/BRANCH-PROTECTION.md'],3:['src/data/content-taxonomy.json'],4:['src/pages/sitemap.xml.ts'],
  5:['src/pages/index.astro'],6:['src/pages/byvanie.astro','src/pages/zivot-a-vzdelavanie.astro'],7:['src/lib/search.mjs'],8:['src/pages/pristupnost.astro'],
  9:['src/data/calculators.json'],10:['src/pages/kalkulacky/naklady-na-byvanie.astro'],11:['src/pages/auto/porovnanie-nakladov.astro'],12:['tests/calculations.test.mjs'],
  13:['src/pages/zalozenie-zivnosti.astro'],14:['src/pages/umrtie-v-rodine.astro'],15:['src/pages/kupa-nehnutelnosti.astro'],16:['src/pages/generator-reklamacie.astro'],
  17:['src/data/guides.json'],18:['src/pages/navody/[slug].astro'],19:['scripts/check-internal-links.mjs','tests/internal-links.test.mjs'],20:['src/pages/kalendar.astro'],
  21:['src/pages/ai.astro','tests/assistant-production-smoke.test.mjs'],22:['tests/browser-layout.mjs'],23:['src/pages/ochrana-sukromia.astro','src/pages/pristupnost.astro'],24:[]
};
const related={1:[178],2:[164],3:[174],4:[177],6:[172,173],10:[192,195,196,197,198],13:[187,199],14:[188,199],15:[186,200],16:[185]};
const featureRoute={10:6,13:3,14:4,15:2,16:1};
export function reconcile(repo,report,decisions=[]){
  if(!repo)return [];
  const unique=new Map();
  for(const task of repo.tasks){
    const idx=Number(task.id.split('-')[1]);
    const refs=new Set(related[idx]||[]);
    for(const p of [...repo.pulls,...repo.merged])if(new RegExp('\\b'+task.id+'\\b').test(p.title))refs.add(p.id);
    const completed=repo.merged.filter(p=>refs.has(p.id));
    const active=repo.pulls.filter(p=>refs.has(p.id));
    const files=(evidence[idx]||[]).filter(p=>repo.paths.includes(p));
    const livePath=contract[featureRoute[idx]]?.path;
    const live=report?.rows?.find(r=>r.path===livePath);
    let state='remaining',reason='Zostáva preveriť rozsah a doložiť implementáciu.';
    if(files.length||completed.length||active.length){state='progress';reason='Existuje podklad v main alebo PR. Zostáva overiť celý rozsah úlohy.'}
    if(idx===2&&repo.issues.some(i=>i.id===137)){state='blocked';reason='Otvorená závislosť #137 na ochrane vetvy main.'}
    if(task.checked||task.closed){state='done';reason=task.checked?'Položka je odškrtnutá v zdrojovom issue.':'Nadradená etapa je v GitHube uzavretá ako dokončená.'}
    if(live?.reason==='ok' && completed.length){reason='Implementácia je v main a trasa prešla obsahovou kontrolou. Zostáva funkčná akceptácia.'}
    const override=decisions.find(d=>d.task===task.id);
    if(override){state=override.state;reason=override.note}
    unique.set(task.id,{...task,state,reason,override:!!override,files,completed,active,livePath});
  }
  return [...unique.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
export function verdict(repo,probe,decisions=[],now=Date.now()){
  const rows=probe?.rows||[],ok=rows.slice(0,7).filter(r=>r.reason==='ok').length, core=rows.slice(7).filter(r=>r.reason==='ok').length;
  const tasks=reconcile(repo,probe,decisions);
  const freshRepo=!!repo && now-Date.parse(repo.fetched)<2*3600000;
  const freshProbe=!!probe && now-Date.parse(probe.checked)<2*3600000;
  const gates=[
    {label:'Sedem V3 trás',ok:ok===7,detail:ok+'/7 · HTTP 200, HTML a presný H1'},
    {label:'Tri trasy jadra',ok:core===3,detail:core+'/3 · úvod, bývanie, život a vzdelávanie'},
    {label:'Identita produkčného nasadenia',ok:!!probe?.sha&&probe.sha===repo?.main,detail:probe?.sha?probe.sha.slice(0,12)+' · kandidát '+(repo?.main?.slice(0,12)||'—'):probe?.method||'Chýba produkčné SHA'},
    {label:'CI pre aktuálny head #182',ok:repo?.pr?.ci?.status==='success',detail:repo?.pr?.head?.slice(0,8)||'Chýba záznam CI'},
    {label:'Nezávislé review a merge #182',ok:!!repo?.pr?.approved&&!!repo.pr.merged,detail:repo?.pr?.merged?'PR zlúčený · revízia podľa aktuálneho SHA':'Čaká na review a zlúčenie'},
    {label:'Aktuálnosť merania a kontraktu',ok:freshRepo&&freshProbe&&repo?.pr?.contractOk,detail:'GitHub a sonda do 2 h · kontrakt z PR #182'},
    {label:'Akceptácia rozsahu V3',ok:tasks.length>0&&tasks.every(t=>t.state==='done'),detail:tasks.filter(t=>t.state==='done').length+'/'+tasks.length+' úloh uzavretých alebo posúdených'}
  ];
  const ready=gates.every(g=>g.ok),failed=rows.find(r=>r.reason!=='ok');
  const next=!repo?'Načítať údaje zo súkromného repozitára.':!probe?'Spustiť nezávislú kontrolu produkčných trás.':failed&&['dns','timeout','network'].includes(failed.reason)?'Zopakovať meranie z nezávislej siete pre '+failed.path:failed?'Preveriť '+failed.path+' a zopakovať kontrolu.':!probe.sha?'Overiť produkčné SHA v Cloudflare Pages.':probe.sha!==repo.main?'Porovnať identitu produkčného buildu s kandidátom main.':!repo.pr.approved?'Získať nezávislé review PR #182.':!repo.pr.merged?'Dokončiť PR #182 podľa pravidiel repozitára.':!freshRepo||!freshProbe?'Obnoviť dôkazy z GitHubu a produkcie.':!repo.pr.contractOk?'Zosúladiť očakávané H1 s novou revíziou #182.':!ready?'Preveriť prvú neuzavretú položku akceptácie.':'Potvrdiť vydanie podľa uložených dôkazov.';
  return {ok,core,gates,ready,next};
}
