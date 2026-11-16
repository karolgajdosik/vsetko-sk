import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { BACKUP_KEYS, collectBackup, encryptBackup, decryptBackup } from '../src/lib/workspace-backup.mjs';
import { createCase, WORKSPACE_KEY } from '../src/lib/workspace-store.mjs';

export async function checkWorkspaceBackup(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const password = 'Rodinná bezpečná záloha 123!';
  const currentCase = createCase('car', 'Moje nové auto', '2026-11-16T10:00:00.000Z', 'car-backup-test');
  currentCase.values = { purchasePrice: 25000, annualKm: 12000 };
  const initial = {version:1,activeCaseId:currentCase.id,cases:[currentCase]};
  try {
    const response = await page.goto(new URL('/zaloha/',origin).href);
    assert.equal(response?.status(),200);
    await page.evaluate(({key,state}) => { localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('v24-theme','dark'); }, {key:WORKSPACE_KEY,state:initial});
    await page.reload();
    assert.match(await page.locator('#backup-local-summary').innerText(), /1 situácií/);
    await page.locator('#backup-export-password').fill(password);
    await page.locator('#backup-export-repeat').fill(password);
    const downloadReady = page.waitForEvent('download');
    await page.locator('#backup-export').click();
    const download = await downloadReady;
    assert.match(download.suggestedFilename(),/\.v24backup$/);
    const text = await readFile(await download.path(),'utf8');
    assert.deepEqual((await decryptBackup(text,password,webcrypto)).entries[WORKSPACE_KEY],initial);
    assert.equal(await page.locator('#backup-export-password').inputValue(),'');

    const nextCase=createCase('home','Rodinné bývanie','2026-11-16T11:00:00.000Z','home-backup-test');
    const values = new Map([[WORKSPACE_KEY,JSON.stringify({version:1,activeCaseId:nextCase.id,cases:[nextCase]})]]);
    const payload=collectBackup({getItem:key=>values.get(key)??null});
    const encrypted=await encryptBackup(payload,password,webcrypto);
    const file={name:'test.v24backup',mimeType:'application/json',buffer:Buffer.from(encrypted)};
    await page.locator('#backup-file').setInputFiles(file);
    await page.locator('#backup-import-password').fill('Nesprávne heslo 123!');
    await page.locator('#backup-preview').click();
    await page.waitForFunction(() => !document.querySelector('#backup-preview').disabled);
    assert.match(await page.locator('#backup-status').innerText(),/Nesprávne heslo/);
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),WORKSPACE_KEY),initial);

    await page.locator('#backup-import-password').fill(password);
    await page.locator('#backup-preview').click();
    await page.locator('#backup-confirm-panel').waitFor({state:'visible'});
    assert.equal(await page.locator('#backup-restore').isDisabled(),true);
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),WORKSPACE_KEY),initial);
    await page.locator('#backup-cancel').click();
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),WORKSPACE_KEY),initial);

    await page.locator('#backup-file').setInputFiles(file);
    await page.locator('#backup-import-password').fill(password);
    await page.locator('#backup-preview').click();
    await page.locator('#backup-confirm-panel').waitFor({state:'visible'});
    await page.locator('#backup-confirm').check();
    await page.locator('#backup-restore').click();
    assert.match(await page.locator('#backup-status').innerText(),/Záloha bola obnovená/);
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).cases[0].title,WORKSPACE_KEY),'Rodinné bývanie');
    assert.equal(await page.evaluate(()=>localStorage.getItem('v24-theme')),'dark');
    assert.equal(await page.evaluate(keys=>keys.filter(key=>localStorage.getItem(key)!==null).length,BACKUP_KEYS),1);
    console.log('PASS V5 mobile encrypted backup download/decrypt, wrong password, pure preview/cancel, confirmed replacement and unrelated storage preservation');
  } finally { await page.close(); }
}
