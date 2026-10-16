// 第 72 轮验证：①顶部三行排版（分数/副信息/任务+潮汐）②底部按钮标注（图鉴/重开/回响，无绿色海徽章）③图鉴 8 格海域条
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
  // 1) 顶部三行排版：无尽模式（任务条 + 潮汐胶囊同带），投放几滴
  await page.evaluate(() => { MG.debug.forceEndless(); MG.debug.setLife(123456); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { MG.debug.drop(120); MG.debug.drop(300); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'v72_top.png'), clip: { x: 0, y: 0, width: 420, height: 230 } });
  // 2) 底部按钮标注：解锁渊 → 图鉴/重开/回响 三个标注
  await page.evaluate(() => MG.debug.ngUnlock());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v72_bar.png'), clip: { x: 0, y: 630, width: 420, height: 90 } });
  // 3) 图鉴 8 格海域条：累计 32 万 → 深渊王座当前高亮
  await page.evaluate(() => MG.debug.setLife(320000));
  await page.waitForTimeout(300);
  await page.mouse.click(46, 688);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v72_dex8.png'), clip: { x: 0, y: 420, width: 420, height: 300 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
