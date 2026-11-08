import {syncPlan} from './plan.mjs';
import routes from './contract.json' with {type:'json'};

export function normalize(input) {
  const {startedAt,sources} = input;
  const time=Date.parse(startedAt);
  if (!Number.isFinite(time)||time>Date.now()+60000||time<Date.now()-2*3600000) throw Error('Neplatný čas zberu');
  const data={};
  for (const {key} of [...syncPlan.phase1,...syncPlan.phase2]) {
    const value=sources?.[key];
    if (!value || value.error) throw Error('Chýbajú údaje '+key);
    data[key]=typeof value.content==='string' && key!=='contract' ? JSON.parse(value.content) : value;
  }
  const {pr}=data;
  if(pr.number!==182 || !/^[0-9a-f]{40}$/.test(pr.head_sha) || !data.commits.length || data.tree.sha!==data.commits[0].sha || data.tree.truncated || !Array.isArray(data.open) || data.open.length>=100 || data.pulls.length>=100) throw Error('Neúplná alebo nekonzistentná snímka GitHubu');
  const issues=data.open.filter(x=>!x.pull_request).map(x=>({id:x.number,title:x.title}));
  const pulls=data.pulls.map(x=>({id:x.number,title:x.title}));
  const merged=data.merged.issues.map(x=>({id:x.issue_number,title:x.title}));
  const commits=data.commits.map(x=>({sha:x.sha,title:x.commit.message.split('\n')[0],time:x.commit.committer.date}));
  const runs=data.runs.workflow_runs.map(x=>({id:x.id,name:x.name,status:x.conclusion || x.status,sha:x.head_sha,time:x.updated_at,number:x.run_number}));
  const stages=[166,167,168,169,170,171].map(id=>data['i'+id].issue);
  const tasks=stages.flatMap(s=>Array.from(s.body.matchAll(/^- \[([ xX])\]\s+(V24-\d{3})\s+(P\d)\s+(.+)$/gm),m=>({id:m[2],title:m[4].trim(),priority:m[3],parent:s.issue_number,closed:s.state==='closed'&&s.state_reason!=='not_planned',checked:m[1]!==' '})));
  const paths=data.tree.tree.filter(x=>x.type==='blob').map(x=>x.path);
  const main=commits[0].sha;
  const cloud=data.cloud.check_runs.find(c=>c.head_sha===main&&c.app?.slug==='cloudflare-workers-and-pages'&&c.name==='Cloudflare Pages');
  const validation=data.ci.workflow_runs.filter(r=>r.name==='Validate VSETKO24').sort((a,b)=>b.id-a.id)[0];
  const byReviewer=new Map();
  for(const r of data.reviews.reviews) {
    const login=r.user?.login;
    if(login && login!==pr.user.login && ['APPROVED','CHANGES_REQUESTED','DISMISSED'].includes(r.state)) byReviewer.set(login,r);
  }
  const activeReviews=Array.from(byReviewer.values());
  const approved=activeReviews.some(x=>x.state==='APPROVED'&&x.commit_id===pr.head_sha)&&!activeReviews.some(x=>x.state==='CHANGES_REQUESTED');
  const contractOk=data.contract.sha==='949ad226aeba8e063ee03252ce150667f9882bd1';
  if (!tasks.length || !Array.isArray(data.runs.workflow_runs)) throw Error('Chýba backlog alebo workflow');
  return {fetched:new Date(time).toISOString(),main,issues,pulls,merged,commits,runs,tasks,paths,issue181:data.i181.issue.state,
    pr:{state:pr.state,merged:pr.merged,head:pr.head_sha,approved,contractOk,ci:validation?{id:validation.id,status:validation.conclusion||validation.status}:null},
    cloud:cloud?{sha:cloud.head_sha,id:cloud.id,status:cloud.conclusion || cloud.status}:null};
}
