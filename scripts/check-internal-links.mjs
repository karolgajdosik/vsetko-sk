import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
function htmlFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?htmlFiles(join(dir,entry.name)):entry.name.endsWith('.html')?[join(dir,entry.name)]:[])}
const files=htmlFiles(root),broken=[];let checked=0;
for(const file of files){
 const html=readFileSync(file,'utf8');
 for(const match of html.matchAll(/\\bhref\\s*=\\s*[\"']([^\"']+)[\"']/gi)){
  const href=match[1];if(!href.startsWith('/')||href.startsWith('//')||href.startsWith('/api/'))continue;
  const path=decodeURIComponent(href.split(/[?#]/,1)[0]);if(!path)continue;
  const target=resolve(root,'.'+path);
  if(target!==root&&!target.startsWith(root+sep)){broken.push(file+': unsafe link '+href);continue;}
  const candidates=path.endsWith('/')?[join(target,'index.html')]:[target,join(target,'index.html'),target+'.html'];
  checked++;
  if(!candidates.some(existsSync))broken.push(file.replace(root+sep,'')+' -> '+href);
 }
}
assert.ok(files.length>15,'Expected complete generated site');
assert.ok(checked>50,'Expected substantial internal link coverage');
assert.deepEqual(broken,[],`Broken internal links (\\${broken.length}):\\n${broken.join('\\n')}`);
console.log('Internal link integrity passed:',checked,'links across',files.length,'HTML pages');
