import test from 'node:test';
import assert from 'node:assert/strict';
import { validDeadlineDate, normalizeDeadline, deadlineTiming, createDeadlineCalendar } from '../src/lib/deadline-center.mjs';

test('calendar dates reject nonexistent days and preserve leap years', () => {
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', 'x', '', '0099-12-01', '10000-01-01']) assert.equal(validDeadlineDate(value), false, value);
  for (const value of ['2028-02-29', '2037-12-31', '9999-12-31']) assert.equal(validDeadlineDate(value), true, value);
  assert.equal(normalizeDeadline({ id: '1', title: 'x', date: '2026-02-29' }), null);
});

test('legacy deadlines migrate in memory; reminder and type use an allowlist', () => {
  const legacy = { id: 'abc', title: ' Test ', date: '2026-11-16' };
  assert.deepEqual(normalizeDeadline(legacy), { id: 'abc', title: 'Test', date: '2026-11-16', type: '', reminderDays: 0 });
  assert.equal(normalizeDeadline({ ...legacy, type: 'stk', reminderDays: 14 }).type, 'stk');
  assert.equal(normalizeDeadline({ ...legacy, type: 'javascript:alert(1)', reminderDays: -5 }).reminderDays, 0);
  assert.equal(normalizeDeadline({ ...legacy, type: '__proto__' }).type, '');
});

test('due status is calendar-day based across DST and has overdue wording', () => {
  assert.deepEqual(deadlineTiming('2026-03-30', '2026-03-28'), { days: 2, label: 'O 2 dní', urgent: true });
  assert.equal(deadlineTiming('2026-11-15', '2026-11-16').label, 'Po termíne: 1 dní');
  assert.equal(deadlineTiming('2026-11-16', '2026-11-16').label, 'Dnes');
  assert.equal(deadlineTiming('2027-01-01', '2026-11-16').urgent, false);
});

test('ICS includes chosen alarms, next-step links and safe folded UTF-8 fields', () => {
  const title = 'Žiadosť; vozidlo, servis\\nový\r\nBEGIN:VEVENT' + ' č'.repeat(100);
  const calendar = createDeadlineCalendar([{ id: 'a\nb', title: title.slice(0, 120), date: '2037-12-31', type: 'stk', reminderDays: 14 }], new Date('2026-11-16T12:00:00Z'));
  const unfolded = calendar.replace(/\r\n /g, '');
  assert.match(unfolded, /DTSTART;VALUE=DATE:20371231\r\nDTEND;VALUE=DATE:20380101/);
  assert.match(unfolded, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-P14D/);
  assert.ok(unfolded.includes('SUMMARY:Žiadosť\\; vozidlo\\, servis\\\\nový\\nBEGIN:VEVENT'));
  assert.ok(unfolded.includes('URL:https://vsetko24.sk/navody/stk-priprava/'));
  assert.ok(unfolded.includes('UID:a%0Ab@vsetko24.sk'));
  assert.equal((unfolded.match(/\r\nBEGIN:VEVENT\r\n/g) || []).length, 1);
  for (const line of calendar.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
});

test('no reminder means no VALARM; invalid records are not exported', () => {
  const value = { id: 'x', title: 'Termín', date: '2028-02-29', reminderDays: 0 };
  const calendar = createDeadlineCalendar([value, { ...value, date: '2026-02-29' }]);
  assert.equal(calendar.includes('VALARM'), false);
  assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.ok(createDeadlineCalendar([{ ...value, date: '9999-12-31' }]).includes('DTSTART;VALUE=DATE:99991231'));
});

test('optional case association permits only workspace IDs and does not create one automatically', () => {
  const value = { id: 'x', title: 'Termín', date: '2028-02-29' };
  assert.equal(Object.hasOwn(normalizeDeadline(value), 'caseId'), false);
  assert.equal(normalizeDeadline({ ...value, caseId: 'case-123_ok' }).caseId, 'case-123_ok');
  assert.equal(Object.hasOwn(normalizeDeadline({ ...value, caseId: '<script>' }), 'caseId'), false);
});
