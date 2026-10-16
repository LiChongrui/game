// 第 78 轮验证：图鉴/成就拆分双入口 + 图鉴页重设计 + 特殊页全海域行
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
  await page.screenshot({ path: path.join(__dirname, 'v78_tier.png'), clip });
  await page.mouse.click(210, 120); // 海域演进
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v78_sea.png'), clip });
  await page.mouse.click(330, 120); // 特殊·宝箱
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v78_sp.png'), clip });
  await page.mouse.click(372, 90);  // × 关闭图鉴
  await page.waitForTimeout(300);
  await page.mouse.click(90, 688);  // 奖杯 → 成就页
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v78_ach.png'), clip });
  await page.mouse.click(209, 120); // 每日
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v78_daily.png'), clip });
  await page.mouse.click(325, 120); // 榜单
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v78_rank.png'), clip });
  await page.mouse.click(372, 90);  // × 关闭
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => MG.probe().state);
  console.log('state after close:', st);
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
