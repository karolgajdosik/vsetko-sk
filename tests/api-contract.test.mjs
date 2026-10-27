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
    return new Response('TIME_PERIOD,OBS_VALUE\\n2026-10-23,1.1\\n2026-10-26,1.2\\n',{status:200});
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
