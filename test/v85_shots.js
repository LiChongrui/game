// 第 85 轮验证：渊钮移至左上角（未解锁灰态 + 解锁紫态）
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'v85_locked.png'), clip: { x: 0, y: 0, width: 420, height: 130 } });
  // 解锁态：紫色渊钮
  await page.evaluate(() => { MG.debug.ngUnlock(); MG.debug.addScore(52000); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v85_unlocked.png'), clip: { x: 0, y: 0, width: 420, height: 130 } });
  // 点击渊钮打开词缀弹窗
  await page.mouse.click(24, 70);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v85_pick.png'), clip: { x: 0, y: 140, width: 420, height: 440 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
