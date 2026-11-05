import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {evaluateApiResponse} from '../scripts/production-api-health-utils.mjs';
import {probeOfficialRpo} from '../scripts/rpo-upstream-probe.mjs';
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

test('RPO timeout remains a failing health check with a clear diagnostic',()=>{
 const result=evaluateApiResponse('/api/rpo',503,{upstreamFailureType:'TimeoutError'},valid);
 assert.equal(result.ok,false);
 assert.match(result.reason,/upstream TimeoutError/);
});

test('independent RPO diagnostic checks the official endpoint for the expected IČO',async()=>{
 const result=await probeOfficialRpo({fetchImpl:async(url,options)=>{
  assert.equal(url.hostname,'api.statistics.sk');
  assert.equal(url.pathname,'/rpo/v1/search');
  assert.equal(url.searchParams.get('identifier'),'31333532');
  assert.equal(options.headers.Accept,'application/json');
  return Response.json({results:[{identifiers:[{value:'31333532'}]}]});
 }});
 assert.equal(result.status,'ok');
});
test('independent RPO diagnostic reports provider HTTP errors',async()=>{
 const result=await probeOfficialRpo({fetchImpl:async()=>new Response('',{status:503})});
 assert.deepEqual(result,{status:'upstream_http_error',detail:'HTTP 503'});
});
test('independent RPO diagnostic distinguishes timeout and malformed upstream data',async()=>{
 const timeout=await probeOfficialRpo({fetchImpl:async()=>{throw new DOMException('Timed out','TimeoutError');}});
 assert.deepEqual(timeout,{status:'network_error',detail:'TimeoutError'});
 const invalid=await probeOfficialRpo({fetchImpl:async()=>Response.json({message:'maintenance'})});
 assert.equal(invalid.status,'invalid_schema');
 const missing=await probeOfficialRpo({fetchImpl:async()=>Response.json({results:[{identifier:'00000000'}]})});
 assert.equal(missing.status,'no_matching_record');
});

test('production health reports live AI browser failures as workflow failures',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/production-api-health.yml',import.meta.url),'utf8');
 assert.match(workflow,/id:\s*assistantBrowser/);
 const gate=workflow.match(/- name: Mark workflow failed when UI check fails\s*\n\s*if:\s*\$\{\{\s*([^}]+)\}\}\s*\n\s*run:\s*exit 1/);
 assert.ok(gate,'Expected explicit exit 1 on failed production UI checks');
 for(const step of ['ui','mobile','assistantBrowser']){
  assert.ok(gate[1].includes(`steps.${step}.outcome == 'failure'`),`Missing failure signal for ${step}`);
 }
});

// Run core page smoke regression tests as part of the existing production health suite.
import './production-core-routes.test.mjs';
