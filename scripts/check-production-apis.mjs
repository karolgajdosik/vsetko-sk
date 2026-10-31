import {evaluateApiResponse} from './production-api-health-utils.mjs';
import {probeOfficialRpo} from './rpo-upstream-probe.mjs';
// Live production API smoke test. Runs separately from deterministic PR validation.
const base=process.env.SITE_URL||'https://vsetko24.sk';
const endpoints=[
  {path:'/api/ecb-rates',check:data=>Array.isArray(data.rates)&&data.rates.length===4&&data.rates.every(x=>Number(x.rate)>0)},
  {path:'/api/ukazovatele',check:data=>Array.isArray(data.indicators)&&data.indicators.length===3},
  {path:'/api/rpo?ico=31333532',check:data=>data.ico==='31333532'&&Array.isArray(data.results)&&data.results.some(x=>x.identifier==='31333532'&&typeof x.name==='string'&&x.name.trim().length>0)},
  {path:'/api/nabijacky?lat=48.1486&lon=17.1077&distance=30',check:data=>Array.isArray(data.stations)}
];
let failures=0;
for(const item of endpoints){
 const url=new URL(item.path,base);
 let passed=false;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{Accept:'application/json','User-Agent':'VSETKO24-production-health-check'}});
   let data;
   try{data=await response.json();}catch{throw Error('HTTP '+response.status+': invalid JSON response');}
   const result=evaluateApiResponse(url.pathname,response.status,data,item.check);
   if(!result.ok)throw Error(result.reason);
   console.log('PASS',url.pathname,'HTTP',response.status,'attempt',attempt);
   passed=true;
   break;
  }catch(error){
   console.error('Attempt',attempt,'failed for',url.pathname,error.message);
   if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2000));
  }
 }
 if(!passed){
  failures++;
  console.error('FAIL',url.pathname,'after two attempts');
  if(url.pathname==='/api/rpo'){
   // A second vantage point helps distinguish provider failures from Cloudflare-to-provider issues.
   // Never use this diagnostic result to mark the production endpoint healthy.
   const probe=await probeOfficialRpo();
   console.error('DIAGNOSTIC RPO official upstream from GitHub runner:',probe.status,probe.detail,'(not proof of Cloudflare reachability)');
  }
 }
}
if(failures){console.error(failures+' production API checks failed');process.exitCode=1;}
else console.log('All production API smoke checks passed');
