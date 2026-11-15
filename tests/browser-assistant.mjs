import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Local CI uses synthetic API fixtures; production uses the real, no-paid-model
// guide-navigation endpoint. Never send personal data or click external links.
const origin=process.env.VSETKO_ORIGIN||'http://127.0.0.1:4321';
const live=process.env.ASSISTANT_LIVE==='1';
const cases=[
 {question:'Ako vybaviť hypotéku?',guide:'/navody/porovnanie-hypotek/',official:'https://nbs.sk/dohlad-nad-financnym-trhom/ofs/zivotne-situacie/chceme-byvat-sami/'},
 {question:'Čo potrebujem na prepis auta?',guide:'/navody/prepis-auta/',official:'https://www.slovensko.sk/sk/zivotne-situacie/zivotna-situacia/_elektronicke-sluzby-evidencie'},
 {question:'Čo treba na dedičské konanie?',guide:'/navody/dedicske-konanie/',official:'https://www.justice.gov.sk/agenda-ministerstva/civilne-pravo/civilny-mimosporovy-poriadok/'}
];
const browser=await chromium.launch({headless:true});
try{
 for(const width of live?[390]:[390,1280]){
  for(const item of cases){
   const page=await browser.newPage({viewport:{width,height:844}});
   try{
    if(!live){
     await page.route('**/api/assistant',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({
       mode:'guide-navigation',answer:'Overte si aktuálny postup v oficiálnom zdroji.',
       sources:[{title:'Praktický návod',url:item.guide}],
       officialSources:[
        {title:'Overený oficiálny zdroj',url:item.official},
        {title:'Podvrhnutý zdroj',url:'https://nbs.sk.evil.example/phishing'},
        {title:'Neplatná schéma',url:'javascript:alert(1)'}
       ]
      })
     }));
    }
    let response;
    for(let attempt=1;attempt<=3;attempt++){
     try{
      response=await page.goto(new URL('/ai/',origin).href,{waitUntil:'load',timeout:20000});
      if(response?.status()===200)break;
     }catch(error){if(attempt===3)throw error;}
     if(attempt<3)await new Promise(resolve=>setTimeout(resolve,3000));
    }
    assert.equal(response?.status(),200,'AI chat page must return HTTP 200');
    const localOnly = page.locator('#ai-local-only');
    assert.equal(await localOnly.isChecked(), true, 'Local search must be the default');
    let assistantRequests = 0;
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/assistant') assistantRequests++;
    });
    await page.locator('#ai-question').fill(item.question);
    await page.locator('#ai-submit').click();
    await page.locator('#ai-conversation .ai-bot').last()
      .filter({ hasText: 'Otázka nebola odoslaná na server.' }).waitFor({ state: 'visible' });
    assert.equal(assistantRequests, 0, 'Local search must not contact the assistant endpoint');

    await localOnly.uncheck();
    await page.locator('#ai-question').fill(item.question);
    const [apiResponse]=await Promise.all([
     page.waitForResponse(r=>r.url().includes('/api/assistant')&&r.request().method()==='POST',{timeout:25000}),
     page.locator('#ai-submit').click()
    ]);
    assert.equal(apiResponse.status(),200,'Assistant API must return HTTP 200');
    if(live){
     const data=await apiResponse.json();
     assert.equal(data.mode,'guide-navigation','High-impact question must use bounded navigation');
     assert.ok(data.sources?.some(x=>x.url===item.guide),'Expected internal guide missing');
     assert.ok(data.officialSources?.some(x=>x.url===item.official),'Expected official API source missing');
    }
    const answer=page.locator('#ai-conversation .ai-bot').last();
    const official=answer.locator('.ai-sources a[href^="https://"]');
    await official.first().waitFor({state:'visible',timeout:10000});
    assert.equal(await official.count(),1,'Only one trusted external link should be rendered');
    assert.equal(await official.first().getAttribute('href'),item.official,'Wrong official link rendered');
    assert.equal(await official.first().getAttribute('target'),'_blank','External source must open in new tab');
    const rel=(await official.first().getAttribute('rel')||'').split(/\s+/);
    assert.ok(rel.includes('noopener')&&rel.includes('noreferrer'),'External link must be protected');
    assert.ok(await answer.locator('a[href="'+item.guide+'"]').isVisible(),'Related guide must be visible');
    assert.equal(await answer.getByText('Podvrhnutý zdroj').count(),0,'Spoofed link must be rejected');
    const metrics=await official.first().evaluate(el=>({
     display:getComputedStyle(el).display,
     right:el.getBoundingClientRect().right,
     scroll:document.documentElement.scrollWidth,
     viewport:innerWidth
    }));
    assert.equal(metrics.display,'block','Dynamically rendered link must receive global CSS');
    assert.ok(metrics.right<=width+1&&metrics.scroll<=metrics.viewport+1,'AI source link must not overflow viewport');
    console.log('PASS AI browser',live?'production':'mock',width+'px',item.guide);
   }finally{await page.close();}
  }
 }
}finally{await browser.close();}
