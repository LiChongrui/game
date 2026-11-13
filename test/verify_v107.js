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
  await page.evaluate(() => { MG.debug.chestNow(70); });
  await page.waitForTimeout(600);
  await page.evaluate(() => { MG.debug.spawn(7, 210, 210); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v107_play.png') });
  await page.close();

  const p2 = await browser.newPage({ viewport: { width: 900, height: 720 } });
  p2.on('pageerror', e => errs.push(e.message));
  await p2.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await p2.goto('file:///' + path.resolve('../index.html').replace(/\\/g, '/'));
  await p2.waitForTimeout(1200);
  await p2.evaluate(() => { MG.debug.setLife(30000); });
  await p2.waitForTimeout(3600);
  await p2.screenshot({ path: path.join(__dirname, 'v107_flora.png') });
  await p2.close();

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
