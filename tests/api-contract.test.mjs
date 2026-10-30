import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet as ecb} from '../functions/api/ecb-rates.js';
import {onRequestGet as chargers} from '../functions/api/nabijacky.js';
import {onRequestGet as rpo} from '../functions/api/rpo.js';
import {onRequestGet as indicators} from '../functions/api/ukazovatele.js';

async function withFetch(handler, fn) {
  const original=globalThis.fetch;
  globalThis.fetch=handler;
  try { await fn(); } finally { globalThis.fetch=original; }
}
const request=(path)=>new Request('https://vsetko24.sk'+path);

test('ECB: four supported currencies, parsed rates and latest date',async()=>{
  const seen=[];
  await withFetch(async url=>{
    seen.push(String(url));
    return new Response('TIME_PERIOD,OBS_VALUE\n2026-10-23,1.1\n2026-10-26,1.2\n',{status:200});
  },async()=>{
    const res=await ecb({request:request('/api/ecb-rates'),env:{}});
    assert.equal(res.status,200);
    const body=await res.json();
    assert.deepEqual(body.rates.map(x=>x.currency),['USD','CZK','GBP','PLN']);
    assert.ok(body.rates.every(x=>x.date==='2026-10-26'&&x.rate===1.2));
    assert.equal(seen.length,4);
    assert.ok(seen.every(url=>url.startsWith('https://data-api.ecb.europa.eu/')));
  });
});
test('ECB: unavailable upstream returns safe 503',async()=>{
  await withFetch(async()=>new Response('down',{status:503}),async()=>{
    const res=await ecb({request:request('/api/ecb-rates'),env:{}});
    assert.equal(res.status,503);
    assert.equal(res.headers.get('Cache-Control'),'no-store');
  });
});
test('Chargers: missing secret and invalid coordinates rejected without upstream calls',async()=>{
  await withFetch(async()=>{throw Error('should not fetch')},async()=>{
    assert.equal((await chargers({request:request('/api/nabijacky'),env:{}})).status,503);
    assert.equal((await chargers({request:request('/api/nabijacky?lat=99&lon=17&distance=30'),env:{OPENCHARGEMAP_API_KEY:'test'}})).status,400);
  });
});
test('Chargers: valid upstream stations normalized and invalid locations discarded',async()=>{
  await withFetch(async url=>{
    assert.ok(String(url).startsWith('https://api.openchargemap.io/v3/poi/'));
    return Response.json([
      {ID:1,AddressInfo:{Title:'Test station',Latitude:48.15,Longitude:17.11,Town:'Bratislava'},Connections:[{ConnectionType:{Title:'CCS'},PowerKW:150,CurrentType:{Title:'DC'}}]},
      {ID:2,AddressInfo:{Title:'Invalid',Latitude:0,Longitude:0}}
    ]);
  },async()=>{
    const res=await chargers({request:request('/api/nabijacky?lat=48.15&lon=17.11&distance=30'),env:{OPENCHARGEMAP_API_KEY:'test'}});
    const body=await res.json();
    assert.equal(res.status,200);
    assert.equal(body.count,1);
    assert.equal(body.stations[0].connections[0].isDc,true);
  });
});
test('RPO: invalid IČO rejected before fetching',async()=>{
  await withFetch(async()=>{throw Error('should not fetch')},async()=>{
    assert.equal((await rpo({request:request('/api/rpo?ico=123')})).status,400);
  });
});
test('RPO: only exact matching IČO is returned',async()=>{
  await withFetch(async()=>Response.json({results:[
    {identifier:'31333532',fullName:'Matching company'},
    {identifier:'99999999',fullName:'Other company'}
  ]}),async()=>{
    const res=await rpo({request:request('/api/rpo?ico=31333532')});
    const body=await res.json();
    assert.equal(res.status,200);
    assert.equal(body.count,1);
    assert.equal(body.results[0].name,'Matching company');
  });
});
test('World Bank: three latest non-null indicators and year labels',async()=>{
  await withFetch(async()=>Response.json([{},[
    {value:null,date:'2026'},{value:123,date:'2025'},{value:100,date:'2024'}
  ]]),async()=>{
    const res=await indicators();
    const body=await res.json();
    assert.equal(res.status,200);
    assert.equal(body.indicators.length,3);
    assert.ok(body.indicators.every(x=>x.value===123&&x.year==='2025'));
  });
});
test('World Bank: upstream error returns 503',async()=>{
  await withFetch(async()=>new Response('',{status:500}),async()=>{
    assert.equal((await indicators()).status,503);
  });
});

test('RPO: slow but successful upstream response is accepted',async()=>{
  await withFetch(async(_url,options)=>{
    assert.equal(options.signal.aborted,false);
    return Response.json({results:[{identifier:'31333532',name:'Test company'}]});
  },async()=>{
    const res=await rpo({request:request('/api/rpo?ico=31333532')});
    assert.equal(res.status,200);
    assert.equal((await res.json()).count,1);
  });
});

