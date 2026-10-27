// Official Slovak RPO lookup by IČO only. Never expose a generic upstream proxy.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'public, max-age=600, s-maxage=21600':'no-store'}});
export async function onRequestGet({request}){
 const ico=new URL(request.url).searchParams.get('ico')?.trim()||'';
 if(!/^\d{8}$/.test(ico))return json({error:'Zadajte platné osemmiestne IČO.'},400);
 try{
  const upstream=await fetch('https://api.statistics.sk/rpo/v1/search?identifier='+ico,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000)});
  if(!upstream.ok)throw Error('RPO unavailable');
  const raw=await upstream.json();
  const items=Array.isArray(raw)?raw:Array.isArray(raw.results)?raw.results:Array.isArray(raw.items)?raw.items:[];
  const safe=items.filter(x=>String(x.identifier??x.identificationNumber??x.ico??'')===ico).slice(0,5).map(x=>({identifier:String(x.identifier??x.identificationNumber??x.ico),name:typeof x.fullName==='string'?x.fullName:typeof x.name==='string'?x.name:typeof x.businessName==='string'?x.businessName:null,id:Number.isSafeInteger(x.id)?x.id:null}));
  return json({ico,results:safe,count:safe.length,source:'Register právnických osôb (RPO)',sourceUrl:'https://rpot.statistics.sk/',checkedAt:new Date().toISOString(),note:'RPO sa aktualizuje spravidla raz denne. Výpis má informatívny charakter.'});
 }catch{return json({error:'Oficiálny register je momentálne nedostupný. Skúste to neskôr.'},503);}
}
