import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const checker=fileURLToPath(new URL('../scripts/check-internal-links.mjs',import.meta.url));
function runCheck(link){
 const dir=mkdtempSync(join(tmpdir(),'v24-link-audit-'));
 try{
  const dist=join(dir,'dist');
  mkdirSync(dist);
  writeFileSync(join(dist,'index.html'),'<h1 id="section">OK</h1><h2 id="café">Encoded target</h2><a href="'+link+'">Jump</a>');
  // Meet the production checker's minimum site/link coverage using valid routes.
  for(let i=0;i<16;i++){
   const page=join(dist,'fixture-'+i);
   mkdirSync(page);
   writeFileSync(join(page,'index.html'),'<a href="/#section">One</a>'.repeat(4));
  }
  return spawnSync(process.execPath,[checker],{cwd:dir,encoding:'utf8'});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('link audit accepts existing cross-page and encoded fragments',()=>{
 for(const link of ['/#section','/#caf%C3%A9','#section']){
  const result=runCheck(link);
  assert.equal(result.status,0,result.stderr);
 }
});
test('link audit rejects missing fragment targets',()=>{
 for(const link of ['/#missing','#missing']){
  const result=runCheck(link);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/missing anchor/);
 }
});
test('link audit reports malformed fragment encodings',()=>{
 const result=runCheck('/#%E0%A4%A');
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/malformed link/);
});
