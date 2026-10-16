// 第 83 轮验证：8 海域主题色背景 + 深渊回响弹窗新文案
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
  const scores = [0, 4000, 12000, 30000, 60000, 120000, 200000, 310000];
  for (var i = 0; i < scores.length; i++) {
    await page.evaluate(n => { MG.debug.reset(); MG.debug.setLife(n * 2); MG.debug.addScore(n); }, scores[i]);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(__dirname, 'v83_sea' + i + '.png'), clip: { x: 0, y: 0, width: 420, height: 720 } });
  }
  // NG 弹窗新文案（带当前局提示）
  await page.evaluate(() => { MG.debug.reset(); MG.debug.addScore(60000); MG.debug.ngUnlock(); });
  await page.waitForTimeout(400);
  await page.mouse.click(349, 688);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v83_ng.png'), clip: { x: 0, y: 140, width: 420, height: 440 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
