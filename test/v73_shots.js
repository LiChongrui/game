// 第 73 轮验证：图鉴主页 5×2 紧凑网格+无门槛提示 / 成就双列难度星级 / 每日任务星级
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
  // 1) 图鉴主页：累计 32000 → 高档部分解锁剪影
  await page.evaluate(() => MG.debug.setLife(32000));
  await page.waitForTimeout(300);
  await page.mouse.click(46, 688);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v73_dex.png'), clip: { x: 0, y: 64, width: 420, height: 580 } });
  // 2) 成就页签（双列星级）
  await page.mouse.click(106, 81); // 成就 tab
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v73_ach.png'), clip: { x: 0, y: 64, width: 420, height: 580 } });
  // 3) 每日任务页签（星级+分级奖励）
  await page.mouse.click(178, 81); // 每日 tab
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v73_daily.png'), clip: { x: 0, y: 64, width: 420, height: 580 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
