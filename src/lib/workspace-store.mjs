export const WORKSPACE_KEY = 'v24-workspace-v5';
export const VALUE_FIELDS = {
 monthlyIncome: { label: 'Čistý mesačný príjem (€)', max: 10000000 },
 monthlyExpenses: { label: 'Mesačné výdavky bez nového záväzku (€)', max: 10000000 },
 purchasePrice: { label: 'Kúpna cena (€)', max: 10000000 },
 downPayment: { label: 'Vlastné peniaze na kúpu (€)', max: 10000000 },
 annualKm: { label: 'Ročný nájazd (km)', max: 1000000 },
 fuelPrice: { label: 'Cena jednotky paliva / energie (€)', max: 10000 },
 consumption: { label: 'Spotreba na 100 km', max: 1000 },
 loanYears: { label: 'Splatnosť úveru (roky)', max: 50 },
 annualRate: { label: 'Ročná úroková sadzba (%)', max: 100 },
 monthlyService: { label: 'Mesačný servis a údržba (€)', max: 10000000 },
 monthlyInsurance: { label: 'Mesačné poistenie (€)', max: 10000000 },
};
export const CASE_TEMPLATES = {
 car: { title: 'Kúpa auta', steps: [
  { id:'guide', title:'Príprava na kúpu auta', href:'/sprievodca/nove-auto/' },
  { id:'budget', title:'Dopad na rozpočet domácnosti', href:'/financie/prehlad/' },
  { id:'costs', title:'Náklady na prevádzku auta', href:'/kalkulacky/naklady-na-auto/' },
  { id:'checklist', title:'Kontrola vozidla pred kúpou', href:'/navody/kontrola-vozidla-pred-kupou/' },
  { id:'documents', title:'Pripraviť dokument z prípadu', href:'/dokumenty/' },
  { id:'transfer', title:'Postup prepisu auta', href:'/navody/prepis-auta/' },
  { id:'calendar', title:'Pridať vlastný poistný alebo servisný termín', href:'/kalendar/' },
  { id:'vehicle', title:'Začať evidenciu prevádzky auta', href:'/auto/moje-auto/' },
 ] },
 home: { title: 'Kúpa bývania', steps: [
  { id:'guide', title:'Postup kúpy bývania', href:'/sprievodca/kupa-bytu/' },
  { id:'budget', title:'Zostaviť rozpočet domácnosti', href:'/financie/prehlad/' },
  { id:'loan', title:'Prepočítať splátku úveru', href:'/kalkulacky/splatka-uveru/' },
  { id:'compare', title:'Porovnať ponuky hypoték', href:'/financie/porovnanie-hypotek/' },
  { id:'costs', title:'Celkové náklady na bývanie', href:'/kalkulacky/naklady-na-byvanie/' },
  { id:'checklist', title:'Kontrolný zoznam pred kúpou', href:'/kupa-nehnutelnosti/' },
  { id:'documents', title:'Pripraviť žiadosť alebo protokol', href:'/dokumenty/' },
  { id:'calendar', title:'Uložiť vlastný termín', href:'/kalendar/' },
 ] },
 savings: { title: 'Zníženie výdavkov domácnosti', steps: [
  { id:'budget', title:'Zmapovať príjmy a výdavky', href:'/financie/prehlad/' },
  { id:'compare', title:'Vyhodnotiť čistú úsporu po poplatkoch', href:'/centrum-uspor/' },
  { id:'reserve', title:'Prepočítať finančnú rezervu', href:'/kalkulacky/financna-rezerva/' },
  { id:'savings', title:'Naplánovať pravidelné sporenie', href:'/kalkulacky/sporenie/' },
  { id:'documents', title:'Pripraviť žiadosť alebo výpoveď služby', href:'/dokumenty/' },
  { id:'calendar', title:'Uložiť dátum kontroly zmluvy', href:'/kalendar/' },
 ] },
};
export const emptyWorkspace = () => ({ version: 1, activeCaseId: null, cases: [] });
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const validStamp = value => typeof value === 'string' && value.length <= 30 && Number.isFinite(Date.parse(value));
export function normalizeWorkspace(value) {
 if (!record(value) || value.version !== 1 || !Array.isArray(value.cases) || value.cases.length > 30) throw new Error('Neplatný formát osobných situácií.');
 if (Object.keys(value).some(key=>!['version','activeCaseId','cases'].includes(key))) throw new Error('Neznáme polia osobného priestoru.');
 const seen = new Set();
 const cases = value.cases.map(item => {
  if (!record(item) || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || seen.has(item.id) || !Object.hasOwn(CASE_TEMPLATES,item.kind)) throw new Error('Neplatná alebo duplicitná situácia.');
  if (Object.keys(item).some(key=>!['id','kind','title','createdAt','updatedAt','completed','values'].includes(key))) throw new Error('Neznáme polia situácie.');
  seen.add(item.id);
  if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 100 || !validStamp(item.createdAt) || !validStamp(item.updatedAt)) throw new Error('Neplatný názov alebo dátum situácie.');
  const steps = CASE_TEMPLATES[item.kind].steps.map(step=>step.id);
  if (!Array.isArray(item.completed) || item.completed.length > steps.length || item.completed.some(id=>!steps.includes(id)) || new Set(item.completed).size !== item.completed.length || !record(item.values)) throw new Error('Neplatné kroky situácie.');
  const values = {};
  for (const [key,number] of Object.entries(item.values)) {
   if (!Object.hasOwn(VALUE_FIELDS,key) || (key==='loanYears' && number!==0 && number<1/12) || typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > VALUE_FIELDS[key].max) throw new Error('Neplatná číselná hodnota situácie.');
   values[key] = number;
  }
  return { id:item.id, kind:item.kind, title:item.title.trim(), createdAt:item.createdAt, updatedAt:item.updatedAt, completed:[...item.completed], values };
 });
 if (value.activeCaseId !== null && (typeof value.activeCaseId !== 'string' || !seen.has(value.activeCaseId))) throw new Error('Aktívna situácia neexistuje.');
 return { version:1, activeCaseId:value.activeCaseId, cases };
}
export function readWorkspace(storage) {
 const raw = storage.getItem(WORKSPACE_KEY);
 return raw === null ? emptyWorkspace() : normalizeWorkspace(JSON.parse(raw));
}
export function writeWorkspace(storage,state) {
 const clean = normalizeWorkspace(state);
 storage.setItem(WORKSPACE_KEY,JSON.stringify(clean));
 return clean;
}
export function createCase(kind,title,now=new Date().toISOString(),id=globalThis.crypto.randomUUID()) {
 if (!Object.hasOwn(CASE_TEMPLATES,kind)) throw new Error('Neznáma situácia.');
 return normalizeWorkspace({version:1,activeCaseId:id,cases:[{id,kind,title:title.trim() || CASE_TEMPLATES[kind].title,createdAt:now,updatedAt:now,completed:[],values:{}}]}).cases[0];
}
export function caseProjection(item) {
 const v=item.values;
 const principal = Math.max(0,(v.purchasePrice??0)-(v.downPayment??0));
 const months = (v.loanYears??0)*12;
 const rate = (v.annualRate??0)/1200;
 const financeKnown = Object.hasOwn(v,'purchasePrice') && Object.hasOwn(v,'downPayment') && Object.hasOwn(v,'annualRate');
 const computedPayment = !financeKnown ? null : !principal ? 0 : months > 0 ? rate ? principal*rate/(-Math.expm1(-months*Math.log1p(rate))) : principal/months : null;
 const payment = computedPayment === null || !Number.isFinite(computedPayment) ? null : computedPayment;
 const budgetKnown = Object.hasOwn(v,'monthlyIncome') && Object.hasOwn(v,'monthlyExpenses');
 const costKnown = item.kind === 'car' ? Object.hasOwn(v,'monthlyService') && Object.hasOwn(v,'monthlyInsurance') : item.kind==='savings';
 const operating = item.kind==='car' ? (v.monthlyService??0)+(v.monthlyInsurance??0) : 0;
 const surplus = budgetKnown ? v.monthlyIncome-v.monthlyExpenses : null;
 return { principal, payment, surplus, remaining: surplus!==null && (item.kind==='savings' || (payment!==null && costKnown)) ? surplus-(payment??0)-operating : null };
}
