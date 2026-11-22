import { DECISIONS_KEY, normalizeDecisions } from './decision-comparison.mjs';
import { CONTRACTS_KEY, normalizeContracts } from './contract-store.mjs';
import { ANNUAL_EXPENSES_KEY, normalizeAnnualExpenses } from './annual-expenses.mjs';
import { PROFILE_KEY, PROFILE_TOPICS, PROFILE_LINKS } from './profile-store.mjs';
import { VEHICLE_COST_KEY, validVehicleCosts } from './vehicle-costs.mjs';
import { WORKSPACE_KEY, normalizeWorkspace } from './workspace-store.mjs';


// V7 case records use the same bounded, opt-in local format as their journey pages.
const V7_SERVICE_KEY = 'v24-v7-service-cases-v1';
const V7_COMPLAINT_KEY = 'v24-v7-complaint-cases-v1';
const V7_CONTRACT_KEY = 'v24-v7-contract-end-v1';
const V7_KEYS = Object.freeze([V7_SERVICE_KEY, V7_COMPLAINT_KEY, V7_CONTRACT_KEY]);
const bounded = (v, max) => typeof v === 'string' && v.length <= max;
const cents = v => Number.isSafeInteger(v) && v >= 0 && v <= 10000000;
const optionalCents = v => v === null || cents(v);
const choice = (v, choices) => choices.includes(v);
function validateV7Case(key, item) {
  if (!record(item) || !bounded(item.id, 99) || !item.id || !Array.isArray(item.history) || item.history.length > 100) invalid();
  if (key === V7_SERVICE_KEY) {
    if (!bounded(item.service, 90) || !choice(item.source, ['manual','contract','estimate']) || ![item.old,item.next,item.fee,item.actualFee].every(cents) || ![item.alternative,item.actual].every(optionalCents) || !choice(item.decision, ['review','negotiate','switch','accept']) || !bounded(item.reply, 500) || !bounded(item.replyDate, 10) || !item.history.every(h => record(h) && bounded(h.date,40) && bounded(h.message,700))) invalid();
  } else if (key === V7_COMPLAINT_KEY) {
    if (!text(item.item,90) || !choice(item.source,['receipt','order','memory']) || !cents(item.price) || !cents(item.cost) || !text(item.problem,500) || !choice(item.request,['repair','replace','refund','review']) || !choice(item.action,['review','send','wait','close']) || !bounded(item.reply,500) || !bounded(item.replyDate,10) || !optionalCents(item.actual) || !cents(item.paid) || !item.history.every(h => record(h) && bounded(h.at,40) && bounded(h.note,700))) invalid();
  } else {
    if (!text(item.name,90) || !choice(item.kind,['insurance','service','other']) || !choice(item.source,['contract','notice','estimate']) || !realDate(item.endDate) || !cents(item.current) || !optionalCents(item.alternative) || !cents(item.fee) || !bounded(item.action,40) || !bounded(item.reply,500) || !(item.replyDate === '' || realDate(item.replyDate)) || !optionalCents(item.actual) || !cents(item.paid) || !item.history.every(h => record(h) && bounded(h.at,40) && bounded(h.note,700))) invalid();
  }
  return item;
}
function validateV7Slot(key, value) {
  if (!ownKeys(value,['version','entries']) || value.version !== 1 || !Array.isArray(value.entries) || value.entries.length > 20) invalid();
  const ids = new Set();
  for (const item of value.entries) {
    validateV7Case(key,item);
    if (ids.has(item.id)) invalid();
    ids.add(item.id);
  }
  return value;
}

