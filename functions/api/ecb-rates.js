// Cloudflare Pages Function: narrow ECB proxy, no user-controlled upstream URLs.
const CURRENCIES=['USD','CZK','GBP','PLN'];
const ENDPOINT='https://data-api.ecb.europa.eu/service/data/EXR/';
function parseCsv(csv){const lines=csv.trim().split(/\r?\n/);if(lines.length<2)throw new Error('No ECB observations');const headers=lines[0].split(',');const dateIdx=headers.indexOf('TIME_PERIOD');const valueIdx=headers.indexOf('OBS_VALUE');if(dateIdx<0||valueIdx<0)throw new Error('Unexpected ECB format');const values=lines.slice(1).map(line=>{const cols=line.split(',');return {date:cols[dateIdx],rate:Number(cols[valueIdx])};}).filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(v.date)&&Number.isFinite(v.rate)&&v.rate>0);if(!values.length)throw new Error('Missing ECB rate');return values.sort((a,b)=>b.date.localeCompare(a.date))[0];}
export async function onRequestGet({request,env}){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=1800, s-maxage=21600','Access-Control-Allow-Origin':'https://vsetko24.sk'};
 try{
  const results=await Promise.all(CURRENCIES.map(async currency=>{
   const url=ENDPOINT+'D.'+currency+'.EUR.SP00.A?lastNObservations=1&format=csvdata';
   const response=await fetch(url,{headers:{Accept:'text/csv'},signal:AbortSignal.timeout(7000)});
   if(!response.ok)throw new Error('ECB HTTP '+response.status);
   const parsed=parseCsv(await response.text());return {currency,...parsed};
  }));
  return new Response(JSON.stringify({base:'EUR',source:'European Central Bank',sourceUrl:'https://data.ecb.europa.eu/',rates:results,checkedAt:new Date().toISOString(),disclaimer:'Referenčné kurzy ECB, nie obchodné kurzy bánk.'}),{headers});
 }catch(error){return new Response(JSON.stringify({error:'Kurzy momentálne nie sú dostupné. Skúste to neskôr.'}),{status:503,headers:{...headers,'Cache-Control':'no-store'}});}
}
