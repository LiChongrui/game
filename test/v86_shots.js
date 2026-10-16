// 第 86 轮验证：渊钮顶栏中段（锁定/解锁态）+ 图鉴特殊滴图标文字间距
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
  // 锁定态顶栏
  await page.screenshot({ path: path.join(__dirname, 'v86_locked.png'), clip: { x: 0, y: 0, width: 420, height: 130 } });
  // 解锁态顶栏
  await page.evaluate(() => { MG.debug.ngUnlock(); MG.debug.addScore(52000); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v86_unlocked.png'), clip: { x: 0, y: 0, width: 420, height: 130 } });
  // 点渊钮开词缀弹窗
  await page.mouse.click(258, 76);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v86_pick.png'), clip: { x: 0, y: 140, width: 420, height: 440 } });
  await page.mouse.click(10, 10); // 关弹窗
  await page.waitForTimeout(300);
  // 图鉴海域页：潮汐池/珊瑚浅海行未发现"？"与文字间距
  await page.evaluate(() => { MG.debug.reset(); MG.debug.addScore(5000); });
  await page.waitForTimeout(300);
  await page.mouse.click(46, 684);
  await page.waitForTimeout(400);
  await page.mouse.click(297, 120); // 海域演进分段
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v86_sea.png'), clip: { x: 0, y: 0, width: 420, height: 700 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
