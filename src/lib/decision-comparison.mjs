export const DECISIONS_KEY = 'v24-decisions-v6';
export const emptyDecisions = () => ({version:1,comparisons:[]});
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const keys = (x, fields) => object(x) && Object.keys(x).length === fields.length && Object.keys(x).every(k=>fields.includes(k));
const text = (x,max) => typeof x==='string' && x.trim().length>0 && x.length<=max && !/[\u0000-\u001f]/.test(x);
function money(x){if(typeof x!=='number'||!Number.isFinite(x)||x<0||x>10000000||Math.abs(x*100-Math.round(x*100))>0.000001)throw Error('Sumy musia byť nezáporné, najviac 10 miliónov eur a s presnosťou na centy.');return Math.round(x*100);}
function months(x,min=1){if(!Number.isInteger(x)||x<min||x>600)throw Error('Počet mesiacov musí byť celé číslo od '+min+' do 600.');return x;}
export function normalizeVariant(value){
 if(!keys(value,['name','upfront','monthly','residual','principal','annualRate','loanMonths'])||!text(value.name,80))throw Error('Neplatný variant.');
 for(const key of ['upfront','monthly','residual','principal'])money(value[key]);
 if(typeof value.annualRate!=='number'||!Number.isFinite(value.annualRate)||value.annualRate<0||value.annualRate>50)throw Error('Ročná úroková sadzba musí byť od 0 do 50 %.');
 months(value.loanMonths,0);
 if(value.principal>0&&value.loanMonths===0)throw Error('Vyplňte počet splátok úveru.');
 if(value.principal===0&&(value.loanMonths!==0||value.annualRate!==0))throw Error('Bez úveru nastavte sadzbu aj počet splátok na nulu.');
 return {...value,name:value.name.trim()};
}
export function evaluateVariant(value,horizon){
 const v=normalizeVariant(value);months(horizon);
 const principal=money(v.principal),rate=v.annualRate/1200;
 const payment=principal?Math.round(rate===0?principal/v.loanMonths:principal*rate/(-Math.expm1(-v.loanMonths*Math.log1p(rate)))):0;
 let debt=principal,installments=0,interest=0;
 for(let i=0;i<Math.min(horizon,v.loanMonths);i++){
  const fee=Math.round(debt*rate);let due=i===v.loanMonths-1?debt+fee:Math.min(payment,debt+fee);
  if(due<fee)throw Error('Splátka nepokrýva úrok.');
  debt=debt+fee-due;installments+=due;interest+=fee;
 }
 const recurring=money(v.monthly)*horizon,cash=money(v.upfront)+recurring+installments;
 return {name:v.name,upfront:v.upfront,recurring:recurring/100,installments:installments/100,interest:interest/100,payment:payment/100,remainingDebt:debt/100,residual:v.residual,cashPaid:cash/100,netCost:(cash+debt-money(v.residual))/100,averageCash:cash/100/horizon};
}
export function compareDecisions({months:horizon,variants}){
 months(horizon);if(!Array.isArray(variants)||variants.length!==2)throw Error('Porovnajte presne dva varianty.');
 const results=variants.map(v=>evaluateVariant(v,horizon));
 return {months:horizon,results,difference:Math.round((results[1].netCost-results[0].netCost)*100)/100};
}
export function normalizeDecisions(value){
 if(!keys(value,['version','comparisons'])||value.version!==1||!Array.isArray(value.comparisons)||value.comparisons.length>30)throw Error('Neplatný formát uložených porovnaní.');
 const ids=new Set();const comparisons=value.comparisons.map(item=>{
  if(!keys(item,['id','title','months','variants'])||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)||ids.has(item.id)||!text(item.title,100))throw Error('Neplatné alebo duplicitné porovnanie.');
  ids.add(item.id);compareDecisions(item);return {id:item.id,title:item.title.trim(),months:item.months,variants:item.variants.map(normalizeVariant)};
 });return {version:1,comparisons};
}
export function comparisonCsv(title,comparison){
 const result=compareDecisions(comparison);
 const rows=[['Porovnanie rozhodnutí',title],['Obdobie (mesiace)',comparison.months],['Položka',...comparison.variants.map(v=>v.name)]];
 for(const [label,key] of [['Vlastná vstupná platba','upfront'],['Mesačné prevádzkové náklady','monthly'],['Odhad hodnoty na konci','residual'],['Istina úveru','principal'],['Nominálna ročná sadzba (%)','annualRate'],['Počet splátok','loanMonths']])rows.push([label,...comparison.variants.map(v=>v[key])]);
 for(const [label,key] of [['Zaplatené peniaze','cashPaid'],['Zostatok dlhu','remainingDebt'],['Čisté náklady po hodnote majetku','netCost']])rows.push([label,...result.results.map(v=>v[key])]);
 const cell=x=>{let s=String(x);if(typeof x==='string'&&/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n');
}
