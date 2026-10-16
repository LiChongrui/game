// 三大系统功能截图：①技能系统 ②潮汐系统 ③成就·每日·榜单
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);
  const shot = n => page.screenshot({ path: path.join(__dirname, 'doc_sys_' + n + '.png') });
  const drop = (t, x) => page.evaluate(([t, x]) => { MG.debug.setNext({ tier: t }); MG.debug.drop(x); }, [t, x]);

  // 进对局、堆一池水滴
  await page.mouse.click(210, 426);
  await page.waitForTimeout(300);
  const drops = [[3, 110], [3, 310], [4, 210], [2, 70], [2, 160], [2, 260], [2, 350], [3, 130], [3, 290], [1, 100], [1, 180], [1, 240], [1, 320], [2, 150], [2, 270]];
  for (const [t, x] of drops) { await drop(t, x); await page.waitForTimeout(520); }
  await page.waitForTimeout(2200);
  await page.evaluate(() => { MG.debug.addScore(96); });

  // ① 技能系统：四技能充满 + 深海宝箱
  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'idle'; t.timer = 99; t.progress = 0; MG.debug.give('swap', 2); MG.debug.give('ripple', 2); MG.debug.give('evap', 2); MG.debug.give('flow', 2); MG.debug.chestNow(210); });
  await page.waitForTimeout(1500);
  await shot('skill');

  // ② 潮汐系统：潮位涨到中段、水滴随波浮起
  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'active'; t.progress = 0.55; t.timer = 6; t.banner = 0; });
  await page.waitForTimeout(2000);
  await shot('tide');

  // ③ 成就·每日·榜单：点左上角奖杯打开成就页
  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'idle'; t.timer = 18; t.progress = 0; });
  await page.waitForTimeout(800);
  await page.mouse.click(24, 36);
  await page.waitForTimeout(500);
  await shot('ach');

  console.log('SYS SHOTS OK');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
