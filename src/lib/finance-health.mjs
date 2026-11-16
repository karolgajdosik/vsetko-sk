// Transparent household arithmetic. No credit scoring or lender eligibility model.
export const FINANCE_HEALTH_LIMIT = 1000000;
export const FINANCE_HEALTH_FIELDS = ['income','expenses','reserve','debtPayments','targetMonths','savingMonthly'];
function cents(value, name) {
 if(typeof value !== 'number'||!Number.isFinite(value)||value<0||value>FINANCE_HEALTH_LIMIT||Math.abs(value*100-Math.round(value*100))>0.000001) throw new RangeError(name+': zadajte sumu od 0 do 1 000 000 € s presnosťou na centy.');
 return Math.round(value*100);
}
export function calculateFinanceHealth(input) {
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!FINANCE_HEALTH_FIELDS.includes(key)))throw new TypeError('Neplatné vstupy kontroly rozpočtu.');
 const missing=FINANCE_HEALTH_FIELDS.filter(key=>input[key]===null||input[key]===undefined||input[key]==='');
 if(missing.length)throw new TypeError('Doplňte chýbajúce údaje: '+missing.join(', ')+'. Nula znamená potvrdenú nulovú hodnotu.');
 const amounts=Object.fromEntries(['income','expenses','reserve','debtPayments','savingMonthly'].map(key=>[key,cents(input[key],key)]));
 const {income,expenses,reserve,debtPayments,savingMonthly}=amounts;
 if(!Number.isInteger(input.targetMonths)||input.targetMonths<1||input.targetMonths>36)throw new RangeError('Cieľ rezervy musí byť celé číslo od 1 do 36 mesiacov.');
 if(debtPayments>expenses)throw new RangeError('Splátky sú súčasťou výdavkov a nesmú byť vyššie ako celkové výdavky.');
 const surplus=income-expenses,targetReserve=expenses*input.targetMonths,reserveGap=Math.max(0,targetReserve-reserve);
 const notes=[];
 if(expenses===0)notes.push('Pri nulových výdavkoch sa počet mesiacov krytia neurčuje. Skontrolujte, či ste zahrnuli všetky náklady.');
 if(income===0)notes.push('Pri nulovom príjme sa podiel splátok neurčuje.');
 if(surplus<0)notes.push('Výdavky sú vyššie ako príjem. Rozpočet má mesačný deficit.');
 if(savingMonthly>Math.max(0,surplus))notes.push('Plánovaná mesačná úspora presahuje aktuálny prebytok. Termín cieľa je iba matematický scenár a pri tomto rozpočte nie je financovaný.');
 return {
  surplus:surplus/100, savingCapacity:Math.max(0,surplus)/100,
  reserveMonths:expenses>0?reserve/expenses:null,
  targetReserve:targetReserve/100,reserveGap:reserveGap/100,
  monthsToTarget:reserveGap===0?0:savingMonthly>0?Math.ceil(reserveGap/savingMonthly):null,
  debtShare:income>0?debtPayments/income*100:null,
  planFunded:savingMonthly<=Math.max(0,surplus),notes,
 };
}
