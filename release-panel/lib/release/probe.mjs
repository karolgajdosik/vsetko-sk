import routes from './contract.json' with {type:'json'};
const origin='https://vsetko24.sk';
const fullSha=value=>/^[a-f0-9]{40}$/i.test(value||'')?value.toLowerCase():null;
const timeout=()=>AbortSignal.timeout(9000);
async function marker(){
  try {
    const r=await fetch(origin+'/version.json',{redirect:'manual',signal:timeout(),headers:{accept:'application/json','cache-control':'no-cache'}});
    if (r.status!==200||!r.headers.get('content-type')?.includes('application/json')) return null;
    const j=await r.json();return fullSha(j.sha||j.commitSha||j.commit);
  } catch {return null}
}
function why(e){
  const msg=String(e?.cause?.code||'')+' '+String(e?.message||e);
  if (/ENOTFOUND|EAI_AGAIN|DNS|name resolution/i.test(msg))return 'dns';
  if (/timed?\s*out|timeout|aborted/i.test(msg)||e.name==='TimeoutError')return 'timeout';
  return 'network';
}
async function one(definition){
  const row={path:definition.path,time:new Date().toISOString(),status:null,html:null,h1:null,headingOk:null,sha:null,reason:'network',final:origin+definition.path};
  try{
    let url=new URL(row.final);
    const signal=timeout();
    for(let i=0;i<4;i++){
      const res=await fetch(url.href,{redirect:'manual',signal,headers:{accept:'text/html','cache-control':'no-cache'}});
      row.status=res.status;row.final=url.href;
      if([301,302,303,307,308].includes(res.status)){
        const next=new URL(res.headers.get('location') || url.href,url);
        if(next.origin!==origin){row.reason='origin';return row}
        url=next;continue;
      }
      let html=false, headings=[];
      const rewriter=new HTMLRewriter().on('html',{element(){html=true}}).on('h1',{element(){headings.push('')},text(t){if(headings.length)headings[headings.length-1]+=t.text}});
      await rewriter.transform(res.clone()).arrayBuffer();
      row.html=(res.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()==='text/html'&&html;
      row.h1=headings.map(h=>h.replace(/\s+/g,' ').trim()).join(' | ');
      row.headingOk=definition.h1===null?null:headings.length===1&&row.h1===definition.h1;
      row.sha=fullSha(res.headers.get('x-deployed-sha')||res.headers.get('x-commit-sha'));
      row.reason=res.status!==200?'http':!row.html?'html':row.headingOk===false?'h1':'ok';
      return row;
    }
    row.reason='redirect';return row;
  }catch(e){row.reason=why(e);return row}
}
export function identifySha(rows,before,after){
  const present=rows.map(r=>r.sha).filter(Boolean);
  if(before&&before===after&&present.every(s=>s===before))return {sha:before,method:'/version.json pred a po kontrole'};
  if(!before&&!after&&present.length===rows.length&&new Set(present).size===1)return {sha:present[0],method:'Produkčné HTTP hlavičky na všetkých trasách'};
  return {sha:null,method:before||after||present.length?'Nekonzistentné alebo neúplné produkčné SHA':'Produkcia neposkytla plné SHA'};
}
async function lookupDns(){
  const when=new Date().toISOString();
  try{
    const r=await fetch('https://cloudflare-dns.com/dns-query?name=vsetko24.sk&type=A',{headers:{accept:'application/dns-json'},signal:timeout()});
    if(!r.ok)return {time:when,status:null,addresses:[],source:'Cloudflare DNS'};
    const a=await r.json();
    return {time:when,status:a.Status,addresses:(a.Answer||[]).filter(x=>x.type===1).map(x=>x.data),source:'Cloudflare DNS'};
  }catch{return {time:when,status:null,addresses:[],source:'Cloudflare DNS'}}
}
export async function runProbe(){
  const [before,dns]=await Promise.all([marker(),lookupDns()]), rows=[];
  for(let i=0;i<routes.length;i+=5) rows.push(...await Promise.all(routes.slice(i,i+5).map(one)));
  const after=await marker();return {rows,dns,...identifySha(rows,before,after),checked:new Date().toISOString()};
}
