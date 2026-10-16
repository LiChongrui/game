// 玩法介绍配图全套重拍：每张对应介绍的一个段落
// ① menu 开始界面 ② play 核心合成 ③ special 特殊水滴 ④ skill 技能+宝箱
// ⑤ sea 海域演进 ⑥ tide 潮汐涨落 ⑦ over 结算+深渊潜航
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);
  const shot = n => page.screenshot({ path: path.join(__dirname, 'doc_' + n + '.png') });
  const drop = (t, x, extra) => page.evaluate(([t, x, extra]) => {
    MG.debug.setNext(Object.assign({ tier: t }, extra || {}));
    MG.debug.drop(x);
  }, [t, x, extra]);

  // ① 开始界面
  await shot('menu');

  // ② 核心合成：中局水堆 + 顶栏全有内容
  await page.mouse.click(210, 426);
  await page.waitForTimeout(300);
  const drops = [
    [3, 110], [3, 310], [4, 210],
    [2, 70], [2, 160], [2, 260], [2, 350],
    [3, 130], [3, 290],
    [1, 100], [1, 180], [1, 240], [1, 320],
    [2, 150], [2, 270],
  ];
  for (const [t, x] of drops) { await drop(t, x); await page.waitForTimeout(520); }
  await page.waitForTimeout(2200);
  await page.evaluate(() => { MG.debug.addScore(96); });
  await page.waitForTimeout(300);
  await shot('play');

  // ③ 特殊水滴：铁滴 / 彩虹滴 / 云滴 / 磁力滴 / 冰晶滴（都留在场上带可见标记）
  await drop(2, 90, { iron: true });        await page.waitForTimeout(650);
  await drop(1, 200, { special: 'rainbow' }); await page.waitForTimeout(650);
  await drop(1, 330, { special: 'cloud' }); await page.waitForTimeout(650);
  await drop(2, 150, { special: 'magnet' }); await page.waitForTimeout(650);
  await drop(1, 290, { special: 'ice' });   await page.waitForTimeout(650);
  await page.waitForTimeout(1800);
  await shot('special');

  // ④ 技能+宝箱：四技能充满 + 深海宝箱落在堆顶
  await page.evaluate(() => { MG.debug.give('swap', 2); MG.debug.give('ripple', 2); MG.debug.give('evap', 2); MG.debug.give('flow', 2); MG.debug.chestNow(210); });
  await page.waitForTimeout(1500);
  await shot('skill');

  // ⑤ 海域演进：珊瑚浅海主题色 + 进度条指向蔚蓝深海（先钉住潮汐不触发）
  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'idle'; t.timer = 99; t.progress = 0; MG.debug.setLife(6500); });
  await page.waitForTimeout(2800); // 等海域渐变走完
  await shot('sea');

  // ⑥ 潮汐涨落：同海域潮位涨到中段，水滴随波浮起
  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'active'; t.progress = 0.55; t.timer = 6; t.banner = 0; });
  await page.waitForTimeout(2000);
  await shot('tide');

  // ⑦ 结算：恢复潮汐 → 触发终局 → 深渊潜航入口
  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'idle'; t.timer = 18; t.progress = 0; MG.debug.ngUnlock(); MG.debug.over(); });
  await page.waitForTimeout(500);
  await shot('over');

  console.log('ALL SHOTS OK');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
