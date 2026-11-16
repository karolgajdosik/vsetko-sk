import { validDeadlineDate } from './deadline-center.mjs';
export const ANNUAL_EXPENSES_KEY = 'v24-annual-expenses-v6';
export const emptyAnnualExpenses = () => ({version:1,expenses:[]});
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const cents = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10000000 && Math.abs(v*100-Math.round(v*100)) < 0.00001;
export function normalizeAnnualExpenses(value) {
 if(!record(value)||value.version!==1||Object.keys(value).some(k=>!['version','expenses'].includes(k))||!Array.isArray(value.expenses)||value.expenses.length>200)throw Error('Neplatný formát ročných výdavkov.');
 const ids=new Set();
 return {version:1,expenses:value.expenses.map(v=>{
  if(!record(v)||Object.keys(v).some(k=>!['id','title','amount','dueDate','savedAmount'].includes(k))||typeof v.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(v.id)||ids.has(v.id)||typeof v.title!=='string'||!v.title.trim()||v.title.length>100||!cents(v.amount)||!cents(v.savedAmount)||v.savedAmount>v.amount||!validDeadlineDate(v.dueDate))throw Error('Neplatný alebo duplicitný výdavok.');
  ids.add(v.id);return {id:v.id,title:v.title.trim(),amount:v.amount,dueDate:v.dueDate,savedAmount:v.savedAmount};
 })};
}
export function annualExpensePlan(value,asOf) {
 const state=normalizeAnnualExpenses(value);if(!validDeadlineDate(asOf))throw Error('Zadajte platný dátum výpočtu.');
 const expenses=state.expenses.map(item=>{
  const days=Math.round((Date.parse(item.dueDate+'T12:00:00Z')-Date.parse(asOf+'T12:00:00Z'))/86400000);
  const remainingCents=Math.round(item.amount*100)-Math.round(item.savedAmount*100);
  const periods=days>0?Math.ceil(days/30):0;
  return {...item,days,remaining:remainingCents/100,periods,monthly:periods?Math.ceil(remainingCents/periods)/100:0,immediate:periods?0:remainingCents/100};
 });
 const sum=(items,key)=>items.reduce((n,x)=>n+Math.round(x[key]*100),0)/100;
 return {asOf,year:Number(asOf.slice(0,4)),expenses,monthly:sum(expenses,'monthly'),immediate:sum(expenses,'immediate'),yearTotal:sum(expenses.filter(x=>x.dueDate.slice(0,4)===asOf.slice(0,4)),'amount'),remaining:sum(expenses,'remaining')};
}
export function addAnnualReserveTask(center,title) {
 if(!record(center)||center.version!==1||Object.keys(center).some(k=>!['version','tasks','deadlines','budget'].includes(k))||!Array.isArray(center.tasks)||center.tasks.length>500||!Array.isArray(center.deadlines)||!record(center.budget))throw Error('Osobné centrum má neznámy formát. Pôvodné údaje sa nezmenili.');
 if(Object.keys(center.budget).some(k=>!['income','housing','loans','food','transport','other'].includes(k))||!Object.values(center.budget).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=10000000)||center.deadlines.length>500)throw Error('Rozpočet alebo termíny majú neplatný formát.');
 const deadlineIds=new Set();for(const d of center.deadlines){if(!record(d)||Object.keys(d).some(k=>!['id','title','date','type','reminderDays','caseId'].includes(k))||typeof d.id!=='string'||!d.id||d.id.length>120||deadlineIds.has(d.id)||typeof d.title!=='string'||!d.title.trim()||d.title.length>120||!validDeadlineDate(d.date)||(d.type!==undefined&&!['','stk','pzp','service','identity','passport','driving','insurance','mortgage','contract'].includes(d.type))||(d.reminderDays!==undefined&&![0,1,7,14,30,60].includes(d.reminderDays))||(d.caseId!==undefined&&(typeof d.caseId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(d.caseId))))throw Error('Termíny majú neplatný formát.');deadlineIds.add(d.id);}
 const ids=new Set();for(const task of center.tasks){if(!record(task)||Object.keys(task).some(k=>!['id','title','done'].includes(k))||typeof task.id!=='string'||!task.id||task.id.length>120||ids.has(task.id)||typeof task.title!=='string'||!task.title.trim()||task.title.length>120||typeof task.done!=='boolean')throw Error('Úlohy majú neplatný formát.');ids.add(task.id);}
 if(typeof title!=='string'||!title.trim()||title.length>120)throw Error('Neplatný názov úlohy.');
 const id='v6-annual-reserve';if(center.tasks.some(t=>t.id===id))return {center,added:false};
 if(center.tasks.length>=500)throw Error('Zoznam úloh je plný.');return {center:{...center,tasks:[...center.tasks,{id,title,done:false}]},added:true};
}
