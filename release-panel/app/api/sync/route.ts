import {syncPlan} from '@/lib/release/plan.mjs';
import {normalize} from '@/lib/release/normalize.mjs';
import {saveRepo,json} from '@/lib/release/store';
export const dynamic='force-dynamic';
export function GET(){return json(syncPlan)}
export async function POST(req:Request){
 if(req.headers.get('origin')||req.headers.get('x-release-sync')!=='1'||!req.headers.get('content-type')?.includes('application/json'))return json({error:'Neplatný zdroj synchronizácie.'},403);
 try{
  const raw=await req.text();if(raw.length>3500000)return json({error:'Príliš veľká snímka.'},413);
  const repo=normalize(JSON.parse(raw));await saveRepo(repo);
  return json({fetched:repo.fetched,main:repo.main,issues:repo.issues.length,tasks:repo.tasks.length});
 }catch(e){return json({error:e instanceof Error?e.message:'Neplatné údaje.'},422)}
}
