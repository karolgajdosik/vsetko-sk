import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
function htmlFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?htmlFiles(join(dir,entry.name)):entry.name.endsWith('.html')?[join(dir,entry.name)]:[])}
const files=htmlFiles(root),broken=[];let checked=0,anchorsChecked=0;
const anchors=new Map();
function anchorTargets(file){
 if(!anchors.has(file)){
  const html=readFileSync(file,'utf8');
  anchors.set(file,new Set([...html.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)].map(match=>match[1])));
 }
 return anchors.get(file);
}
for(const file of files){
 const html=readFileSync(file,'utf8');
 for(const match of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)){
  const href=match[1],samePage=href.startsWith('#');
  if(!samePage&&(!href.startsWith('/')||href.startsWith('//')||href.startsWith('/api/')))continue;
  let path,fragment;
  try{
   const hash=href.indexOf('#');
   fragment=hash<0?'':decodeURIComponent(href.slice(hash+1));
   path=samePage?'':decodeURIComponent(href.slice(0,hash<0?undefined:hash).split('?',1)[0]);
  }catch{
   broken.push(file.replace(root+sep,'')+' -> malformed link '+href);
   continue;
  }
  const target=samePage?file:resolve(root,'.'+path);
  if(target!==root&&!target.startsWith(root+sep)){broken.push(file+': unsafe link '+href);continue;}
  const candidates=samePage?[file]:path.endsWith('/')?[join(target,'index.html')]:[target,join(target,'index.html'),target+'.html'];
  checked++;
  const existing=candidates.find(existsSync);
  if(!existing){broken.push(file.replace(root+sep,'')+' -> '+href);continue;}
  // Text fragments are handled by the browser and do not require a matching HTML id.
  if(fragment&&!fragment.startsWith(':~:text=')&&existing.endsWith('.html')){
   anchorsChecked++;
   if(!anchorTargets(existing).has(fragment))broken.push(file.replace(root+sep,'')+' -> missing anchor '+href);
  }
 }
}
assert.ok(files.length>15,'Expected complete generated site');
assert.ok(checked>50,'Expected substantial internal link coverage');
assert.deepEqual(broken,[],'Broken internal links ('+broken.length+'):\n'+broken.join('\n'));
console.log('Internal link integrity passed:',checked,'links and',anchorsChecked,'fragments across',files.length,'HTML pages');
