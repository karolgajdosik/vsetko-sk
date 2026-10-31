import test from 'node:test';
import assert from 'node:assert/strict';
import {checkProductionAssistant} from '../scripts/check-production-assistant.mjs';

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
  official(1),
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
