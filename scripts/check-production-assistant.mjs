import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {trustedOfficialUrl} from '../src/lib/official-sources.mjs';

// No paid model call: these three questions must use the bounded guide-navigation path.
const scenarios=[
 {question:'Ako vybaviť hypotéku?',expected:'/navody/porovnanie-hypotek/',official:'https://nbs.sk/dohlad-nad-financnym-trhom/ofs/zivotne-situacie/chceme-byvat-sami/'},
 {question:'Čo potrebujem na prepis auta?',expected:'/navody/prepis-auta/',official:'https://www.slovensko.sk/sk/zivotne-situacie/zivotna-situacia/_elektronicke-sluzby-evidencie'},
 {question:'Čo treba na dedičské konanie?',expected:'/navody/dedicske-konanie/',official:'https://www.justice.gov.sk/agenda-ministerstva/civilne-pravo/civilny-mimosporovy-poriadok/'}
];
const sleep=ms=>new Promise(done=>setTimeout(done,ms));

export async function checkProductionAssistant({fetchImpl=fetch,siteUrl=process.env.SITE_URL||'https://vsetko24.sk',attempts=3,delayMs=5000}={}){
 const origin=new URL(siteUrl).origin;
 const url=new URL('/api/assistant',origin);
 const failures=[];
 for(const {question,expected,official} of scenarios){
  let passed=false;
  for(let attempt=1;attempt<=attempts;attempt++){
   try{
    const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json','accept':'application/json','origin':origin,'user-agent':'VSETKO24-production-health-check'},body:JSON.stringify({question}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('HTTP '+response.status);
    if(!response.headers.get('content-type')?.includes('application/json'))throw Error('unexpected content type');
    const data=await response.json();
    if(data?.mode!=='guide-navigation'||!Array.isArray(data.sources)||!data.sources.some(source=>source?.url===expected))throw Error('unexpected guide navigation response');
    if(!Array.isArray(data.officialSources)||!data.officialSources.some(source=>source?.url===official&&trustedOfficialUrl(source.url)===official)||!data.officialSources.every(source=>trustedOfficialUrl(source?.url)&&typeof source?.title==='string'&&source.title.trim()))throw Error('missing or untrusted official source');
    console.log('PASS /api/assistant',expected,'attempt',attempt);
    passed=true;
    break;
   }catch(error){
    console.error('Attempt',attempt,'failed for',expected,error.message);
    if(attempt<attempts)await sleep(delayMs);
   }
  }
  if(!passed)failures.push(expected);
 }
 return failures;
}

// Regression probe for #120: use only guide navigation, never a paid AI request.
// The request headers deliberately omit Content-Length; HTTP clients may add it on the wire.
export function assistantLimitBodies(){
 const question='Ako vybaviť hypotéku?';
 const encoder=new TextEncoder();
 const empty=JSON.stringify({question,padding:''});
 const remaining=4096-encoder.encode(empty).byteLength;
 const within=JSON.stringify({question,padding:'ž'.repeat(Math.floor(remaining/2))});
 const over=JSON.stringify({question,padding:'ž'.repeat(Math.floor(remaining/2)+1)});
 return [
  {name:'within-limit',body:within,expectedStatus:200},
  {name:'over-limit',body:over,expectedStatus:413}
 ];
}

export async function checkProductionAssistantBodyLimit({fetchImpl=fetch,siteUrl=process.env.SITE_URL||'https://vsetko24.sk',attempts=2,delayMs=2000}={}){
 const origin=new URL(siteUrl).origin;
 const url=new URL('/api/assistant',origin);
 const failures=[];
 for(const {name,body,expectedStatus} of assistantLimitBodies()){
  let passed=false;
  for(let attempt=1;attempt<=attempts;attempt++){
   try{
    const response=await fetchImpl(url,{
     method:'POST',
     headers:{'content-type':'application/json','accept':'application/json','origin':origin,'user-agent':'VSETKO24-production-health-check'},
     body,
     signal:AbortSignal.timeout(15000)
    });
    if(response.status!==expectedStatus)throw Error('expected HTTP '+expectedStatus+', got '+response.status);
    if(!response.headers.get('content-type')?.includes('application/json'))throw Error('unexpected content type');
    const data=await response.json();
    if(expectedStatus===413){
     if(typeof data?.error!=='string'||!data.error.includes('príliš dlhá'))throw Error('missing size-limit error');
    }else if(data?.mode!=='guide-navigation'||!Array.isArray(data.sources)||!data.sources.some(source=>source?.url==='/navody/porovnanie-hypotek/')){
     throw Error('unexpected under-limit guide navigation response');
    }
    console.log('PASS /api/assistant body limit',name,'HTTP',response.status,'attempt',attempt);
    passed=true;
    break;
   }catch(error){
    console.error('Attempt',attempt,'failed for assistant body limit',name,error.message);
    if(attempt<attempts)await sleep(delayMs);
   }
  }
  if(!passed)failures.push(name);
 }
 return failures;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const failures=await checkProductionAssistant();
 const limitFailures=await checkProductionAssistantBodyLimit();
 if(failures.length||limitFailures.length){
  if(failures.length)console.error('FAIL assistant guide navigation:',failures.join(', '));
  if(limitFailures.length)console.error('FAIL assistant body limit:',limitFailures.join(', '));
  process.exitCode=1;
 }else console.log('All production assistant guide navigation and body limit checks passed');
}
