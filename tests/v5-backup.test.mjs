import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { BACKUP_KEYS, BACKUP_MAX_BYTES, collectBackup, validateBackupPayload, encryptBackup, decryptBackup, restoreBackup, snapshotBackupStorage, backupSummary } from '../src/lib/workspace-backup.mjs';
import { emptyWorkspace, createCase, WORKSPACE_KEY } from '../src/lib/workspace-store.mjs';

class MemoryStorage {
  data = new Map(); failOnceKey = null;
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key,value) { if (key === this.failOnceKey) { this.failOnceKey = null; throw new Error('quota'); } this.data.set(key,String(value)); }
  removeItem(key) { this.data.delete(key); }
}
function sample() {
  const storage = new MemoryStorage();
  const scenario = createCase('home', 'Byt č. 2', '2026-11-16T10:00:00.000Z', 'case-1');
  scenario.values = {purchasePrice:220000, downPayment:44000, monthlyIncome:2300, monthlyExpenses:1200};
  storage.setItem(WORKSPACE_KEY, JSON.stringify({...emptyWorkspace(), activeCaseId:scenario.id, cases:[scenario]}));
  storage.setItem('v24-personal-center-v1', JSON.stringify({version:1,tasks:[{id:'a',title:'Výmena dokladu',done:false}],deadlines:[{id:'b',title:'Poistenie',date:'2027-02-28',type:'pzp',reminderDays:30,caseId:'case-1'}],budget:{income:1000,food:120.25}}));
  storage.setItem('v24-local-profile-v1', JSON.stringify({version:1,topics:['auto'],favorites:['kalendar']}));
  storage.setItem('v24-vehicle-costs-v1', JSON.stringify({version:1,distance:100,entries:[{id:'expense-1',date:'2026-11-16',category:'service',cents:1250}]}));
  storage.setItem('vsetko24:guide:v1:stahovanie-bytu', JSON.stringify([true,false,true,false,false,false,false]));
  return collectBackup(storage, new Date('2026-11-16T10:00:00Z'));
}

test('encrypted full workspace roundtrip keeps Slovak text, all sections, and random salts', async () => {
  const payload = sample();
  const first = await encryptBackup(payload, 'Moje dlhé heslo 123!', webcrypto);
  const second = await encryptBackup(payload, 'Moje dlhé heslo 123!', webcrypto);
  assert.notEqual(first, second);
  assert.equal(first.includes('Byt č. 2'), false);
  assert.equal(first.includes('2300'), false);
  const decrypted = await decryptBackup(first, 'Moje dlhé heslo 123!', webcrypto);
  assert.deepEqual(decrypted, payload);
  assert.equal(decrypted.entries['v24-personal-center-v1'].deadlines[0].caseId, 'case-1');
  assert.deepEqual(backupSummary(payload), {cases:1,tasks:1,deadlines:1,vehicleEntries:1,favorites:1,completedGuideSteps:2,storedSections:5});
});

test('wrong password, authenticated ciphertext tampering and unsupported KDF are rejected', async () => {
  const encrypted = await encryptBackup(sample(), 'Moje dlhé heslo 123!', webcrypto);
  await assert.rejects(decryptBackup(encrypted, 'Úplne iné heslo 456!', webcrypto), /Nesprávne heslo/);
  const tampered = JSON.parse(encrypted);
  tampered.ciphertext = (tampered.ciphertext[0] === 'A' ? 'B' : 'A') + tampered.ciphertext.slice(1);
  await assert.rejects(decryptBackup(JSON.stringify(tampered), 'Moje dlhé heslo 123!', webcrypto), /Nesprávne heslo/);
  tampered.iterations = 999999999;
  await assert.rejects(decryptBackup(JSON.stringify(tampered), 'Moje dlhé heslo 123!', webcrypto), /neplatné/);
});

test('bounded input and strong password validation run before derivation', async () => {
  await assert.rejects(encryptBackup(sample(), 'short', webcrypto), /12/);
  await assert.rejects(decryptBackup('x'.repeat(BACKUP_MAX_BYTES + 1), 'Moje dlhé heslo 123!', webcrypto), /veľký/);
  await assert.rejects(decryptBackup('{"format":"plain"}', 'Moje dlhé heslo 123!', webcrypto), /neplatné/);
});

