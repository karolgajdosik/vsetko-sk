import { env } from 'cloudflare:workers';
const db=()=>{if(!env.DB)throw Error('Chýba databáza kontrol');return env.DB};
export async function state(){
 const d=db();
 const [repository,records,decisionList]=await d.batch([
   d.prepare('SELECT data FROM repository WHERE key=?').bind('github'),
   d.prepare('SELECT data FROM reports ORDER BY checked DESC,id DESC LIMIT 100'),
   d.prepare('SELECT * FROM decisions ORDER BY task')
 ]);
 return {repo:repository.results[0]?JSON.parse(String(repository.results[0].data)):null,reports:records.results.map(r=>JSON.parse(String(r.data))),decisions:decisionList.results};
}
export async function saveRepo(repo:any){
 await db().prepare('INSERT INTO repository(key,fetched,data) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET fetched=excluded.fetched,data=excluded.data WHERE excluded.fetched >= repository.fetched').bind('github',repo.fetched,JSON.stringify(repo)).run();
}
export async function saveReport(report:any){
 await db().prepare('INSERT INTO reports(id,checked,data) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING').bind(report.id,report.checked,JSON.stringify(report)).run();
}
export async function decide(task:string,status:string,note:string){
 if(status==='auto'){await db().prepare('DELETE FROM decisions WHERE task=?').bind(task).run();return;}
 await db().prepare('INSERT INTO decisions(task,state,note,changed) VALUES(?,?,?,?) ON CONFLICT(task) DO UPDATE SET state=excluded.state,note=excluded.note,changed=excluded.changed').bind(task,status,note,new Date().toISOString()).run();
}
export const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export function wrongOrigin(req:Request){const origin=req.headers.get('origin');return !!origin&&origin!==new URL(req.url).origin}
