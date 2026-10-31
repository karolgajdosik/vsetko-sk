// Official Slovak RPO lookup by IČO only. Never expose a generic upstream proxy.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'public, max-age=600, s-maxage=21600':'no-store'}});
// Best-effort Cloudflare edge cache: only previously verified, nonempty IČO results.
// Cached data is never represented as a successful live lookup during an outage.
const cacheKey=(request,ico)=>new Request(new URL('/api/rpo?ico='+ico,request.url).toString());
async function readVerifiedCache(request,ico){
 try{
  const cache=globalThis.caches?.default;
  if(!cache)return null;
  const response=await cache.match(cacheKey(request,ico));
  if(!response?.ok)return null;
  const data=await response.json();
  const age=Date.now()-Date.parse(data?.checkedAt);
  if(data?.ico!==ico||!Array.isArray(data.results)||!data.results.length||!data.results.every(x=>x?.identifier===ico&&typeof x.name==='string'&&x.name.trim())||!Number.isFinite(age)||age<0||age>86400000)return null;
  return data;
 }catch(error){console.warn('RPO cached lookup unavailable',{type:error?.name||'Error'});return null;}
}
async function saveVerifiedCache(request,ico,data){
 if(!data.results.length)return;
 try{
  const cache=globalThis.caches?.default;
  if(!cache)return;
  await cache.put(cacheKey(request,ico),new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=86400'}}));
 }catch(error){console.warn('RPO cache write unavailable',{type:error?.name||'Error'});}
}
export async function onRequestGet({request}){
 const ico=new URL(request.url).searchParams.get('ico')?.trim()||'';
 if(!/^\d{8}$/.test(ico))return json({error:'Zadajte platné osemmiestne IČO.'},400);
 let lastUpstreamStatus=null;
 let lastUpstreamFailureType=null;
 try{
  let raw;
  for(let attempt=0;attempt<2;attempt++){
   let attemptUpstreamStatus=null;
   try{
    const upstream=await fetch('https://api.statistics.sk/rpo/v1/search?identifier='+ico,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
    if(!upstream.ok){attemptUpstreamStatus=upstream.status;console.warn('RPO upstream HTTP failure',{status:upstream.status,attempt:attempt+1});throw Error('RPO unavailable: '+upstream.status); }
    raw=await upstream.json();
    break;
   }catch(error){
    // Diagnostics must describe the final attempt, not a different earlier failure.
    lastUpstreamStatus=attemptUpstreamStatus;
    lastUpstreamFailureType=attemptUpstreamStatus===null&&['TimeoutError','AbortError','TypeError'].includes(error?.name)?error.name:null;console.warn('RPO upstream request failed',{attempt:attempt+1,type:error?.name||'Error'});if(attempt===1)throw error;}
  }
  const items=Array.isArray(raw)?raw:Array.isArray(raw?.results)?raw.results:Array.isArray(raw?.items)?raw.items:null;
  if(!items){console.error('RPO unexpected upstream response shape',{type:raw===null?'null':Array.isArray(raw)?'array':typeof raw});return json({error:'Register vrátil neočakávanú odpoveď. Výsledok vyhľadávania nie je možné overiť.'},502);}
  if(items.some(x=>!x||typeof x!=='object'||Array.isArray(x))){console.error('RPO invalid upstream record type');return json({error:'Register vrátil neplatné údaje. Skúste to neskôr.'},502);}
  // RPO fullNames can contain historical or future names. Never label them as current.
  const isoDay=value=>{
   if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value))return null;
   const day=value.slice(0,10);
   // Date.parse normalizes impossible days (e.g. February 31) instead of rejecting them.
   const parsedDay=new Date(day+'T00:00:00.000Z');
   if(Number.isNaN(parsedDay.getTime())||parsedDay.toISOString().slice(0,10)!==day)return null;
   return Number.isNaN(Date.parse(value))?null:day;
  };
  const current=values=>{
   if(!Array.isArray(values))return null;
   const today=new Date().toISOString().slice(0,10);
   return values.find(x=>{
    if(!x||typeof x.value!=='string'||!x.value.trim())return false;
    const from=x.validFrom==null?null:isoDay(x.validFrom);
    const to=x.validTo==null?null:isoDay(x.validTo);
    return (x.validFrom==null||(from!==null&&from<=today))&&(x.validTo==null||(to!==null&&to>=today));
   })?.value??null;
  };
  const safe=items.filter(x=>{
   const identifiers=Array.isArray(x.identifiers)?x.identifiers.filter(v=>v&&typeof v.value==='string').map(v=>v.value):[];
   return identifiers.includes(ico)||String(x.identifier??x.identificationNumber??x.ico??'')===ico;
  }).slice(0,5).map(x=>({identifier:ico,name:current(x.fullNames)??(typeof x.fullName==='string'?x.fullName:typeof x.name==='string'?x.name:typeof x.businessName==='string'?x.businessName:null),id:Number.isSafeInteger(x.id)?x.id:null}));
  // A matched company without a usable name is not a verified RPO result.
  // Keep it out of both successful API responses and the edge cache.
  if(safe.some(x=>typeof x.name!=='string'||!x.name.trim())){
   console.error('RPO matching record missing a usable name');
   return json({error:'Register vrátil neúplné údaje. Výsledok vyhľadávania nie je možné overiť.'},502);
  }
  const data={ico,results:safe,count:safe.length,source:'Register právnických osôb (RPO)',sourceUrl:'https://rpo.minv.sk/new/',checkedAt:new Date().toISOString(),note:'RPO sa aktualizuje spravidla raz denne. Výpis má informatívny charakter.'};
  await saveVerifiedCache(request,ico,data);
  return json(data);
 }catch(error){
  console.error('RPO lookup unavailable',{type:error?.name||'Error'});
  const cached=await readVerifiedCache(request,ico);
  if(cached)return json({...cached,stale:true,...(lastUpstreamStatus?{upstreamStatus:lastUpstreamStatus}:lastUpstreamFailureType?{upstreamFailureType:lastUpstreamFailureType}:{}),error:'Oficiálny register je momentálne nedostupný.',note:'Zobrazené údaje pochádzajú z predchádzajúceho overenia. Ich aktuálnosť sa teraz nedá potvrdiť.'},503);
  return json({error:'Oficiálny register je momentálne nedostupný. Skúste to neskôr.',...(lastUpstreamStatus?{upstreamStatus:lastUpstreamStatus}:lastUpstreamFailureType?{upstreamFailureType:lastUpstreamFailureType}:{})},503);
 }
}