test('RPO: transient upstream 503 is retried once and recovered',async()=>{
 let calls=0;
 await withFetch(async()=>{
  calls++;
  return calls===1?new Response('',{status:503}):Response.json({results:[{identifier:'31333532',fullName:'Recovered company'}]});
 },async()=>{
  const res=await rpo({request:request('/api/rpo?ico=31333532')});
  assert.equal(res.status,200);
  assert.equal((await res.json()).results[0].name,'Recovered company');
  assert.equal(calls,2);
 });
});
test('RPO: persistent upstream errors return safe 503 after two attempts',async()=>{
 let calls=0;
 await withFetch(async()=>{calls++;return new Response('',{status:503});},async()=>{
  const res=await rpo({request:request('/api/rpo?ico=31333532')});
  assert.equal(res.status,503);
  assert.equal(res.headers.get('Cache-Control'),'no-store');
  assert.equal(calls,2);
 });
});

test('RPO: unexpected upstream response is not reported as zero companies',async()=>{
 for(const payload of [{message:'maintenance'},{data:[{identifier:'31333532'}]},null]){
  await withFetch(async()=>Response.json(payload),async()=>{
   const res=await rpo({request:request('/api/rpo?ico=31333532')});
   assert.equal(res.status,502);
   assert.equal(res.headers.get('Cache-Control'),'no-store');
   assert.match((await res.json()).error,/neočakávanú odpoveď/);
  });
 }
});
test('RPO: malformed records are rejected rather than silently skipped',async()=>{
 await withFetch(async()=>Response.json({results:[null]}),async()=>{
  const res=await rpo({request:request('/api/rpo?ico=31333532')});
  assert.equal(res.status,502);
 });
});

test('RPO: official timed identifiers and names are parsed correctly',async()=>{
 await withFetch(async()=>Response.json({results:[
  {id:123,identifiers:[{value:'31333532',validFrom:'1992-01-01'}],fullNames:[{value:'Starý názov',validTo:'2020-01-01'},{value:'ESET, spol. s r.o.',validFrom:'2020-01-02'}]},
  {id:124,identifiers:[{value:'99999999'}],fullNames:[{value:'Iná firma'}]}
 ]}),async()=>{
  const res=await rpo({request:request('/api/rpo?ico=31333532')});
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.count,1);
  assert.deepEqual(body.results[0],{identifier:'31333532',name:'ESET, spol. s r.o.',id:123});
 });
});

test('RPO: empty but valid results remain a legitimate empty search',async()=>{
 await withFetch(async()=>Response.json({results:[]}),async()=>{
  const res=await rpo({request:request('/api/rpo?ico=31333532')});
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.count,0);
  assert.deepEqual(body.results,[]);
 });
});
test('RPO: alternate items envelope and expired historical name are supported',async()=>{
 await withFetch(async()=>Response.json({items:[
  {identifiers:[{value:'31333532'}],fullNames:[{value:'Historic',validTo:'2020-01-01'},{value:'Current'}]},
  {identifiers:[{value:'00000000'}],fullNames:[{value:'Other'}]}
 ]}),async()=>{
  const res=await rpo({request:request('/api/rpo?ico=31333532')});
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.count,1);
  assert.equal(body.results[0].name,'Current');
 });
});

test('RPO: successful lookup is cached and upstream outage returns explicitly stale data with HTTP 503',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'caches');
 const stored=new Map();
 const cache={
  match:async key=>stored.get(key.url)?.clone(),
  put:async(key,response)=>{stored.set(key.url,response.clone());}
 };
 Object.defineProperty(globalThis,'caches',{value:{default:cache},configurable:true});
 let available=true;
 try{
  await withFetch(async()=>available?Response.json({results:[{identifier:'31333532',name:'Verified company'}]}):new Response('',{status:503}),async()=>{
   const live=await rpo({request:request('/api/rpo?ico=31333532')});
   assert.equal(live.status,200);
   assert.equal(stored.size,1);
   const originalData=await live.json();
   available=false;
   const fallback=await rpo({request:request('/api/rpo?ico=31333532')});
   assert.equal(fallback.status,503,'Outage must remain visible to health monitoring');
   assert.equal(fallback.headers.get('Cache-Control'),'no-store');
   const body=await fallback.json();
   assert.equal(body.stale,true);
   assert.equal(body.checkedAt,originalData.checkedAt,'Original verification time must be preserved');
   assert.equal(body.results[0].name,'Verified company');
   assert.match(body.note,/aktuálnosť sa teraz nedá potvrdiť/);
  });
 }finally{
  if(original)Object.defineProperty(globalThis,'caches',original);
  else delete globalThis.caches;
 }
});
test('RPO: expired or unrelated cached data never masks upstream outage',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'caches');
 const payloads=[
  {ico:'31333532',checkedAt:'2020-01-01T00:00:00.000Z',results:[{identifier:'31333532',name:'Old'}]},
  {ico:'99999999',checkedAt:new Date().toISOString(),results:[{identifier:'99999999',name:'Other'}]},
  {ico:'31333532',checkedAt:new Date().toISOString(),results:[]}
 ];
 try{
  for(const payload of payloads){
   Object.defineProperty(globalThis,'caches',{value:{default:{match:async()=>Response.json(payload)}},configurable:true});
   await withFetch(async()=>new Response('',{status:503}),async()=>{
    const res=await rpo({request:request('/api/rpo?ico=31333532')});
    assert.equal(res.status,503);
    assert.equal((await res.json()).stale,undefined);
   });
  }
 }finally{
  if(original)Object.defineProperty(globalThis,'caches',original);
  else delete globalThis.caches;
 }
});
