const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', e => console.log('PAGEERROR', e));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => MG.debug.addScore(6000));
  await page.mouse.click(46, 684);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v88_tier.png'), clip: { x: 0, y: 0, width: 420, height: 700 } });
  await page.mouse.click(297, 120);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v88_sea.png'), clip: { x: 0, y: 0, width: 420, height: 700 } });
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
