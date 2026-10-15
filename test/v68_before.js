const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  const clip = { x: 0, y: 0, width: 420, height: 300 };
  // 符文虚影 + 标签
  await page.evaluate(() => { MG.debug.setNext({ rune: 'flow' }); MG.debug.setLife(4000); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v68_before_rune.png'), clip });
  // 礁石虚影 + 标签
  await page.evaluate(() => MG.debug.setNext({ iron: true }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v68_before_iron.png'), clip });
  // 彩虹滴虚影
  await page.evaluate(() => MG.debug.setNext({ special: 'rainbow' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v68_before_rainbow.png'), clip });
  // 宝箱（重生到中间）
  await page.evaluate(() => MG.debug.chestNow(210));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'v68_before_chest.png'), clip });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
