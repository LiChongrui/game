// 第 84 轮验证：图鉴未发现特殊滴醒目度 + 深渊回响未解锁灰钮
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
  // 1) 未解锁状态下的底部按钮区（渊灰钮 + 提示）
  await page.screenshot({ path: path.join(__dirname, 'v84_play.png'), clip: { x: 0, y: 600, width: 420, height: 120 } });
  // 2) 点灰渊钮 → 弹出解锁提示
  await page.mouse.click(349, 684);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'v84_hint.png'), clip: { x: 0, y: 0, width: 420, height: 400 } });
  await page.waitForTimeout(2500); // 等弹字消散
  // 3) 图鉴海域页：5000 分（珊瑚浅海已抵达，其 2 个特殊滴未发现）
  await page.evaluate(() => { MG.debug.addScore(5000); });
  await page.waitForTimeout(300);
  await page.mouse.click(46, 684); // 打开图鉴
  await page.waitForTimeout(400);
  await page.mouse.click(297, 120); // 海域演进分段
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v84_sea.png'), clip: { x: 0, y: 0, width: 420, height: 700 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
