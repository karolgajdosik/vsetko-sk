import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {v7Entries} from './fixtures/v7-cases.mjs';
const origin=process.env.VSETKO_ORIGIN??'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async path=>{assert.equal((await page.goto(origin+path)).status(),200);};
 await open('/domacnost/');
 await page.evaluate(data=>{for(const [k,v] of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));},v7Entries);
 await page.reload();
 const before=await page.evaluate(()=>localStorage.getItem('v24-v7-contract-end-v1'));
 await page.locator('#setup-password').fill('Bezpecna-domacnost-123');await page.locator('#setup-repeat').fill('Bezpecna-domacnost-123');
 const setupDownload=page.waitForEvent('download');await page.locator('#setup-form button').click();await setupDownload;
 await page.waitForFunction(()=>!document.getElementById('household-workspace').disabled);
 assert.equal(await page.evaluate(()=>localStorage.getItem('v24-v7-contract-end-v1')),before);
 await page.locator('#entity-title').fill('Rodinný byt');await page.locator('#entity-form button').click();
 assert.match(await page.locator('#entity-list').innerText(),/Rodinný byt/);
 for(const kind of ['insurance','complaint','moving','car']){
  await page.locator('#journey-kind').selectOption(kind);await page.locator('#journey-title').fill('Test '+kind);await page.locator('#journey-form button').click();
 }
 const moving=page.locator('#journey-list article').filter({hasText:'Test moving'});
 await moving.getByRole('button',{name:'Uzavrieť Test moving',exact:true}).click();assert.match(await page.locator('#household-status').innerText(),/dokončite kroky/);
 await page.locator('#document-title').fill('Protokol');
 const target=await page.locator('#document-target option').filter({hasText:'Situácia: Test moving'}).getAttribute('value');await page.locator('#document-target').selectOption(target);
 await page.locator('#document-tag').fill('Odovzdávací protokol');
 await page.locator('#document-file').setInputFiles({name:'protokol.txt',mimeType:'text/plain',buffer:Buffer.from('Odovzdanie bytu')});await page.locator('#document-form button').click();
 await page.waitForFunction(()=>document.getElementById('document-list').textContent.includes('protokol.txt'));
 for(const check of await moving.locator('input[type=checkbox]').all())await check.check();
 await moving.getByRole('button',{name:'Uzavrieť Test moving',exact:true}).click();assert.match(await moving.innerText(),/Uzavreté/);
 await page.locator('#household-search').fill('Protokol');assert.match(await page.locator('#household-results').innerText(),/Dokument: Protokol/);
 await page.locator('#payment-title').fill('Sťahovanie');await page.locator('#payment-amount').fill('200');await page.locator('#payment-date').fill('2027-02-01');await page.locator('#payment-form button').click();
 await page.locator('#finance-year').fill('2027');await page.locator('#scenario-run').click();assert.match(await page.locator('#finance-summary').innerText(),/200/);
 for(const width of [360,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 const saved=await page.evaluate(()=>localStorage.getItem('v24-household-v9'));
 await open('/zaloha/');await page.locator('#backup-export-password').fill('Bezpecna-domacnost-123');await page.locator('#backup-export-repeat').fill('Bezpecna-domacnost-123');
 const downloading=page.waitForEvent('download');await page.locator('#backup-export').click();const file=await (await downloading).path();
 await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#backup-file').setInputFiles(file);await page.locator('#backup-import-password').fill('Bezpecna-domacnost-123');await page.locator('#backup-preview').click();await page.locator('#backup-confirm-panel').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('v24-household-v9')),null);
 await page.locator('#backup-mode').selectOption('local');await page.locator('#backup-confirm').check();await page.locator('#backup-restore').click();
 assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('v24-household-v9'))),JSON.parse(saved));
 await open('/domacnost/');assert.match(await page.locator('#document-list').innerText(),/protokol.txt/);
 assert.deepEqual(errors,[]);
 console.log('V9: activation, four journeys, document, completion, finances, mobile layout and encrypted merge/restore passed.');
} finally {await browser.close();}
