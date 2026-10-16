// 第 75 轮验证：图鉴分节切换（合成链3×3 / 海域演进三态列表 / 特殊·宝箱5×2）+ 通用说明区
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
  const clip = { x: 0, y: 64, width: 420, height: 580 };
  await page.evaluate(() => MG.debug.setLife(32000));
  await page.waitForTimeout(300);
  await page.mouse.click(46, 688); // 打开图鉴（默认合成链分节）
  await page.waitForTimeout(400);
  await page.mouse.click(206, 316); // 选中「湖泊」格 → 说明区显示合成链描述
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(__dirname, 'v76_tier.png'), clip });
  await page.mouse.click(210, 120); // 切到 海域演进
  await page.waitForTimeout(300);
  await page.mouse.click(200, 380); // 选中一个未抵达海域行
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(__dirname, 'v76_sea.png'), clip });
  await page.mouse.click(330, 120); // 切到 特殊·宝箱
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v76_sp.png'), clip });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
