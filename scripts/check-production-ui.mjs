const origin=process.env.VSETKO_ORIGIN||'https://vsetko24.sk';
const routes=[
 {path:'/kontakt/',markers:['Nahlásiť chybu na GitHube','issues/new?template=chyba-portalu.yml']},
 {path:'/kalkulacky/splatka-uveru/',markers:['id="validation-message"','aria-invalid']},
 {path:'/kalkulacky/naklady-na-auto/',markers:['id="car-validation"','id="annual"']},
 {path:'/',markers:['VŠETKO24']}
];
const failures=[];
for(const {path,markers} of routes){
 let last='';let ok=false;
 for(let attempt=1;attempt<=6;attempt++){
  try{
   const response=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(15000),headers:{'user-agent':'VSETKO24-production-smoke/1.0'}});
   const html=await response.text();
   const missing=markers.filter(marker=>!html.includes(marker));
   if(response.ok&&missing.length===0){console.log('PASS',path,'HTTP',response.status,'attempt',attempt);ok=true;break;}
   last='HTTP '+response.status+' missing: '+missing.join(', ');
  }catch(error){last=String(error)}
  if(attempt<6)await new Promise(resolve=>setTimeout(resolve,20000));
 }
 if(!ok)failures.push(path+': '+last);
}
if(failures.length){console.error('Production UI smoke failed:\n'+failures.join('\n'));process.exitCode=1;}
else console.log('All production UI smoke checks passed');
