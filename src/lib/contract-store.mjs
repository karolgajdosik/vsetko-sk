import { validDeadlineDate, normalizeDeadline } from './deadline-center.mjs';
export const CONTRACTS_KEY = 'v24-contracts-v6';
export const CONTRACT_CATEGORIES = ['telecom','energy','insurance','subscription','other'];
export const emptyContracts = () => ({ version:1, entries:[] });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const text = (value,max) => typeof value === 'string' && value.length <= max && value.trim().length > 0;
export function normalizeContracts(value) {
 if (!exact(value,['version','entries']) || value.version !== 1 || !Array.isArray(value.entries) || value.entries.length>100) throw Error('Neplatný register zmlúv.');
 const seen = new Set();
 const entries=value.entries.map(item=>{
  if(!exact(item,['id','title','provider','category','paymentAmount','paymentFrequency','renewalDate','noticeDays']) || !text(item.id,80) || !/^[a-zA-Z0-9_-]+$/.test(item.id) || seen.has(item.id) || !text(item.title,100) || typeof item.provider!=='string' || item.provider.length>100 || !CONTRACT_CATEGORIES.includes(item.category) || !['monthly','yearly'].includes(item.paymentFrequency) || typeof item.paymentAmount!=='number' || !Number.isFinite(item.paymentAmount) || item.paymentAmount<0 || item.paymentAmount>1000000 || Math.abs(item.paymentAmount*100-Math.round(item.paymentAmount*100))>0.00001 || !(item.renewalDate==='' || validDeadlineDate(item.renewalDate)) || !Number.isInteger(item.noticeDays) || item.noticeDays<0 || item.noticeDays>3650) throw Error('Neplatná alebo duplicitná zmluva.');
  seen.add(item.id);return {...item,title:item.title.trim(),provider:item.provider.trim(),paymentAmount:Math.round(item.paymentAmount*100)/100};
 });return {version:1,entries};
}
export function readContracts(storage) {const raw=storage.getItem(CONTRACTS_KEY);return raw===null?emptyContracts():normalizeContracts(JSON.parse(raw));}
export function contractMonthlyAmount(item) {return item.paymentFrequency==='yearly'?item.paymentAmount/12:item.paymentAmount;}
export function contractNoticeDate(item) {
 if(!validDeadlineDate(item.renewalDate))return null;
 const date=new Date(item.renewalDate+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-item.noticeDays);
 const value=date.toISOString().slice(0,10);return validDeadlineDate(value)?value:null;
}
export function contractDeadlines(item) {
 item=normalizeContracts({version:1,entries:[item]}).entries[0];
 if(!item.renewalDate)throw Error('Najprv zadajte vlastný dátum obnovy zmluvy.');
 const notice=contractNoticeDate(item);if(!notice)throw Error('Dátum kontroly lehoty je mimo podporovaného rozsahu.');
 return [{id:'contract-'+item.id+'-renewal',title:('Obnova: '+item.title).slice(0,120),date:item.renewalDate,type:'contract',reminderDays:0},...(item.noticeDays>0?[{id:'contract-'+item.id+'-notice',title:('Kontrola lehoty: '+item.title).slice(0,120),date:notice,type:'contract',reminderDays:0}]:[])];
}
function validateCenter(value) {
 if(!exact(value,['version','tasks','deadlines','budget']) || value.version!==1 || !Array.isArray(value.tasks) || value.tasks.length>500 || !Array.isArray(value.deadlines) || value.deadlines.length>500 || !record(value.budget) || Object.keys(value.budget).some(k=>!['income','housing','loans','food','transport','other'].includes(k)) || Object.values(value.budget).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>10000000)) throw Error('Osobné centrum má neplatný formát; nič sa neprepísalo.');
 const ids=new Set();for(const task of value.tasks){if(!exact(task,['id','title','done'])||!text(task.id,120)||ids.has(task.id)||!text(task.title,120)||typeof task.done!=='boolean')throw Error('Neplatné úlohy osobného centra; nič sa neprepísalo.');ids.add(task.id);}
 ids.clear();for(const deadline of value.deadlines){if(!record(deadline)||Object.keys(deadline).some(k=>!['id','title','date','type','reminderDays','caseId'].includes(k))||!normalizeDeadline(deadline)||ids.has(deadline.id)||(deadline.type!==undefined&&!['','stk','pzp','service','identity','passport','driving','insurance','mortgage','contract'].includes(deadline.type))||(deadline.reminderDays!==undefined&&![0,1,7,14,30,60].includes(deadline.reminderDays))||(deadline.caseId!==undefined&&(typeof deadline.caseId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(deadline.caseId))))throw Error('Neplatné termíny osobného centra; nič sa neprepísalo.');ids.add(deadline.id);}return value;
}
export function addContractDeadlines(storage,item) {
 const additions=contractDeadlines(item),key='v24-personal-center-v1',before=storage.getItem(key);
 const center=before===null?{version:1,tasks:[],deadlines:[],budget:{}}:validateCenter(JSON.parse(before));
 const owned=new Set(['contract-'+item.id+'-renewal','contract-'+item.id+'-notice']);
 const deadlines=[...center.deadlines.filter(d=>!owned.has(d.id)),...additions];if(deadlines.length>500)throw Error('Kalendár je plný. Najprv odstráňte nepotrebné termíny.');
 if(storage.getItem(key)!==before)throw Error('Údaje sa zmenili. Zopakujte pridanie termínov.');
 storage.setItem(key,JSON.stringify({...center,deadlines}));return additions;
}
