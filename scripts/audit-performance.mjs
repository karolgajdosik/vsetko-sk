import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import {chromium} from 'playwright';
import {mkdir, writeFile, appendFile} from 'node:fs/promises';
await mkdir('quality-reports', {recursive:true});
const chrome = await chromeLauncher.launch({chromePath:chromium.executablePath(),chromeFlags:['--headless','--no-sandbox']});
const report = {checkedAt:new Date().toISOString(),measurement:'Single mobile Lighthouse lab run against production; not field Core Web Vitals or an INP measurement',results:[]};
try {
  for (const [name,route] of [['home','/'],['assistant','/ai/'],['housing','/kalkulacky/naklady-na-byvanie/']]) {
    try {
      const run = await lighthouse('https://vsetko24.sk'+route,{port:chrome.port,output:'html',onlyCategories:['performance'],logLevel:'error'});
      await writeFile('quality-reports/performance-'+name+'.html',run.report);
      const lhr=run.lhr;
      report.results.push({route,finalUrl:lhr.finalDisplayedUrl,score:lhr.categories.performance.score,LCP:lhr.audits['largest-contentful-paint'].numericValue,CLS:lhr.audits['cumulative-layout-shift'].numericValue,TBT:lhr.audits['total-blocking-time'].numericValue,runtimeError:lhr.runtimeError??null,opportunities:Object.values(lhr.audits).filter(a=>a.details?.type==='opportunity'&&a.details.overallSavingsMs>0).map(a=>({id:a.id,title:a.title,savingsMs:a.details.overallSavingsMs}))});
    } catch(error) {report.results.push({route,error:error.message});}
  }
} finally { await chrome.kill(); }
await writeFile('quality-reports/performance.json',JSON.stringify(report,null,2));
const summary='## Production performance lab report\n\n'+report.measurement+'\n\n'+report.results.map(x=>JSON.stringify(x)).join('\n')+'\n';
console.log(summary);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
if(report.results.some(x=>x.error||x.runtimeError))process.exitCode=1;
