import { isCaseDate } from './case-follow-up.mjs';
import { contractNoticeDate } from './contract-store.mjs';
export const HOUSEHOLD_KEY = 'v24-household-v9';
export const FILE_MAX = 512 * 1024;
export const FILE_TOTAL = 1024 * 1024;
export const CASE_SOURCES = {
 'v24-v7-contract-end-v1': {label:'Koniec zmluvy',href:'/vyriesit/koniec-zmluvy/'},
 'v24-v7-complaint-cases-v1': {label:'Reklamácia',href:'/vyriesit/reklamacia-nakupu/'},
 'v24-v7-service-cases-v1': {label:'Zdraženie',href:'/vyriesit/zdrazena-sluzba/'}
};
export const JOURNEYS = {
 insurance:{label:'Koniec poistky',steps:[['check','Overiť zmluvu a dátum','/moje-zmluvy/'],['compare','Porovnať ponuky a náklady','/porovnanie-rozhodnuti/'],['case','Vybaviť prípad konca zmluvy','/vyriesit/koniec-zmluvy/'],['document','Priložiť potvrdenie výsledku','#documents'],['finish','Potvrdiť výsledok a upraviť platby','/moje-zmluvy/']],required:['Zmluva','Potvrdenie výsledku']},
 complaint:{label:'Reklamácia',steps:[['evidence','Pripraviť doklad a opis vady','#documents'],['case','Založiť a vybaviť reklamáciu','/vyriesit/reklamacia-nakupu/'],['reply','Zaznamenať odpoveď a výsledok','/vyriesit/'],['finish','Priložiť výsledok a uzavrieť','#documents']],required:['Doklad o kúpe','Odpoveď']},
 moving:{label:'Sťahovanie',steps:[['budget','Naplánovať jednorazové náklady','#finance'],['contracts','Skontrolovať zmluvy a služby','/moje-zmluvy/'],['checklist','Prejsť kontrolný zoznam sťahovania','/stahovanie/'],['handover','Priložiť odovzdávací protokol','#documents'],['finish','Potvrdiť vybavenie a nové platby','#finance']],required:['Odovzdávací protokol']},
 car:{label:'Kúpa auta',steps:[['budget','Prepočítať náklady na auto','/kalkulacky/naklady-na-auto/'],['check','Skontrolovať vozidlo','/navody/kontrola-vozidla-pred-kupou/'],['contract','Priložiť kúpnu zmluvu','#documents'],['transfer','Vybaviť prepis','/navody/prepis-auta/'],['insurance','Zaevidovať poistenie','/moje-zmluvy/'],['finish','Začať evidenciu prevádzky','/auto/moje-auto/']],required:['Kúpna zmluva','Poistka']}
};
export const emptyHousehold = () => ({version:1,name:'Moja domácnosť',entities:[],links:[],journeys:[],documents:[],payments:[]});
const fail = () => {throw Error('Neplatné údaje domácnosti. Pôvodné údaje sa nemenia.');};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const str=(v,n)=>typeof v==='string'&&v.length<=n;
const id=v=>str(v,100)&&/^[a-zA-Z0-9_-]+$/.test(v);
const title=v=>str(v,120)&&v.trim().length>0;
const date=v=>v===''||isCaseDate(v);
const money=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
export function normalizeHousehold(value) {
 if(!exact(value,['version','name','entities','links','journeys','documents','payments'])||value.version!==1||!title(value.name))fail();
 for(const key of ['entities','links','journeys','documents','payments']) {
  if(!Array.isArray(value[key])||value[key].length>100)fail();
  const ids=new Set();for(const item of value[key]){if(!item||!id(item.id)||ids.has(item.id))fail();ids.add(item.id);}
 }
 const entities=new Set(value.entities.map(x=>x.id));const journeys=new Set(value.journeys.map(x=>x.id));
 for(const x of value.entities)if(!exact(x,['id','kind','title','note'])||!['home','car','service'].includes(x.kind)||!title(x.title)||!str(x.note,500))fail();
 const contracts=new Set();
 for(const x of value.links){if(!exact(x,['id','contractId','entityId','paymentDate'])||!id(x.contractId)||contracts.has(x.contractId)||!(x.entityId===''||entities.has(x.entityId))||!date(x.paymentDate))fail();contracts.add(x.contractId);}
 for(const x of value.journeys){
  if(!exact(x,['id','kind','title','entityId','contractId','caseKey','caseId','dueDate','completed','history','closed'])||!Object.hasOwn(JOURNEYS,x.kind)||!title(x.title)||!(x.entityId===''||entities.has(x.entityId))||!(x.contractId===''||id(x.contractId))||!date(x.dueDate)||typeof x.closed!=='boolean'||!Array.isArray(x.completed)||new Set(x.completed).size!==x.completed.length||!x.completed.every(s=>JOURNEYS[x.kind].steps.some(([k])=>k===s))||!Array.isArray(x.history)||x.history.length>100)fail();
  if(!((x.caseKey===''&&x.caseId==='')||(Object.hasOwn(CASE_SOURCES,x.caseKey)&&str(x.caseId,99)&&x.caseId.length)))fail();
  for(const h of x.history)if(!exact(h,['at','note'])||!str(h.at,40)||!Number.isFinite(Date.parse(h.at))||!title(h.note))fail();
  if(x.closed&&x.completed.length!==JOURNEYS[x.kind].steps.length)fail();
 }
 let bytes=0;
 for(const x of value.documents){
  if(!exact(x,['id','title','targetType','targetId','tag','versions'])||!title(x.title)||!['entity','contract','journey','case'].includes(x.targetType)||!str(x.targetId,220)||!x.targetId||!str(x.tag,80)||!Array.isArray(x.versions)||!x.versions.length||x.versions.length>10)fail();
  if(x.targetType==='entity'&&!entities.has(x.targetId)||x.targetType==='journey'&&!journeys.has(x.targetId))fail();
  for(const f of x.versions){
   if(!exact(f,['name','mime','data','size','at'])||!title(f.name)||!['application/pdf','image/png','image/jpeg','text/plain'].includes(f.mime)||!Number.isSafeInteger(f.size)||f.size<1||f.size>FILE_MAX||!str(f.data,Math.ceil(FILE_MAX/3)*4)||!str(f.at,40)||!Number.isFinite(Date.parse(f.at))||!validFile(f))fail();
   bytes+=f.size;
  }
 }
 if(bytes>FILE_TOTAL)throw Error('Dokumenty spolu môžu mať najviac 1 MB. Odstráňte nepotrebné verzie.');
 for(const x of value.payments)if(!exact(x,['id','title','cents','date','entityId','journeyId'])||!title(x.title)||!money(x.cents)||!isCaseDate(x.date)||!(x.entityId===''||entities.has(x.entityId))||!(x.journeyId===''||journeys.has(x.journeyId)))fail();
 return JSON.parse(JSON.stringify(value));
}
export function validFile(f){
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.data))return false;
 const raw=atob(f.data);if(raw.length!==f.size)return false;
 if(f.mime==='application/pdf')return raw.startsWith('%PDF-');
 if(f.mime==='image/png')return raw.startsWith('\x89PNG\r\n\x1a\n');
 if(f.mime==='image/jpeg')return raw.startsWith('\xff\xd8\xff');
 return f.mime==='text/plain'&&!raw.includes('\0');
}
export function readHousehold(storage){const raw=storage.getItem(HOUSEHOLD_KEY);return raw===null?emptyHousehold():normalizeHousehold(JSON.parse(raw));}
export function saveHousehold(storage,value,expected){const clean=normalizeHousehold(value);if(storage.getItem(HOUSEHOLD_KEY)!==expected)throw Error('Domácnosť sa zmenila v inej karte. Obnovte stránku pred uložením.');storage.setItem(HOUSEHOLD_KEY,JSON.stringify(clean));return clean;}
export function caseRecords(entries){return Object.entries(CASE_SOURCES).flatMap(([key,meta])=>(entries[key]?.entries??[]).map(x=>({key,id:x.id,title:x.name||x.item||x.service,href:meta.href+'#pripad='+encodeURIComponent(x.id),...x})));}
export function missingDocuments(h,j){const tags=new Set(h.documents.filter(d=>d.targetType==='journey'&&d.targetId===j.id).map(d=>d.tag));return JOURNEYS[j.kind].required.filter(t=>!tags.has(t));}
export function householdTasks(h,entries,today){
 const tasks=[];const days=d=>Math.round((Date.parse(d+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
 const add=(id,title,date,reason,href)=>tasks.push({id,title,date,reason,href,priority:date&&days(date)<0?0:date&&days(date)<=7?1:date&&days(date)<=45?2:3});
 const contracts=entries['v24-contracts-v6']?.entries??[];
 for(const c of contracts){const d=contractNoticeDate(c);if(d)add('contract-'+c.id,'Skontrolovať: '+c.title,d,'Dátum obnovy mínus vami zadaných '+c.noticeDays+' dní; podmienky overte v zmluve.','/moje-zmluvy/');else add('contract-'+c.id,'Doplniť dátum: '+c.title,'','Zmluva nemá dátum obnovy.','/moje-zmluvy/');}
 for(const c of caseRecords(entries))if(!c.archived&&c.followUp&&(!c.replyDate||c.replyDate<c.followUp.sentOn))add('case-'+c.key+c.id,c.title,c.followUp.contactOn,'Čakáte na odpoveď od '+c.followUp.sentOn+'.',c.href);
 for(const d of entries['v24-personal-center-v1']?.deadlines??[])if(!contracts.some(c=>d.id==='contract-'+c.id+'-renewal'||d.id==='contract-'+c.id+'-notice'))add('deadline-'+d.id,d.title,d.date,'Termín z vášho kalendára.','/kalendar/');
 for(const t of entries['v24-personal-center-v1']?.tasks??[])if(!t.done)add('task-'+t.id,t.title,'','Nevybavená úloha osobného centra.','/moje-centrum/');
 for(const j of h.journeys)if(!j.closed){const next=JOURNEYS[j.kind].steps.find(([k])=>!j.completed.includes(k));const missing=missingDocuments(h,j);add('journey-'+j.id,j.title,j.dueDate,(next?'Ďalší krok: '+next[1]+'. ':'')+(missing.length?'Chýbajú podklady: '+missing.join(', '):'Podklady sú priložené.'),'#journey-'+j.id);}
 return tasks.sort((a,b)=>a.priority-b.priority||(a.date||'9999').localeCompare(b.date||'9999')||a.title.localeCompare(b.title,'sk'));
}
export function annualHouseholdPlan(h,entries,year,scenario={contractId:'',cents:0,fee:0,startMonth:1}){
 if(!Number.isInteger(year)||year<1900||year>9998||!money(scenario.cents)||!money(scenario.fee)||!Number.isInteger(scenario.startMonth)||scenario.startMonth<1||scenario.startMonth>12)throw Error('Neplatný finančný scenár.');
 const rows=Array.from({length:12},(_,i)=>({month:i+1,base:0,scenario:0,items:[]})),unknown=[];
 const add=(m,title,cents,alternative=cents)=>{rows[m-1].base+=cents;rows[m-1].scenario+=alternative;rows[m-1].items.push({title,cents});};
 for(const c of entries['v24-contracts-v6']?.entries??[]){const amount=Math.round(c.paymentAmount*100);const linked=h.links.find(l=>l.contractId===c.id);const due=linked?.paymentDate;
  if(c.paymentFrequency==='monthly')for(let m=1;m<=12;m++)add(m,c.title,amount,c.id===scenario.contractId&&m>=scenario.startMonth?scenario.cents:amount);
  else if(due)add(Number(due.slice(5,7)),c.title,amount,c.id===scenario.contractId&&Number(due.slice(5,7))>=scenario.startMonth?scenario.cents:amount);
  else unknown.push(c.title);
 }
 if(scenario.contractId)add(scenario.startMonth,'Jednorazový poplatok scenára',0,scenario.fee);
 for(const p of h.payments)if(Number(p.date.slice(0,4))===year)add(Number(p.date.slice(5,7)),p.title,p.cents);
 for(const p of entries['v24-annual-expenses-v6']?.expenses??[])if(Number(p.dueDate.slice(0,4))===year)add(Number(p.dueDate.slice(5,7)),p.title+' (ročné výdavky)',Math.round(p.amount*100));
 return {rows,unknown,base:rows.reduce((a,r)=>a+r.base,0),scenario:rows.reduce((a,r)=>a+r.scenario,0)};
}
export function searchHousehold(h,entries,query){const q=query.trim().toLocaleLowerCase('sk');if(!q)return [];
 return [...h.entities.map(e=>({title:e.title,kind:'Profil',href:'#profile'})),...(entries['v24-contracts-v6']?.entries??[]).map(c=>({title:c.title,kind:'Zmluva',href:'/moje-zmluvy/'})),...caseRecords(entries).map(c=>({title:c.title,kind:'Prípad',href:c.href})),...h.journeys.map(j=>({title:j.title,kind:'Situácia',href:'#journey-'+j.id})),...h.documents.map(d=>({title:d.title,kind:'Dokument',href:'#document-'+d.id}))].filter(x=>x.title.toLocaleLowerCase('sk').includes(q)).slice(0,50);
}
export function mergeHouseholds(local,incoming,prefer='local'){
 const a=normalizeHousehold(local),b=normalizeHousehold(incoming);const result={version:1,name:prefer==='incoming'?b.name:a.name};
 for(const key of ['entities','links','journeys','documents','payments']){const identity=x=>key==='links'?x.contractId:x.id;const map=new Map(a[key].map(x=>[identity(x),x]));for(const x of b[key])if(!map.has(identity(x))||prefer==='incoming')map.set(identity(x),x);result[key]=[...map.values()];}
 return normalizeHousehold(result);
}
