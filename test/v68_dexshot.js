const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { MG.debug.setLife(3500); MG.debug.chestNow(210); });
  await page.waitForTimeout(300);
  await page.mouse.click(46, 688); // 图鉴
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v68_before_dex.png') });
  // 成就页
  await page.mouse.click(152, 87); // 成就 tab
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v68_before_ach.png') });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
