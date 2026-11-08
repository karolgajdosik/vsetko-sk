import {state,decide,json,wrongOrigin} from '@/lib/release/store';
import {states} from '@/lib/release/model.mjs';
export async function POST(req:Request){
 if(wrongOrigin(req)||!req.headers.get('content-type')?.includes('application/json'))return json({error:'Neplatný pôvod požiadavky.'},403);
 const {task,status,note}=await req.json();
 if(typeof task!=='string'||typeof note!=='string'||note.length>500||(status!=='auto'&&(!Object.hasOwn(states,status)||!note.trim())))return json({error:'Uveď stav a odôvodnenie (do 500 znakov).'},400);
 const data=await state();if(!data.repo?.tasks.some((x:any)=>x.id===task))return json({error:'Neznáma úloha.'},404);
 await decide(task,status,note.trim());return json({saved:true});
}
