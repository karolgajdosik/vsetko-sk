// Explicit, lossless field mappings. No storage or network side effects.
const MAX = 10000000;
const has = (o, k) => Object.hasOwn(o, k);
const finite = (value, max = MAX) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const cents = value => Math.round(value * 100) / 100;
export const TRANSFER_LABELS = {
  monthlyIncome: 'Čistý mesačný príjem', monthlyExpenses: 'Priemerné mesačné výdavky',
  purchasePrice: 'Obstarávacia cena', downPayment: 'Vlastné zdroje', annualKm: 'Ročný nájazd',
  monthlyService: 'Mesačná rezerva na servis', monthlyInsurance: 'Mesačné poistenie',
  annualRate: 'Ročný úrok (%)', loanYears: 'Splatnosť (roky)'
};
export function captureTransfer(mode, inputs) {
  const need = keys => { if (keys.some(k => !finite(inputs[k]))) throw new Error('Vyplňte platné nezáporné vstupy do 10 miliónov.'); };
  if (mode === 'finance') {
    const keys = ['income', 'housing', 'food', 'transport', 'debt', 'other', 'annual'];
    need(keys);
    const expenses = cents(['housing', 'food', 'transport', 'debt', 'other'].reduce((sum, key) => sum + inputs[key], 0) + inputs.annual / 12);
    if (!finite(expenses)) throw new Error('Súčet mesačných výdavkov prekročil povolený limit.');
    return { monthlyIncome: cents(inputs.income), monthlyExpenses: expenses };
  }
  if (mode === 'auto') {
    need(['km', 'service', 'insurance']);
    if (inputs.km > 200000 || inputs.service > 100000 || inputs.insurance > 100000) throw new Error('Skontrolujte limity ročného nájazdu a nákladov.');
    return { annualKm: inputs.km, monthlyService: cents(inputs.service / 12), monthlyInsurance: cents(inputs.insurance / 12) };
  }
  if (mode === 'loan') {
    need(['rate', 'years']);
    if (inputs.years <= 0 || inputs.years > 50 || inputs.rate > 100) throw new Error('Splatnosť musí byť väčšia ako 0, najviac 50 rokov a úrok najviac 100 %.');
    return { annualRate: inputs.rate, loanYears: inputs.years };
  }
  if (mode === 'downpayment') {
    need(['amount', 'monthly']);
    if (inputs.amount <= 0 || inputs.monthly > inputs.amount) throw new Error('Cena musí byť kladná a vlastné zdroje nesmú prekročiť cenu.');
    return { purchasePrice: cents(inputs.amount), downPayment: cents(inputs.monthly) };
  }
  return {};
}
export function planTransfer(mode, values) {
  const out = {};
  const put = (target, key, max = MAX) => { if (has(values, key) && finite(values[key], max)) out[target] = values[key]; };
  if (mode === 'finance') put('finance-income', 'monthlyIncome');
  if (mode === 'auto') {
    put('km', 'annualKm', 200000);
    if (has(values, 'monthlyService') && finite(values.monthlyService, 100000 / 12)) out.service = cents(values.monthlyService * 12);
    if (has(values, 'monthlyInsurance') && finite(values.monthlyInsurance, 100000 / 12)) out.insurance = cents(values.monthlyInsurance * 12);
  }
  if (mode === 'loan') {
    if (finite(values.purchasePrice) && finite(values.downPayment) && values.purchasePrice > values.downPayment) out.amount = cents(values.purchasePrice - values.downPayment);
    put('rate', 'annualRate', 100);
    if (finite(values.loanYears, 50) && values.loanYears > 0) out.years = values.loanYears;
  }
  if (mode === 'downpayment') {
    if (finite(values.purchasePrice) && values.purchasePrice > 0 && finite(values.downPayment) && values.downPayment <= values.purchasePrice) {
      out.amount = values.purchasePrice; out.monthly = values.downPayment;
    }
  }
  if (mode === 'savings' && finite(values.monthlyIncome) && finite(values.monthlyExpenses) && values.monthlyIncome > values.monthlyExpenses) out.monthly = cents(values.monthlyIncome - values.monthlyExpenses);
  return out;
}
