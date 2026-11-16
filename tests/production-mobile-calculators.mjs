import assert from 'node:assert/strict';
import { checkProductionPwa } from './v4-pwa-acceptance.mjs';
import { checkV4Tools } from './v4-tools-acceptance.mjs';
import { checkMobileMenu } from './mobile-menu-theme.mjs';
import {chromium} from 'playwright';

// Run against the local build in CI or the real deployed site after a merge.
// Synthetic values only: no personal calculator inputs are transmitted.
const origin = process.env.VSETKO_ORIGIN || 'https://vsetko24.sk';
const checks = [
  {path:'/kalkulacky/splatka-uveru/', input:'#calculator input[name="amount"]', value:'999999999', label:'loan'},
  {path:'/kalkulacky/naklady-na-auto/', input:'#km', value:'200000', label:'car'}
];
const browser = await chromium.launch({headless:true});
try {
  await checkMobileMenu(browser, origin);
  for (const width of [360,390]) {
    for (const check of checks) {
      const page = await browser.newPage({viewport:{width,height:780}});
      try {
        let response;
        for (let attempt=1;attempt<=3;attempt++) {
          try {
            response=await page.goto(new URL(check.path,origin).href,{waitUntil:'load',timeout:20000});
            if (response?.status()===200) break;
          } catch (error) {
            if (attempt===3) throw error;
          }
          if (attempt<3) await new Promise(resolve=>setTimeout(resolve,5000));
        }
        assert.equal(response?.status(),200,'Production calculator must return HTTP 200: '+check.path);
        const controls=page.locator('.calculator-panel .budget input, .calculator-panel .budget select');
        assert.ok(await controls.count()>0,'Calculator controls missing: '+check.path);
        for (const control of await controls.all()) {
          const metric=await control.evaluate(el=>({
            height:el.getBoundingClientRect().height,
            font:parseFloat(getComputedStyle(el).fontSize),
            right:el.getBoundingClientRect().right
          }));
          assert.ok(metric.height>=44,'Touch target <44px at '+width+'px: '+check.path);
          assert.ok(metric.font>=16,'Input font <16px at '+width+'px: '+check.path);
          assert.ok(metric.right<=width+1,'Input overflows at '+width+'px: '+check.path);
        }
        const result=page.locator('.calculator-panel .result');
        assert.ok(await result.isVisible(),'Result is hidden: '+check.path);
        const before=await result.textContent();
        await page.locator(check.input).fill(check.value);
        const after=await result.textContent();
        assert.notEqual(after,before,'Calculator did not recalculate: '+check.path);
        assert.ok(after && !after.includes('NaN'),'Invalid result: '+check.path);
        const metric=await result.evaluate(el=>({
          right:el.getBoundingClientRect().right,
          font:parseFloat(getComputedStyle(el.querySelector('strong')).fontSize),
          scroll:document.documentElement.scrollWidth,
          viewport:innerWidth
        }));
        assert.ok(metric.font>=22,'Result text too small at '+width+'px: '+check.path);
        assert.ok(metric.right<=width+1,'Result panel overflows at '+width+'px: '+check.path);
        assert.ok(metric.scroll<=metric.viewport+1,'Horizontal page overflow at '+width+'px: '+check.path);
        await page.screenshot({path:'production-mobile-'+check.label+'-'+width+'.png',fullPage:true});
        console.log('PASS mobile production',check.path,width+'px','recalculation and layout');
      } finally {
        await page.close();
      }
    }
  }
  if (new URL(origin).hostname !== '127.0.0.1' && new URL(origin).hostname !== 'localhost') {
    await checkProductionPwa(browser, origin);
    await checkV4Tools(browser, origin);
    console.log('PASS V4 mobile budget, service comparison and vehicle backup flows');
  }
} finally {
  await browser.close();
}
