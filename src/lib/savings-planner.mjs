// Own-offer model: no provider prices, eligibility assumptions or remote calls.
const MAX_MONEY = 1000000;
const moneyKeys = ['monthly', 'promoMonthly', 'annual'];
function cents(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_MONEY || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
    throw new RangeError(label + ': zadajte nezápornú sumu najviac 1 000 000 € s presnosťou na centy.');
  }
  return Math.round(value * 100);
}
function whole(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(label + ': neplatný počet mesiacov.');
  return value;
}
function offerValues(offer) {
  if (!offer || typeof offer !== 'object') throw new TypeError('Vyplňte obe ponuky.');
  const amounts = Object.fromEntries(moneyKeys.map(key => [key, cents(offer[key], key)]));
  return { ...amounts, promoMonths: whole(offer.promoMonths, 0, 120, 'Akcia'), commitment: whole(offer.commitment, 0, 120, 'Viazanosť') };
}
function schedule(offer, months) {
  return Array.from({ length: months }, (_, i) => (i < offer.promoMonths ? offer.promoMonthly : offer.monthly) + (i % 12 === 0 ? offer.annual : 0));
}
/** Annual charges fall due at months 1,13,...; setup and exit occur at the switch. */
export function planSavings({ current, alternative, months, setup, exit }) {
  whole(months, 1, 120, 'Porovnávané obdobie');
  const a = offerValues(current);
  const b = offerValues(alternative);
  const setupCents = cents(setup, 'Vstupné náklady');
  const exitCents = cents(exit, 'Náklady ukončenia');
  const currentSchedule = schedule(a, months);
  const alternativeSchedule = schedule(b, months);
  const currentCents = currentSchedule.reduce((sum, value) => sum + value, 0);
  const alternativeRecurringCents = alternativeSchedule.reduce((sum, value) => sum + value, 0);
  const transitionCents = setupCents + exitCents;
  let balance = -transitionCents;
  const timeline = currentSchedule.map((cost, i) => {
    balance += cost - alternativeSchedule[i];
    return { month: i + 1, current: cost / 100, alternative: alternativeSchedule[i] / 100, cumulativeSavings: balance / 100 };
  });
  // Recovery is meaningful only when there are actual one-off transition costs.
  const firstRecovery = transitionCents ? timeline.find(row => row.cumulativeSavings >= 0)?.month ?? null : null;
  let stableRecovery = null;
  if (transitionCents) {
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].cumulativeSavings < 0) break;
      stableRecovery = i + 1;
    }
  }
  const alternativeCents = alternativeRecurringCents + transitionCents;
  const grossCents = currentCents - alternativeRecurringCents;
  return {
    months, currentTotal: currentCents / 100, alternativeRecurring: alternativeRecurringCents / 100,
    transition: transitionCents / 100, alternativeTotal: alternativeCents / 100,
    grossSavings: grossCents / 100, netSavings: (grossCents - transitionCents) / 100,
    currentAverage: currentCents / 100 / months, alternativeAverage: alternativeCents / 100 / months,
    currentAnnualized: currentCents / 100 / months * 12, alternativeAnnualized: alternativeCents / 100 / months * 12,
    averageMonthlySavings: (grossCents - transitionCents) / 100 / months,
    initialCashNeeded: (transitionCents + alternativeSchedule[0]) / 100,
    firstRecovery, stableRecovery, timeline,
    currentCommitment: a.commitment, alternativeCommitment: b.commitment,
    extendsBeyondHorizon: b.commitment > months,
  };
}
export function budgetImpact(result, income, expenses) {
  const incomeCents = cents(income, 'Mesačný príjem');
  const expenseCents = cents(expenses, 'Mesačné výdavky');
  return { before: (incomeCents - expenseCents) / 100, after: (incomeCents - expenseCents) / 100 + result.averageMonthlySavings };
}
