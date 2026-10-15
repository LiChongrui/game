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
  // 1) 符文虚影 + 图鉴解锁弹字（应出现在 y=240 公告位，不压水滴）
  await page.evaluate(() => { MG.debug.setNext({ rune: 'flow' }); MG.debug.setLife(4000); MG.debug.bump('chest', 1); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v68_after_rune.png'), clip: { x: 0, y: 0, width: 420, height: 340 } });
  // 2) 新宝箱（警戒线下方 + 新样式）
  await page.evaluate(() => MG.debug.chestNow(210));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'v68_after_chest.png'), clip: { x: 0, y: 0, width: 420, height: 400 } });
  // 3) 图鉴（海域演进标签不压格子）
  await page.mouse.click(46, 688);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v68_after_dex.png') });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
