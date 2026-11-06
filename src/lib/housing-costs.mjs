// No storage or network calls: pure, deterministic cash-flow estimator.
const moneyFields = ['monthlyPayment', 'energy', 'management', 'internet', 'parking', 'maintenance', 'insuranceYear', 'taxYear', 'upfront', 'income'];
export function calculateHousingCosts(input) {
  const values = Object.fromEntries(moneyFields.map(key => [key, input[key]]));
  const years = input.years;
  if (!Number.isInteger(years) || years < 1 || years > 30) return null;
  for (const key of moneyFields) {
    const value = values[key];
    if (!Number.isFinite(value) || value < 0 || value > 5000000) return null;
  }
  const monthlyRecurring = values.monthlyPayment + values.energy + values.management + values.internet +
    values.parking + values.maintenance + (values.insuranceYear + values.taxYear) / 12;
  const monthlyAverage = monthlyRecurring + values.upfront / (years * 12);
  const annualAverage = monthlyAverage * 12;
  const horizonTotal = monthlyRecurring * years * 12 + values.upfront;
  const shareOfIncome = values.income > 0 ? monthlyAverage / values.income * 100 : null;
  return {monthlyRecurring, monthlyAverage, annualAverage, horizonTotal, shareOfIncome};
}
