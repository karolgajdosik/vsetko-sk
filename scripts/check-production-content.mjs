import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const guides=await read('src/data/guides.json'),details=await read('src/data/guide-details.json'),operations=await read('src/data/site-operations.json');
const origin='https://vsetko24.sk';
const checks=guides.map(g=>({route:'/navody/'+g.slug+'/',title:g.title,markers:['id="podrobne"','id="pozor"',...(details[g.slug]?.detailed.map(s=>s.body)??[])]}));
// Cloudflare may obfuscate email literals in delivered HTML. The production browser step verifies the exact rendered alias.
for(const [route,title] of [['/kontakt/','Kontakt a spätná väzba'],['/ochrana-sukromia/','Ochrana súkromia'],['/pristupnost/','Prístupnosť a európske pravidlá']])checks.push({route,title,markers:[operations.operator,...(operations.privacyEmailActive?[]:['čaká na aktiváciu'])]});
async function check(item){
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(origin+item.route,{signal:AbortSignal.timeout(20000),headers:{accept:'text/html'}});
   if(response.status!==200)throw Error('HTTP '+response.status);
   if(!response.headers.get('content-type')?.includes('text/html'))throw Error('Not HTML');
   const html=await response.text(),headings=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
   if(headings.length!==1||headings[0][1].replace(/<[^>]*>/g,'').trim()!==item.title)throw Error('Unexpected H1');
   if(item.markers.some(marker=>!html.includes(marker)))throw Error('Missing current content marker');
   if(item.route.startsWith('/navody/')&&details[item.route.split('/')[2]]&&html.includes('Zistite, či sa téma'))throw Error('Generic checklist placeholder');
   return {route:item.route,status:200,attempt,currentContent:true};
  }catch(error){if(attempt===3)return {route:item.route,attempt,error:error.message};await delay(5000);}
 }
}
const results=[];let next=0;
await Promise.all(Array.from({length:5},async()=>{while(next<checks.length){const result=await check(checks[next++]);results.push(result);console.log(JSON.stringify(result));}}));
const report={checkedAt:new Date().toISOString(),expectedSourceCommit:process.env.GITHUB_SHA??null,scope:'Current guide and contact HTML; source commit is not proof of deployment SHA',checked:results.length,failed:results.filter(x=>x.error).length,results};
await mkdir('quality-reports',{recursive:true});await writeFile('quality-reports/production-content.json',JSON.stringify(report,null,2));
console.log(`Production content: ${report.checked-report.failed}/${report.checked} passed`);
if(report.failed)process.exitCode=1;