test('malformed schema fails without writing: invalid dates, unknown keys, duplicate IDs, invalid categories', () => {
  for(const modify of [
    payload => { payload.entries['v24-personal-center-v1'].deadlines[0].date='2027-02-30'; },
    payload => { payload.entries['v24-personal-center-v1'].deadlines[0].reminderDays=90; },
    payload => { payload.entries['v24-personal-center-v1'].deadlines[0].caseId='../unsafe'; },
    payload => { payload.entries['v24-personal-center-v1'].deadlines[0].caseId=123; },
    payload => { payload.entries['v24-personal-center-v1'].deadlines[0].caseId='a'.repeat(81); },
    payload => { payload.entries['v24-personal-center-v1'].tasks.push({...payload.entries['v24-personal-center-v1'].tasks[0]}); },
    payload => { payload.entries['v24-local-profile-v1'].favorites=['unknown']; },
    payload => { payload.entries['v24-vehicle-costs-v1'].entries[0].category='unknown'; },
    payload => { payload.entries['vsetko24:guide:v1:stahovanie-bytu']=[true,'yes']; },
    payload => { payload.entries['tracking-token']='secret'; },
    payload => { delete payload.entries['v24-local-profile-v1']; },
    payload => { payload.entries[WORKSPACE_KEY].cases[0].values.monthlyIncome=-1; },
  ]) {
    const value=sample(); modify(value);
    assert.throws(() => validateBackupPayload(value));
  }
});

test('confirmed restore replaces supported slots, removes absent slots, leaves unrelated storage untouched', () => {
  const storage = new MemoryStorage();
  storage.setItem('v24-theme','dark'); storage.setItem('other-service-token','do-not-touch');
  storage.setItem('vsetko24:guide:v1:strata-dokladov','[true]');
  const snapshot = snapshotBackupStorage(storage);
  // Validation and preview are pure and never alter the storage.
  validateBackupPayload(sample()); backupSummary(sample());
  assert.equal(storage.getItem('vsetko24:guide:v1:strata-dokladov'),'[true]');
  restoreBackup(storage,sample(),snapshot);
  assert.equal(storage.getItem('v24-theme'),'dark');
  assert.equal(storage.getItem('other-service-token'),'do-not-touch');
  assert.equal(storage.getItem('vsetko24:guide:v1:strata-dokladov'),null);
  assert.deepEqual(collectBackup(storage).entries,sample().entries);
});

test('restore requires matching preview snapshot; stale preview never overwrites another tab', () => {
  const storage = new MemoryStorage();
  const snapshot = snapshotBackupStorage(storage);
  storage.setItem('v24-local-profile-v1',JSON.stringify({version:1,topics:[],favorites:[]}));
  assert.throws(() => restoreBackup(storage,sample(),snapshot), /zmenili/);
  assert.equal(storage.getItem(WORKSPACE_KEY),null);
  assert.throws(() => restoreBackup(storage,sample()), /zmenili/);
});

test('storage quota failure rolls back every modified supported key', () => {
  const storage = new MemoryStorage();
  storage.setItem('v24-personal-center-v1',JSON.stringify({version:1,tasks:[],deadlines:[],budget:{income:500}}));
  storage.setItem('v24-theme','dark');
  const before = snapshotBackupStorage(storage);
  storage.failOnceKey = 'v24-local-profile-v1';
  assert.throws(() => restoreBackup(storage,sample(),before), /Pôvodné údaje boli vrátené/);
  assert.deepEqual(snapshotBackupStorage(storage),before);
  assert.equal(storage.getItem('v24-theme'),'dark');
});

test('all supported slots are fixed and block unsupported keys from import', () => {
  assert.equal(BACKUP_KEYS.length,16);
  assert.equal(new Set(BACKUP_KEYS).size,16);
  const storage={getItem(){throw Error('blocked');}};
  assert.throws(() => collectBackup(storage), /blocked/);
});