export const BACKUP_MAX_BYTES = 2_000_000;
export const BACKUP_ITERATIONS = 210000;
const GUIDE_PREFIX = 'vsetko24:guide:v1:';
const GUIDE_LENGTHS = Object.freeze({ 'strata-dokladov': 5, 'zalozenie-zivnosti': 5, 'umrtie-v-rodine': 5, 'kupa-nehnutelnosti': 5, 'stahovanie-bytu': 7 });
const LEGACY_KEYS = Object.freeze([WORKSPACE_KEY, 'v24-personal-center-v1', PROFILE_KEY, VEHICLE_COST_KEY, ...Object.keys(GUIDE_LENGTHS).map(key => GUIDE_PREFIX + key)]);
const V6_KEYS = Object.freeze([...LEGACY_KEYS, DECISIONS_KEY, CONTRACTS_KEY, ANNUAL_EXPENSES_KEY]);
export const BACKUP_KEYS = Object.freeze([...V6_KEYS, ...V7_KEYS]);
const encoder = new TextEncoder();
const aad = encoder.encode('vsetko24-encrypted-backup:1');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ownKeys = (value, keys) => record(value) && Object.keys(value).every(key => keys.includes(key));
const text = (value, max = 120) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const realDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
const finiteMoney = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10000000;
function invalid() { throw new Error('Záloha obsahuje neplatné alebo nepodporované údaje.'); }
function validateCenter(value) {
  if (!ownKeys(value, ['version', 'tasks', 'deadlines', 'budget']) || value.version !== 1 || !Array.isArray(value.tasks) || value.tasks.length > 500 || !Array.isArray(value.deadlines) || value.deadlines.length > 500 || !ownKeys(value.budget, ['income','housing','loans','food','transport','other']) || !Object.values(value.budget).every(finiteMoney)) invalid();
  const ids = new Set();
  for (const task of value.tasks) {
    if (!ownKeys(task, ['id','title','done']) || !text(task.id) || ids.has(task.id) || !text(task.title) || typeof task.done !== 'boolean') invalid();
    ids.add(task.id);
  }
  ids.clear();
  for (const deadline of value.deadlines) {
    if (!ownKeys(deadline, ['id','title','date','type','reminderDays','caseId']) || !text(deadline.id) || ids.has(deadline.id) || !text(deadline.title) || !realDate(deadline.date) || (deadline.type !== undefined && !['','stk','pzp','service','identity','passport','driving','insurance','mortgage','contract'].includes(deadline.type)) || (deadline.reminderDays !== undefined && ![0,1,7,14,30,60].includes(deadline.reminderDays)) || (deadline.caseId !== undefined && (typeof deadline.caseId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(deadline.caseId)))) invalid();
    ids.add(deadline.id);
  }
  return value;
}
function validateProfile(value) {
  if (!ownKeys(value,['version','topics','favorites']) || value.version !== 1) invalid();
  for (const [field, catalogue] of [['topics', PROFILE_TOPICS], ['favorites', PROFILE_LINKS]]) {
    const ids = value[field];
    if (!Array.isArray(ids) || ids.length > catalogue.length || new Set(ids).size !== ids.length || !ids.every(id => catalogue.some(item => item.id === id))) invalid();
  }
  return value;
}
function validateSlot(key, value) {
  if (value === null) return null;
  if (V7_KEYS.includes(key)) return validateV7Slot(key, value);
  if (key === DECISIONS_KEY) return normalizeDecisions(value);
  if (key === CONTRACTS_KEY) return normalizeContracts(value);
  if (key === ANNUAL_EXPENSES_KEY) return normalizeAnnualExpenses(value);
  if (key === WORKSPACE_KEY) return normalizeWorkspace(value);
  if (key === 'v24-personal-center-v1') return validateCenter(value);
  if (key === PROFILE_KEY) return validateProfile(value);
  if (key === VEHICLE_COST_KEY) {
    if (!ownKeys(value, ['version','distance','entries']) || !validVehicleCosts(value) || !value.entries.every(entry => ownKeys(entry, ['id','date','category','cents']))) invalid();
    return value;
  }
  const total = GUIDE_LENGTHS[key.slice(GUIDE_PREFIX.length)];
  if (!key.startsWith(GUIDE_PREFIX) || !total || !Array.isArray(value) || value.length > total || !value.every(item => typeof item === 'boolean')) invalid();
  return value;
}
export function validateBackupPayload(value) {
  if (!ownKeys(value, ['format','version','createdAt','entries']) || value.format !== 'vsetko24-workspace-data' || value.version !== 1 || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || !record(value.entries) || !([BACKUP_KEYS,V6_KEYS,LEGACY_KEYS].some(keys => Object.keys(value.entries).length === keys.length && keys.every(key => Object.hasOwn(value.entries,key))))) invalid();
  const entries = {};
  for (const key of BACKUP_KEYS) if (Object.hasOwn(value.entries,key)) entries[key] = validateSlot(key, value.entries[key]);
  // Canonical independent object; no caller-owned references are retained.
  const result = JSON.parse(JSON.stringify({ format: value.format, version: 1, createdAt: value.createdAt, entries }));
  if (encoder.encode(JSON.stringify(result)).byteLength > BACKUP_MAX_BYTES / 2) invalid();
  return result;
}
export function snapshotBackupStorage(storage) {
  return Object.fromEntries(BACKUP_KEYS.map(key => [key, storage.getItem(key)]));
}
export function collectBackup(storage, now = new Date()) {
  const raw = snapshotBackupStorage(storage);
  const entries = Object.fromEntries(BACKUP_KEYS.map(key => [key, raw[key] === null ? null : JSON.parse(raw[key])]));
  return validateBackupPayload({ format: 'vsetko24-workspace-data', version: 1, createdAt: now.toISOString(), entries });
}
export function backupSummary(payload) {
  const { entries } = validateBackupPayload(payload);
  const center = entries['v24-personal-center-v1'];
  const profile = entries[PROFILE_KEY];
  return {
    cases: entries[WORKSPACE_KEY]?.cases.length ?? 0,
    tasks: center?.tasks.length ?? 0,
    deadlines: center?.deadlines.length ?? 0,
    vehicleEntries: entries[VEHICLE_COST_KEY]?.entries.length ?? 0,
    favorites: profile?.favorites.length ?? 0,
    completedGuideSteps: Object.keys(GUIDE_LENGTHS).reduce((sum,key) => sum + (entries[GUIDE_PREFIX + key]?.filter(Boolean).length ?? 0), 0),
    storedSections: Object.values(entries).filter(value => value !== null).length,
  };
}
const base64 = bytes => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(out);
};
function unbase64(value, min, max) {
  if (typeof value !== 'string' || value.length > Math.ceil(max / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) invalid();
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0));
  if (bytes.length < min || bytes.length > max) invalid();
  return bytes;
}
function cryptoApi(provider) {
  const api = provider ?? globalThis.crypto;
  if (!api?.subtle || !api?.getRandomValues) throw new Error('Šifrovanie vyžaduje moderný prehliadač a zabezpečené HTTPS spojenie.');
  return api;
}
function passwordCheck(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024 || !password.trim()) throw new Error('Použite heslo dlhé 12 až 1 024 znakov.');
}
async function keyFor(api, password, salt, usage) {
  const material = await api.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return api.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: BACKUP_ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
}
export async function encryptBackup(payload, password, provider) {
  passwordCheck(password);
  const data = validateBackupPayload(payload);
  const api = cryptoApi(provider);
  const salt = api.getRandomValues(new Uint8Array(16));
  const iv = api.getRandomValues(new Uint8Array(12));
  const key = await keyFor(api, password, salt, 'encrypt');
  const ciphertext = await api.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, encoder.encode(JSON.stringify(data)));
  return JSON.stringify({ format: 'vsetko24-encrypted-backup', version: 1, cipher: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: BACKUP_ITERATIONS, salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)) });
}
export async function decryptBackup(input, password, provider) {
  passwordCheck(password);
  if (typeof input !== 'string' || encoder.encode(input).byteLength > BACKUP_MAX_BYTES) throw new Error('Záložný súbor je príliš veľký (maximum 2 MB).');
  const envelope = JSON.parse(input);
  if (!ownKeys(envelope, ['format','version','cipher','kdf','iterations','salt','iv','ciphertext']) || envelope.format !== 'vsetko24-encrypted-backup' || envelope.version !== 1 || envelope.cipher !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== BACKUP_ITERATIONS) invalid();
  const salt = unbase64(envelope.salt, 16, 16), iv = unbase64(envelope.iv, 12, 12), ciphertext = unbase64(envelope.ciphertext, 16, BACKUP_MAX_BYTES);
  const api = cryptoApi(provider);
  const key = await keyFor(api, password, salt, 'decrypt');
  let plain;
  try { plain = await api.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, ciphertext); }
  catch { throw new Error('Nesprávne heslo alebo poškodená záloha. Žiadne údaje sa nezmenili.'); }
  return validateBackupPayload(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain)));
}
export function restoreBackup(storage, payload, expectedSnapshot) {
  const valid = validateBackupPayload(payload);
  const before = snapshotBackupStorage(storage);
  if (!expectedSnapshot || !BACKUP_KEYS.every(key => Object.hasOwn(expectedSnapshot, key) && expectedSnapshot[key] === before[key])) throw new Error('Údaje sa od náhľadu zmenili. Načítajte zálohu znovu; nič sa neprepísalo.');
  const next = Object.fromEntries(BACKUP_KEYS.map(key => [key, !Object.hasOwn(valid.entries,key) ? before[key] : valid.entries[key] === null ? null : JSON.stringify(valid.entries[key])]));
  const changed = [];
  try {
    for (const key of BACKUP_KEYS) {
      if (next[key] === before[key]) continue;
      changed.push(key);
      if (next[key] === null) storage.removeItem(key); else storage.setItem(key, next[key]);
    }
  } catch {
    let rollbackFailed = false;
    for (const key of changed.reverse()) {
      try { if (before[key] === null) storage.removeItem(key); else storage.setItem(key, before[key]); }
      catch { rollbackFailed = true; }
    }
    const error = new Error(rollbackFailed ? 'Obnovenie aj návrat niektorých údajov zlyhali. Nezatvárajte stránku; pôvodnú núdzovú zálohu si uložte a skontrolujte údaje prehliadača.' : 'Prehliadač nepovolil obnovenie. Pôvodné údaje boli vrátené.');
    error.rollbackFailed = rollbackFailed;
    error.previousSnapshot = rollbackFailed ? before : undefined;
    throw error;
  }
  return backupSummary(valid);
}
