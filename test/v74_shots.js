// 第 74 轮验证：任务条两行(星级+奖励) / 底部按钮无文字+名称不压圆钮 / 图鉴分节标题+实际形态+宝箱格
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
  // 1) 主界面顶部：任务条两行
  await page.screenshot({ path: path.join(__dirname, 'v74_quest.png'), clip: { x: 0, y: 0, width: 420, height: 120 } });
  // 2) 底部按钮带：无角按钮文字 + 技能名称不压圆钮
  await page.screenshot({ path: path.join(__dirname, 'v74_bar.png'), clip: { x: 0, y: 640, width: 420, height: 80 } });
  // 3) 图鉴主页：分节标题 + 特殊滴实际形态 + 宝箱格（累计 32000 点亮高档）
  await page.evaluate(() => MG.debug.setLife(32000));
  await page.waitForTimeout(300);
  await page.mouse.click(46, 688);
  await page.waitForTimeout(400);
  // 选中宝箱格看说明
  await page.mouse.click(20 + 8 * 38.4 + 18, 64 + 362 + 40);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v74_dex.png'), clip: { x: 0, y: 64, width: 420, height: 580 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
