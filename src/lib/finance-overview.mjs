// Household cash-flow arithmetic only. No rates, legal thresholds, storage or network.
const moneyFields = ['income', 'housing', 'food', 'transport', 'debt', 'other', 'annual', 'reserve'];
export function calculateFinanceOverview(input) {
  if (!input || typeof input !== 'object') return null;
  if (moneyFields.some(key => typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0 || input[key] > 10000000)) return null;
  if (!Number.isInteger(input.targetMonths) || input.targetMonths < 1 || input.targetMonths > 36) return null;
  for (const key of ['incomeDrop', 'expenseRise']) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0 || input[key] > 100) return null;
  }
  // Inputs are euros with cent precision. Keep annual totals in integer cents,
  // and monthly amounts as exact twelfths of cents until presentation. This
  // avoids both false deficits (0.30 - 0.10 - 0.20) and ceil() overshoots.
  const cents = Object.fromEntries(moneyFields.map(key => [key, Math.round(input[key] * 100)]));
  const annualExpenseCents = (cents.housing + cents.food + cents.transport + cents.debt + cents.other) * 12 + cents.annual;
  const annualBalanceCents = cents.income * 12 - annualExpenseCents;
  const reserveGapTwelfths = Math.max(0, annualExpenseCents * input.targetMonths - cents.reserve * 12);
  const expenses = annualExpenseCents / 1200;
  const balance = annualBalanceCents / 1200;
  const reserveTarget = annualExpenseCents * input.targetMonths / 1200;
  const reserveGap = reserveGapTwelfths / 1200;
  const reserveMonths = annualExpenseCents > 0 ? cents.reserve * 12 / annualExpenseCents : null;
  const monthsToTarget = reserveGapTwelfths === 0 ? 0 : annualBalanceCents > 0 ? Math.ceil(reserveGapTwelfths / annualBalanceCents) : null;
  // Scenario percentages use hundredths of a percentage point. Integer scaled
  // annual amounts remain below Number.MAX_SAFE_INTEGER for all accepted inputs.
  const incomeDropPoints = Math.round(input.incomeDrop * 100);
  const expenseRisePoints = Math.round(input.expenseRise * 100);
  const scenarioIncomeScaled = cents.income * 12 * (10000 - incomeDropPoints);
  const scenarioExpensesScaled = annualExpenseCents * (10000 + expenseRisePoints);
  const scenarioBalanceScaled = scenarioIncomeScaled - scenarioExpensesScaled;
  const scenarioIncome = scenarioIncomeScaled / 12000000;
  const scenarioExpenses = scenarioExpensesScaled / 12000000;
  const scenarioBalance = scenarioBalanceScaled / 12000000;
  return {expenses, balance, annualExpenses: annualExpenseCents / 100, annualBalance: annualBalanceCents / 100,
    reserveTarget, reserveGap, reserveMonths, monthsToTarget, scenarioIncome, scenarioExpenses,
    scenarioBalance, deficitCoverageMonths: scenarioBalanceScaled < 0 ? cents.reserve * 120000 / -scenarioBalanceScaled : null};
}
