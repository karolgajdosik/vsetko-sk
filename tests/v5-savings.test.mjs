import test from 'node:test';
import assert from 'node:assert/strict';
import { planSavings, budgetImpact } from '../src/lib/savings-planner.mjs';
const offer = extra => ({ monthly: 0, annual: 0, promoMonths: 0, promoMonthly: 0, commitment: 0, ...extra });
const plan = extra => planSavings({ current: offer({ monthly: 30 }), alternative: offer({ monthly: 20 }), months: 24, setup: 0, exit: 0, ...extra });
test('net savings includes exit/setup and upfront annual charges with cent precision', () => {
  const r = plan({ current: offer({ monthly: 30.01, annual: 12 }), alternative: offer({ monthly: 20.02, annual: 24, promoMonths: 2, promoMonthly: 0.01 }), months: 13, setup: 5.01, exit: 10.02 });
  assert.equal(r.currentTotal, 414.13);
  assert.equal(r.alternativeRecurring, 268.24);
  assert.equal(r.transition, 15.03);
  assert.equal(r.alternativeTotal, 283.27);
  assert.equal(r.grossSavings, 145.89);
  assert.equal(r.netSavings, 130.86);
  assert.equal(r.initialCashNeeded, 39.04);
});
test('break-even is based on monthly timing, and reports unstable promotional recovery', () => {
  const r = plan({ current: offer({ monthly: 10 }), alternative: offer({ monthly: 20, promoMonths: 2, promoMonthly: 0 }), setup: 10, months: 6 });
  assert.equal(r.firstRecovery, 1);
  assert.equal(r.stableRecovery, null);
  assert.equal(r.netSavings, -30);
  const stable = plan({ setup: 25, months: 4 });
  assert.equal(stable.firstRecovery, 3);
  assert.equal(stable.stableRecovery, 3);
});
test('annual fee at month 13 can defer stable break-even after initial recovery', () => {
  const r = plan({ current: offer({ monthly: 10 }), alternative: offer({ annual: 100 }), setup: 10, months: 24 });
  assert.equal(r.firstRecovery, 11);
  assert.equal(r.stableRecovery, 21);
});
test('no transition cost, equal offers and negative household surplus remain explicit', () => {
  const r = plan({ current: offer(), alternative: offer(), months: 1 });
  assert.equal(r.netSavings, 0);
  assert.equal(r.firstRecovery, null);
  assert.equal(r.stableRecovery, null);
  assert.deepEqual(budgetImpact(r, 1000, 1200), { before: -200, after: -200 });
});
test('commitment beyond comparison is disclosed, not guessed as a cancellation charge', () => {
  const r = plan({ alternative: offer({ monthly: 20, commitment: 24 }), months: 12 });
  assert.equal(r.extendsBeyondHorizon, true);
  assert.equal(r.alternativeTotal, 240);
});
test('invalid money, precision, duration and unsupported values are rejected', () => {
  for (const invalid of [-1, NaN, Infinity, 0.001, 1000000.01, '10', null]) assert.throws(() => plan({ setup: invalid }));
  for (const months of [0, 121, 1.5, NaN]) assert.throws(() => plan({ months }));
  assert.throws(() => plan({ alternative: offer({ promoMonths: -1 }) }));
  assert.throws(() => plan({ current: offer({ commitment: 1.5 }) }));
});
