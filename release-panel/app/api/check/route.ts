import {state,saveReport,json,wrongOrigin} from '@/lib/release/store';
import {runProbe} from '@/lib/release/probe.mjs';
import {verdict} from '@/lib/release/model.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(wrongOrigin(req)||!req.headers.get('content-type')?.includes('application/json'))return json({error:'Neplatný pôvod požiadavky.'},403);
 const {id}=await req.json();
 if(typeof id!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(id))return json({error:'Neplatné ID kontroly.'},400);
 const {repo,reports,decisions}=await state();
 const prior=reports.find((r:any)=>r.id===id);if(prior)return json(prior);
 const probe=await runProbe(),v=verdict(repo,probe,decisions);
 const report={...probe,id,source:'Sites · Cloudflare Worker',repositoryAt:repo?.fetched||null,candidate:repo?.main||null,...v};
 await saveReport(report);return json(report);
}
