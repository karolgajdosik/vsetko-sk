// Official Slovak RPO lookup by IČO only. Never expose a generic upstream proxy.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'public, max-age=600, s-maxage=21600':'no-store'}});
export async function onRequestGet({request}){
 const ico=new URL(request.url).searchParams.get('ico')?.trim()||'';
 if(!/^\d{8}$/.test(ico))return json({error:'Zadajte platné osemmiestne IČO.'},400);
 try{
  let raw;
  for(let attempt=0;attempt<2;attempt++){
   try{
    const upstream=await fetch('https://api.statistics.sk/rpo/v1/search?identifier='+ico,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
    if(!upstream.ok){console.warn('RPO upstream HTTP failure',{status:upstream.status,attempt:attempt+1});throw Error('RPO unavailable: '+upstream.status); }
    raw=await upstream.json();
    break;
   }catch(error){console.warn('RPO upstream request failed',{attempt:attempt+1,type:error?.name||'Error'});if(attempt===1)throw error;}
  }
  const items=Array.isArray(raw)?raw:Array.isArray(raw.results)?raw.results:Array.isArray(raw.items)?raw.items:[];
  const safe=items.filter(x=>String(x.identifier??x.identificationNumber??x.ico??'')===ico).slice(0,5).map(x=>({identifier:String(x.identifier??x.identificationNumber??x.ico),name:typeof x.fullName==='string'?x.fullName:typeof x.name==='string'?x.name:typeof x.businessName==='string'?x.businessName:null,id:Number.isSafeInteger(x.id)?x.id:null}));
  return json({ico,results:safe,count:safe.length,source:'Register právnických osôb (RPO)',sourceUrl:'https://rpo.minv.sk/new/',checkedAt:new Date().toISOString(),note:'RPO sa aktualizuje spravidla raz denne. Výpis má informatívny charakter.'});
 }catch(error){console.error('RPO lookup unavailable',{type:error?.name||'Error'});return json({error:'Oficiálny register je momentálne nedostupný. Skúste to neskôr.'},503);}
}
