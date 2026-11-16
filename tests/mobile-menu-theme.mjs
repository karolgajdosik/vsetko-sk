import assert from 'node:assert/strict';

export async function checkMobileMenu(browser, origin) {
  const page = await browser.newPage({ viewport: { width: 440, height: 900 }, colorScheme: 'light' });
  try {
    await page.goto(new URL('/auto/', origin).href);
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.locator('#mobile-theme-toggle').click();
      await page.locator('.mobile-menu-toggle').click();
      const menu = page.locator('#site-nav');
      await menu.waitFor();
      await page.screenshot({ path: 'production-mobile-menu-' + theme + '.png' });
      await menu.locator('summary').click();
      const samples = await menu.locator('a, summary').evaluateAll(nodes => {
        function luminance(rgb) {
          const linear = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
            const s = value / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
        }
        return nodes.filter(node => node.getClientRects().length).map(node => {
          let layer = node;
          let background;
          do {
            background = getComputedStyle(layer).backgroundColor;
            layer = layer.parentElement;
          } while (layer && background === 'rgba(0, 0, 0, 0)');
          const foreground = luminance(getComputedStyle(node).color);
          const surface = luminance(background);
          return [node.textContent.trim(), (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05)];
        });
      });
      for (const [label, ratio] of samples) assert.ok(ratio >= 4.5, theme + ' menu ' + label + ': ' + ratio);
      console.log('PASS mobile menu', theme, 'minimum contrast', Math.min(...samples.map(sample => sample[1])).toFixed(2));
      await menu.locator('summary').click();
      await page.keyboard.press('Escape');
    }
    const blocks = await page.locator('.footinner > span').evaluateAll(nodes => nodes.map(node => {
      const { top, bottom } = node.getBoundingClientRect();
      return { top, bottom };
    }));
    assert.equal(blocks.length, 3);
    assert.ok(blocks.slice(1).every((block, i) => block.top > blocks[i].bottom), 'Mobile footer groups need separate rows');
  } finally {
    await page.close();
  }
}
