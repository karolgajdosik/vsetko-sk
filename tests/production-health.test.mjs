import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateApiResponse} from '../scripts/production-api-health-utils.mjs';
const valid=data=>Array.isArray(data.results)&&data.results.some(x=>x.identifier==='31333532'&&typeof x.name==='string');
test('healthy live RPO response passes',()=>{
 assert.deepEqual(evaluateApiResponse('/api/rpo',200,{results:[{identifier:'31333532',name:'Test'}]},valid),{ok:true,reason:''});
});
test('stale cached RPO data remains a failure with useful timestamp',()=>{
 const result=evaluateApiResponse('/api/rpo',503,{stale:true,checkedAt:'2026-10-30T12:00:00.000Z',results:[{identifier:'31333532',name:'Test'}]},valid);
 assert.equal(result.ok,false);
 assert.match(result.reason,/HTTP 503/);
 assert.match(result.reason,/2026-10-30T12:00:00.000Z/);
 assert.match(result.reason,/stale/);
});
test('RPO outage without cache reports the missing verified result',()=>{
 const result=evaluateApiResponse('/api/rpo',503,{error:'Unavailable'},valid);
 assert.equal(result.ok,false);
 assert.match(result.reason,/no verified cached result/);
});
test('malformed successful response fails schema validation',()=>{
 const result=evaluateApiResponse('/api/rpo',200,{message:'maintenance'},valid);
 assert.equal(result.ok,false);
 assert.match(result.reason,/unexpected response schema/);
});
test('other upstream errors and throttling stay visible',()=>{
 assert.equal(evaluateApiResponse('/api/ukazovatele',502,{},()=>true).ok,false);
 assert.match(evaluateApiResponse('/api/nabijacky',429,{},()=>true).reason,/rate limited/);
});

test('RPO upstream HTTP status is included in outage diagnostics without treating it as healthy',()=>{
 const result=evaluateApiResponse('/api/rpo',503,{upstreamStatus:429,error:'Unavailable'},valid);
 assert.equal(result.ok,false);
 assert.match(result.reason,/upstream HTTP 429/);
 assert.match(result.reason,/no verified cached result/);
});
