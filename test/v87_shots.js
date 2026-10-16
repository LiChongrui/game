// 第 87 轮验证：深渊潜航移至结算页（锁定灰显/解锁紫钮/点击开词缀弹窗/选卡开新局）
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
  // 1) 未解锁：结算页灰显预告
  await page.evaluate(() => { MG.debug.addScore(3200); MG.debug.over(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v87_over_locked.png'), clip: { x: 0, y: 140, width: 420, height: 580 } });
  // 2) 解锁：紫色按钮（重新开局再结束，避免复活/双倍按钮占位变化）
  await page.evaluate(() => { MG.debug.ngUnlock(); MG.debug.reset(); MG.debug.addScore(52000); MG.debug.over(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v87_over_unlocked.png'), clip: { x: 0, y: 140, width: 420, height: 580 } });
  // 3) 点深渊潜航 → 词缀弹窗（第 4 个按钮：复活/双倍/分享/潜航 y=327+3*48=471 中心 491）
  await page.mouse.click(210, 491);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v87_pick.png'), clip: { x: 0, y: 140, width: 420, height: 440 } });
  // 4) 选第一张卡 → 开新局
  await page.mouse.click(210, 298);
  await page.waitForTimeout(600);
  const st = await page.evaluate(() => MG.debug.ngInfo());
  await page.screenshot({ path: path.join(__dirname, 'v87_newrun.png'), clip: { x: 0, y: 0, width: 420, height: 200 } });
  console.log('ngInfo:', JSON.stringify(st), 'errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
