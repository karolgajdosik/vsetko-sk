import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function checkCaseDocuments(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(new URL('/dokumenty/', origin).href);
    await page.evaluate(() => {
      const now = new Date().toISOString();
      localStorage.setItem('v24-workspace-v5', JSON.stringify({version:1,activeCaseId:'doc-test',cases:[{id:'doc-test',kind:'car',title:'Rodinné auto – skúška',createdAt:now,updatedAt:now,completed:[],values:{purchasePrice:12345.67,downPayment:1000}}]}));
    });
    await page.reload();
    await page.locator('#doc-load-case').click();
    assert.match(await page.locator('#doc-subject').inputValue(),/Rodinné auto/);
    assert.match(await page.locator('#doc-body').inputValue(),/12\s?345,67/);
    await page.locator('#doc-sender').fill('Ľubomír Šťastný');
    await page.locator('#doc-recipient').fill('Príslušná inštitúcia');
    const [pdfDownload] = await Promise.all([page.waitForEvent('download'),page.locator('#doc-pdf').click()]);
    assert.equal(pdfDownload.suggestedFilename(),'ziadost.pdf');
    const pdf = await readFile(await pdfDownload.path());
    assert.equal(pdf.subarray(0,8).toString(),'%PDF-1.7');
    assert.ok(pdf.includes(Buffer.from('/ToUnicode')));
    const [wordDownload] = await Promise.all([page.waitForEvent('download'),page.locator('#doc-word').click()]);
    assert.equal(wordDownload.suggestedFilename(),'ziadost.docx');
    await page.locator('#doc-type').selectOption('termination');
    await page.locator('#doc-word').click();
    assert.match(await page.locator('#doc-status').innerText(),/identifikáciu zmluvy/);
    assert.equal(await page.locator('#doc-reference').getAttribute('aria-invalid'),'true');
    assert.equal(await page.evaluate(()=>localStorage.getItem('v24-workspace-v5').includes('Ľubomír')),false);
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.case-draft').isVisible(),false,'case import controls stay out of the printed document');
    assert.equal(await page.locator('#document-preview').isVisible(),true);
    console.log('PASS V5 case document import, real Unicode PDF and Word downloads, template validation and no document persistence');
  } finally { await context.close(); }
}
