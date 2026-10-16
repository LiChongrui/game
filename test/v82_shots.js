// 第 82 轮整体核查：全状态截图巡检
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
  const full = { x: 0, y: 0, width: 420, height: 720 };
  const panel = { x: 0, y: 64, width: 420, height: 580 };

  // 1) 开局（含新手引导）
  await page.screenshot({ path: path.join(__dirname, 'v82_play0.png'), clip: full });

  // 2) 中期：加分进午夜深渊 + 宝箱 + 特殊滴
  await page.evaluate(() => {
    MG.debug.setLife(50000);
    MG.debug.addScore(48000);
    MG.debug.chestNow(210);
    MG.debug.setNext({ tier: 5, special: 'ice' });
  });
  await page.waitForTimeout(600);
  await page.mouse.click(210, 400); // 落一滴
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(__dirname, 'v82_mid.png'), clip: full });

  // 3) 警戒状态：同点堆高
  await page.evaluate(() => { for (var i = 0; i < 14; i++) MG.debug.drop(210); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, 'v82_danger.png'), clip: full });
  const st1 = await page.evaluate(() => MG.probe().state);

  // 4) 若未死，强制堆到死拿结算页
  if (st1 === 'play') {
    await page.evaluate(() => { for (var i = 0; i < 20; i++) MG.debug.drop(60 + (i % 3) * 150); });
    await page.waitForTimeout(2500);
  }
  const st2 = await page.evaluate(() => MG.probe().state);
  await page.screenshot({ path: path.join(__dirname, 'v82_over.png'), clip: full });

  // 5) 重开 → 图鉴（有存档进度：解锁几档）
  await page.evaluate(() => { MG.debug.reset(); MG.debug.addScore(30000); });
  await page.waitForTimeout(500);
  await page.mouse.click(46, 688);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v82_tier.png'), clip: panel });
  await page.mouse.click(297, 120);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v82_sea.png'), clip: panel });
  await page.mouse.click(372, 90);
  await page.waitForTimeout(250);

  // 6) 成就三页
  await page.mouse.click(24, 36);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(__dirname, 'v82_ach.png'), clip: panel });
  await page.mouse.click(209, 120);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(__dirname, 'v82_daily.png'), clip: panel });
  await page.mouse.click(325, 120);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(__dirname, 'v82_rank.png'), clip: panel });
  await page.mouse.click(372, 90);
  await page.waitForTimeout(250);

  // 7) 二周目词缀弹窗
  await page.evaluate(() => { MG.debug.ngUnlock(); MG.debug.addScore(60000); });
  await page.waitForTimeout(300);
  await page.mouse.click(349, 688);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v82_ng.png'), clip: panel });

  const st3 = await page.evaluate(() => MG.probe().state);
  console.log('states:', st1, st2, st3);
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
