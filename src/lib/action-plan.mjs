import { normalizeDeadline, deadlineTemplates, REMINDER_DAYS } from './deadline-center.mjs';
export const PERSONAL_CENTER_KEY = 'v24-personal-center-v1';
const euro = value => new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'}).format(value);
const fields = ['income','expenses','reserve','monthlySaving','targetMonths'];
const labels = {income:'mesačný príjem',expenses:'mesačné výdavky',reserve:'aktuálna rezerva',monthlySaving:'mesačný príspevok do rezervy',targetMonths:'počet mesiacov rezervy'};
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => record(value) && Object.keys(value).every(key => allowed.includes(key));
export function buildActionPlan(input) {
 if (!keys(input,fields)) throw new Error('Neplatné vstupy plánu.');
 const missing=fields.filter(key=>input[key]===undefined || input[key]===null || input[key]==='');
 for(const key of fields.filter(key=>!missing.includes(key))){const n=input[key];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>10000000||(key==='targetMonths' ? !Number.isInteger(n)||n<1||n>36 : Math.abs(n*100-Math.round(n*100))>0.00001))throw new Error('Skontrolujte hodnotu: '+labels[key]+'.');}
 if(missing.length)return {missing:missing.map(key=>labels[key]),steps:[],surplus:null,target:null,gap:null,months:null};
 const cents = value=>Math.round(value*100), income=cents(input.income),expenses=cents(input.expenses),reserve=cents(input.reserve),saving=cents(input.monthlySaving);
 const surplus=income-expenses,target=expenses*input.targetMonths,gap=Math.max(0,target-reserve), steps=[];
 const add=(id,title,why,href)=>steps.push({id,title,why,href});
 if(surplus<0)add('budget','Skontrolovať výdavky a vyrovnať mesačný rozpočet','Výdavky prevyšujú príjem o '+euro(-surplus/100)+' mesačne. Najprv overte platby a možnosti úpravy rozpočtu.','/financie/prehlad/');
 if(gap>0){
  if(saving>Math.max(0,surplus))add('saving-limit','Upraviť príspevok do rezervy podľa rozpočtu','Zadaný príspevok '+euro(saving/100)+' je vyšší ako voľný zostatok '+euro(surplus/100)+'. Plán ho automaticky neznížil.','/financie/kontrola/');
  else if(saving===0)add('saving-start','Zvoliť uskutočniteľný mesačný príspevok do rezervy','Do cieľa chýba '+euro(gap/100)+'. Bez kladného príspevku nie je možné určiť čas dosiahnutia.','/financie/kontrola/');
  else add('reserve','Odkladať do rezervy '+euro(saving/100)+' mesačne','Cieľ je výdavky × '+input.targetMonths+' = '+euro(target/100)+'. Chýba '+euro(gap/100)+', pri nemennom príspevku ide o '+Math.ceil(gap/saving)+' mesiacov bez úročenia.','/kalkulacky/financna-rezerva/');
 }else add('reserve-review','Skontrolovať cieľ a dostupnosť finančnej rezervy','Zadaná rezerva pokrýva cieľ '+euro(target/100)+'. Pri zmene výdavkov plán prepočítajte.','/financie/kontrola/');
 add('offers','Porovnať pravidelné služby a náklady na ich zmenu','Použite vlastné ponuky vrátane viazanosti, výstupných poplatkov a rovnakého rozsahu služby. Úsporu bez konkrétnych cien neurčujeme.','/centrum-uspor/');
 return {missing:[],steps,surplus:surplus/100,target:target/100,gap:gap/100,months:gap===0?0:saving>0&&saving<=Math.max(0,surplus)?Math.ceil(gap/saving):null};
}
export function validatePlanCenter(value) {
 if(!keys(value,['version','tasks','deadlines','budget'])||value.version!==1||!Array.isArray(value.tasks)||value.tasks.length>500||!Array.isArray(value.deadlines)||value.deadlines.length>500||!keys(value.budget,['income','housing','loans','food','transport','other'])||!Object.values(value.budget).every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10000000))throw new Error('Osobné centrum má neplatný formát. Pôvodné údaje sa nezmenili.');
 const ids=new Set();
 for(const task of value.tasks){if(!keys(task,['id','title','done'])||typeof task.id!=='string'||!task.id||task.id.length>120||ids.has(task.id)||typeof task.title!=='string'||!task.title.trim()||task.title.length>120||typeof task.done!=='boolean')throw new Error('Uložené úlohy majú neplatný formát. Nič sa neprepísalo.');ids.add(task.id);}
 ids.clear();
 for(const deadline of value.deadlines){if(!keys(deadline,['id','title','date','type','reminderDays','caseId'])||!normalizeDeadline(deadline)||ids.has(deadline.id)||(deadline.type!==undefined&&deadline.type!==''&&!Object.hasOwn(deadlineTemplates,deadline.type))||(deadline.reminderDays!==undefined&&!REMINDER_DAYS.includes(deadline.reminderDays))||(deadline.caseId!==undefined&&(typeof deadline.caseId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(deadline.caseId))))throw new Error('Uložené termíny majú neplatný formát. Nič sa neprepísalo.');ids.add(deadline.id);}
 return value;
}
export function acceptActionPlan(storage, input, selected) {
 const plan=buildActionPlan(input);
 if(plan.missing.length||!Array.isArray(selected)||!selected.length||selected.length>plan.steps.length||new Set(selected).size!==selected.length||!selected.every(id=>plan.steps.some(step=>step.id===id)))throw new Error('Vyberte platné kroky aktuálneho plánu.');
 const raw=storage.getItem(PERSONAL_CENTER_KEY), state=raw===null?{version:1,tasks:[],deadlines:[],budget:{}}:validatePlanCenter(JSON.parse(raw));
 const next=JSON.parse(JSON.stringify(state));let added=0,skipped=0;
 for(const step of plan.steps.filter(step=>selected.includes(step.id))){const id='v6-plan-'+step.id;if(next.tasks.some(task=>task.id===id||task.title===step.title)){skipped++;continue;}if(next.tasks.length>=500)throw new Error('Centrum má už 500 úloh. Nič sa neuložilo.');next.tasks.push({id,title:step.title,done:false});added++;}
 if(added)storage.setItem(PERSONAL_CENTER_KEY,JSON.stringify(next));
 return {added,skipped};
}
