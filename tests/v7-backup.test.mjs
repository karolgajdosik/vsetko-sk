import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {collectBackup,validateBackupPayload,encryptBackup,decryptBackup,restoreBackup,snapshotBackupStorage} from '../src/lib/workspace-backup.mjs';
import {v7Entries} from './fixtures/v7-cases.mjs';
const keys=Object.keys(v7Entries),password='Bezpečná záloha 12345!';
function memory(entries={}) {const map=new Map(Object.entries(entries).map(([k,v])=>[k,JSON.stringify(v)]));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const sample=()=>collectBackup(memory(v7Entries));
test('three populated V7 journeys survive encrypted export and confirmed restore with history and actual results',async()=>{
 const encrypted=await encryptBackup(sample(),password,webcrypto);
 assert.ok(!encrypted.includes('Práčka'));
 const decoded=await decryptBackup(encrypted,password,webcrypto),target=memory();
 restoreBackup(target,decoded,snapshotBackupStorage(target));
 for(const key of keys) assert.deepEqual(JSON.parse(target.getItem(key)),v7Entries[key]);
});
for(const version of [5,6]) test(`encrypted V${version} backup preserves newer populated stores`,async()=>{
 const p=sample();for(const key of keys)delete p.entries[key];
 const v6=['v24-decisions-v6','v24-contracts-v6','v24-annual-expenses-v6'];
 if(version===5)for(const key of v6)delete p.entries[key];
 const decoded=await decryptBackup(await encryptBackup(p,password,webcrypto),password,webcrypto);
 const target=memory({...v7Entries,'v24-contracts-v6':{version:1,entries:[]}});
 const before=snapshotBackupStorage(target);restoreBackup(target,decoded,before);
 for(const key of keys)assert.equal(target.getItem(key),before[key]);
 if(version===5)assert.equal(target.getItem(v6[1]),before[v6[1]]);
});
test('invalid V7 records reject before any storage mutation',()=>{
 for(const key of keys)for(const mutate of [
  r=>r.id='',r=>r.history=[null],r=>r.history=Array(101).fill({}),r=>r.reply='x'.repeat(501),r=>r.actual=-1,r=>r.actual=0.5,r=>r.source='unknown',
 ]){const p=sample();mutate(p.entries[key].entries[0]);const target=memory(v7Entries),before=snapshotBackupStorage(target);assert.throws(()=>restoreBackup(target,p,before));assert.deepEqual(snapshotBackupStorage(target),before);}
 for(const key of keys){const p=sample();p.entries[key].entries.push(p.entries[key].entries[0]);assert.throws(()=>validateBackupPayload(p));const partial=sample();delete partial.entries[key];assert.throws(()=>validateBackupPayload(partial));}
 const p=sample();p.entries[keys[2]].entries[0].endDate='2027-02-30';assert.throws(()=>validateBackupPayload(p));
});
test('failure on final V7 store rolls back all preceding writes and stale previews do not overwrite V7 changes',()=>{
 const target=memory(),before=snapshotBackupStorage(target),set=target.setItem;let failed=false;
 target.setItem=(k,v)=>{if(k===keys[2]&&!failed){failed=true;throw Error('quota');}set(k,v);};
 assert.throws(()=>restoreBackup(target,sample(),before),/Pôvodné údaje boli vrátené/);assert.deepEqual(snapshotBackupStorage(target),before);
 set(keys[0],JSON.stringify(v7Entries[keys[0]]));assert.throws(()=>restoreBackup(target,sample(),before),/zmenili/);
});
test('damaged local JSON and unavailable storage block export',()=>{
 const target=memory(v7Entries);target.setItem(keys[1],'{broken');assert.throws(()=>collectBackup(target));
 assert.throws(()=>collectBackup({getItem(){throw Error('blocked');}}),/blocked/);
});
