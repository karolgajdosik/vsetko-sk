import test from 'node:test';
import assert from 'node:assert/strict';
import {checkProductionAssistant,checkProductionAssistantBodyLimit,assistantLimitBodies} from '../scripts/check-production-assistant.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8'}});
const expectedPaths=['/navody/porovnanie-hypotek/','/navody/prepis-auta/','/navody/dedicske-konanie/'];
const officialUrls=[
 'https://nbs.sk/dohlad-nad-financnym-trhom/ofs/zivotne-situacie/chceme-byvat-sami/',
 'https://www.slovensko.sk/sk/zivotne-situacie/zivotna-situacia/_elektronicke-sluzby-evidencie',
 'https://www.justice.gov.sk/agenda-ministerstva/civilne-pravo/civilny-mimosporovy-poriadok/'
];
const official=idx=>[{title:'Oficiálny zdroj',url:officialUrls[idx]}];

test('production assistant smoke uses bounded guide navigation and no personal data',async()=>{
 const seen=[];
 const failures=await checkProductionAssistant({attempts:1,fetchImpl:async(url,options)=>{
  assert.equal(url.href,'https://vsetko24.sk/api/assistant');
  assert.equal(options.method,'POST');
  assert.equal(options.headers.origin,'https://vsetko24.sk');
  const payload=JSON.parse(options.body);
  assert.deepEqual(Object.keys(payload),['question']);
  assert.equal(typeof payload.question,'string');
  const expected=expectedPaths[seen.length];
  seen.push(payload.question);
  return json({mode:'guide-navigation',sources:[{title:'Návod',url:expected}],officialSources:official(seen.length-1)});
 }});
 assert.deepEqual(failures,[]);
 assert.equal(seen.length,3);
});

test('production assistant smoke rejects false 200, invalid content type and non-200',async()=>{
 let count=0;
 const failures=await checkProductionAssistant({attempts:1,fetchImpl:async()=>{
  count++;
  if(count===1)return json({mode:'ai',sources:[{url:expectedPaths[0]}]});
  if(count===2)return new Response('not json',{status:200,headers:{'content-type':'text/html'}});
  return json({error:'unavailable'},503);
 }});
 assert.deepEqual(failures,expectedPaths);
});

test('production assistant smoke retries transient failures without suppressing persistent failures',async()=>{
 const calls=new Map();
 const failures=await checkProductionAssistant({attempts:2,delayMs:0,fetchImpl:async(_url,options)=>{
  const question=JSON.parse(options.body).question;
  const count=(calls.get(question)||0)+1;
  calls.set(question,count);
  const index=[...calls.keys()].indexOf(question);
  if(index===0&&count===1)return json({error:'temporary'},503);
  if(index===1)return json({mode:'guide-navigation',sources:[]});
  return json({mode:'guide-navigation',sources:[{url:expectedPaths[index]}],officialSources:official(index)});
 }});
 assert.deepEqual(failures,[expectedPaths[1]]);
 assert.deepEqual([...calls.values()],[2,2,1]);
});


test('production assistant smoke rejects missing, wrong-topic and spoofed official links',async()=>{
 const invalid=[
  undefined,
  official(0), // valid domain, but wrong topic for vehicle transfer
  [{title:'Oficiálny zdroj',url:'https://nbs.sk.evil.example/'}]
 ];
 let index=0;
 const failures=await checkProductionAssistant({attempts:1,fetchImpl:async()=>{
  const i=index++;
  return json({mode:'guide-navigation',sources:[{url:expectedPaths[i]}],officialSources:invalid[i]});
 }});
 assert.deepEqual(failures,expectedPaths);
});

test('production assistant smoke rejects extra unsafe sources even with correct official link',async()=>{
 let index=0;
 const failures=await checkProductionAssistant({attempts:1,fetchImpl:async()=>{
  const i=index++;
  const sources=official(i);
  if(i===0)sources.push({title:'Falošný odkaz',url:'https://nbs.sk.evil.example/'});
  return json({mode:'guide-navigation',sources:[{url:expectedPaths[i]}],officialSources:sources});
 }});
 assert.deepEqual(failures,[expectedPaths[0]]);
});

test('production assistant body-limit probe sends UTF-8 JSON on both sides of 4096 bytes without personal data',async()=>{
 const encoder=new TextEncoder();
 const bodies=assistantLimitBodies();
 assert.deepEqual(bodies.map(x=>x.name),['within-limit','over-limit']);
 assert.ok(encoder.encode(bodies[0].body).byteLength<=4096);
 assert.ok(encoder.encode(bodies[1].body).byteLength>4096);
 assert.ok(bodies.every(x=>JSON.parse(x.body).question==='Ako vybaviť hypotéku?'));
 assert.ok(bodies.every(x=>JSON.parse(x.body).padding.includes('ž')));
 let index=0;
 const failures=await checkProductionAssistantBodyLimit({attempts:1,fetchImpl:async(url,options)=>{
  assert.equal(url.href,'https://vsetko24.sk/api/assistant');
  assert.equal(options.method,'POST');
  assert.equal(options.headers.origin,'https://vsetko24.sk');
  assert.equal(options.headers['content-length'],undefined);
  assert.equal(options.body,bodies[index].body);
  const response=index===0
   ?json({mode:'guide-navigation',sources:[{url:'/navody/porovnanie-hypotek/'}]})
   :json({error:'Otázka je príliš dlhá.'},413);
  index++;
  return response;
 }});
 assert.deepEqual(failures,[]);
 assert.equal(index,2);
});

test('production assistant body-limit probe rejects a false 200 for oversized JSON',async()=>{
 let index=0;
 const failures=await checkProductionAssistantBodyLimit({attempts:1,fetchImpl:async()=>{
  const response=index++===0
   ?json({mode:'guide-navigation',sources:[{url:'/navody/porovnanie-hypotek/'}]})
   :json({mode:'guide-navigation',sources:[{url:'/navody/porovnanie-hypotek/'}]});
  return response;
 }});
 assert.deepEqual(failures,['over-limit']);
});

test('production assistant body-limit probe rejects bad under-limit response and non-JSON 413',async()=>{
 let index=0;
 const failures=await checkProductionAssistantBodyLimit({attempts:1,fetchImpl:async()=>{
  return index++===0
   ?json({error:'Unavailable'},503)
   :new Response('<html>blocked</html>',{status:413,headers:{'content-type':'text/html'}});
 }});
 assert.deepEqual(failures,['within-limit','over-limit']);
});
