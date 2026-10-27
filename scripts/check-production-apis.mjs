// Live production API smoke test. Runs separately from deterministic PR validation.
const base=process.env.SITE_URL||'https://vsetko24.sk';
const endpoints=[
  {path:'/api/ecb-rates',check:data=>Array.isArray(data.rates)&&data.rates.length===4&&data.rates.every(x=>Number(x.rate)>0)},
  {path:'/api/ukazovatele',check:data=>Array.isArray(data.indicators)&&data.indicators.length===3},
  {path:'/api/rpo?ico=31333532',check:data=>Array.isArray(data.results)},
  {path:'/api/nabijacky?lat=48.1486&lon=17.1077&distance=30',check:data=>Array.isArray(data.stations)}
];
let failures=0;
for(const item of endpoints){
 const url=new URL(item.path,base);
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json','User-Agent':'VSETKO24-production-health-check'}});
  const data=await response.json();
  if(!response.ok||!item.check(data))throw Error('HTTP '+response.status+' or unexpected response schema');
  console.log('PASS',url.pathname,'HTTP',response.status);
 }catch(error){failures++;console.error('FAIL',url.pathname,error.message);}
}
if(failures){console.error(failures+' production API checks failed');process.exitCode=1;}
else console.log('All production API smoke checks passed');
