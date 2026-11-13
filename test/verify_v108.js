const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errs = [];

  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve('../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);
  await page.mouse.click(210, 426);
  await page.waitForTimeout(400);
  await page.evaluate(() => { MG.debug.spawn(5, 140, 400); MG.debug.spawn(6, 280, 380); MG.debug.spawn(7, 210, 300); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'v108_play.png') });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'v108_play2.png') });
  await page.evaluate(() => { MG.debug.openDex(); });
  await page.waitForTimeout(300);
  await page.mouse.click(298, 120);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v108_dex.png') });
  await page.close();

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
