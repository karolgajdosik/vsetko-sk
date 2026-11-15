import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mobile = { viewport: { width: 390, height: 844 } };

async function checkCalendar(page, origin) {
  await page.goto(origin + '/kalendar/');
  await page.locator('#calendar-template').selectOption('stk');
  const date = page.locator('#calendar-date');
  assert.equal(await date.inputValue(), '');
  assert.equal(await date.evaluate(input => input === document.activeElement), true);
  assert.equal(await page.locator('#calendar-items time').count(), 0);
  const title = await page.locator('#calendar-title').inputValue();
  await date.fill('2037-12-31');
  await page.locator('#calendar-form button').press('Enter');
  await page.reload();
  assert.equal(await page.locator('#calendar-items time').getAttribute('datetime'), '2037-12-31');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#calendar-export').click();
  const download = await downloadPromise;
  const ics = await readFile(await download.path(), 'utf8');
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20371231\r\nDTEND;VALUE=DATE:20380101'));
  assert.ok(ics.includes('SUMMARY:' + title));
  return title;
}

async function checkProfile(page, origin) {
  await page.goto(origin + '/moj-prehlad/');
  const favorite = page.locator('input[name=favorite][value=kalendar]');
  const selected = page.locator('#profile-shortcuts a[href="/kalendar/"]');
  await favorite.press('Space');
  await page.locator('#profile-form button[type=submit]').press('Enter');
  await selected.waitFor();
  await page.reload();
  assert.equal(await favorite.isChecked(), true);
  await selected.waitFor();
  await page.locator('#profile-clear').press('Enter');
  await page.reload();
  assert.equal(await favorite.isChecked(), false);
  assert.equal(await selected.count(), 0);
}

async function checkWithoutStorage(browser, origin) {
  const page = await browser.newPage(mobile);
  try {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new DOMException('Storage is blocked', 'SecurityError'); }
      });
    });
    await page.goto(origin + '/moj-prehlad/');
    await page.locator('input[name=favorite][value=kalendar]').check();
    await page.locator('#profile-form button[type=submit]').click();
    await page.locator('#profile-shortcuts a[href="/kalendar/"]').waitFor();
    assert.match(await page.locator('#profile-status').innerText(), /neuložil/);
    await page.locator('#profile-clear').click();
    assert.equal(await page.locator('#profile-shortcuts a').count(), 0);
  } finally {
    await page.close();
  }
}

async function checkWordDownloads(page) {
  await page.locator('#doc-body').fill('Prvý riadok: <A> & B\nDruhý riadok');
  for (const [kind, basename, title] of [
    ['request', 'ziadost', 'Žiadosť'],
    ['statement', 'cestne-vyhlasenie', 'Čestné vyhlásenie'],
    ['handover', 'odovzdavaci-protokol', 'Odovzdávací protokol']
  ]) {
    await page.locator('#doc-type').selectOption(kind);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#doc-word').click()
    ]);
    assert.equal(download.suggestedFilename(), basename + '.docx');
    assert.equal(await download.failure(), null);
    const inspected = execFileSync('python3', ['-c', [
      'import json, sys, zipfile, xml.etree.ElementTree as ET',
      'with zipfile.ZipFile(sys.argv[1]) as z:',
      ' assert z.testzip() is None',
      ' for part in ("[Content_Types].xml","_rels/.rels"): ET.fromstring(z.read(part))',
      ' root = ET.fromstring(z.read("word/document.xml"))',
      ' ns = {"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}',
      ' print(json.dumps(["".join(n.itertext()) for n in root.findall(".//w:body/w:p",ns)]))'
    ].join('\n'), await download.path()], { encoding: 'utf8' });
    const paragraphs = JSON.parse(inspected);
    assert.equal(paragraphs[0], title);
    assert.ok(paragraphs.includes('Vyhotovil/a: Testovací odosielateľ'));
    assert.ok(paragraphs.some(text => text.includes('Prvý riadok: <A> & B')));
    assert.ok(paragraphs.includes('Druhý riadok'));
    assert.ok(paragraphs.includes('Podpis'));
  }
  console.log('PASS three editable Word downloads, ZIP integrity and parsed document text');
}

async function checkDocumentCatalog(page, origin) {
  await page.goto(origin + '/dokumenty/');
  const cards = page.locator('#document-cards li:visible');
  const initial = await cards.count();
  assert.ok(initial > 1);
  const search = page.locator('#document-search');
  await search.fill('kluce');
  assert.equal(await cards.count(), 1);
  assert.match(await cards.innerText(), /Odovzdanie bytu alebo domu/);
  await page.locator('#document-category').selectOption('nakupy');
  await page.locator('#document-empty').waitFor();
  assert.equal(await cards.count(), 0);
  await page.locator('#document-reset').click();
  assert.equal(await cards.count(), initial);
  assert.equal(await search.evaluate(input => input === document.activeElement), true);
  for (const link of await cards.locator('a[data-template]').all()) {
    const template = await link.getAttribute('data-template');
    await link.click();
    assert.equal(await page.locator('#doc-type').inputValue(), template);
  }
  await page.locator('#doc-sender').fill('Testovací odosielateľ');
  await page.locator('#doc-body').fill('Kontrola náhľadu dokumentu');
  assert.match(await page.locator('#document-preview').innerText(), /Kontrola náhľadu dokumentu/);
  await page.evaluate(() => {
    window.print = () => document.documentElement.setAttribute('data-print-called', 'yes');
  });
  await page.locator('#doc-print').click();
  assert.equal(await page.locator('html').getAttribute('data-print-called'), 'yes');

  await checkWordDownloads(page);
  const targets = await cards.locator('a[href^="/"]').evaluateAll(links => links.map(link => link.href));
  assert.ok(targets.length >= 2);
  for (const target of targets) {
    const url = new URL(target);
    assert.equal(url.origin, new URL(origin).origin);
    const response = await page.goto(target);
    assert.equal(response?.status(), 200, target);
    assert.equal(new URL(page.url()).pathname, url.pathname);
    if (url.hash) await page.locator(url.hash).waitFor({ state: 'attached' });
    assert.ok(await page.locator('main h1').isVisible());
  }
}

export async function checkPersonalTools(browser, origin) {
  const page = await browser.newPage(mobile);
  try {
    const title = await checkCalendar(page, origin);
    await checkProfile(page, origin);
    await page.goto(origin + '/kalendar/');
    await page.getByRole('button', { name: 'Odstrániť termín: ' + title, exact: true }).press('Enter');
    assert.equal(await page.locator('#calendar-title').evaluate(input => input === document.activeElement), true);
    await page.reload();
    assert.equal(await page.locator('#calendar-items time').count(), 0);
    await checkWithoutStorage(browser, origin);
    await checkDocumentCatalog(page, origin);
    console.log('PASS V4 mobile profile, blocked storage, calendar persistence/ICS/focus, document filters and links');
  } finally {
    await page.close();
  }
}
