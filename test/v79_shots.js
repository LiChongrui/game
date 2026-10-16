// 第 79 轮验证：特殊滴并入海域演进行（分节 3→2）+ 奖杯钮移至左上角
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
  await page.mouse.click(46, 688); // 打开图鉴（合成链）
  await page.waitForTimeout(400);
  await page.mouse.click(206, 316);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(__dirname, 'v79_tier.png'), clip });
  await page.mouse.click(297, 120); // 海域演进（第 2 段，分段控件 2 等分）
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v79_sea.png'), clip });
  await page.mouse.click(236, 204); // 珊瑚浅海行 槽位0（特殊滴说明）
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(__dirname, 'v79_detail.png'), clip });
  await page.mouse.click(372, 90);  // × 关闭图鉴
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v79_play.png'), clip: { x: 0, y: 0, width: 420, height: 120 } }); // 左上角奖杯钮
  await page.mouse.click(24, 36);   // 奖杯（左上角）→ 成就页
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v79_ach.png'), clip });
  const st = await page.evaluate(() => MG.probe().state);
  console.log('state after trophy:', st);
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
