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

  await shot('menu');

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

  await drop(2, 90, { iron: true });        await page.waitForTimeout(650);
  await drop(1, 200, { special: 'rainbow' }); await page.waitForTimeout(650);
  await drop(1, 330, { special: 'cloud' }); await page.waitForTimeout(650);
  await drop(2, 150, { special: 'magnet' }); await page.waitForTimeout(650);
  await drop(1, 290, { special: 'ice' });   await page.waitForTimeout(650);
  await page.waitForTimeout(1800);
  await shot('special');

  await page.evaluate(() => { MG.debug.give('swap', 2); MG.debug.give('ripple', 2); MG.debug.give('evap', 2); MG.debug.give('flow', 2); MG.debug.chestNow(210); });
  await page.waitForTimeout(1500);
  await shot('skill');

  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'idle'; t.timer = 99; t.progress = 0; MG.debug.setLife(6500); });
  await page.waitForTimeout(2800);
  await shot('sea');

  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'active'; t.progress = 0.55; t.timer = 6; t.banner = 0; });
  await page.waitForTimeout(2000);
  await shot('tide');

  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'idle'; t.timer = 18; t.progress = 0; MG.debug.ngUnlock(); MG.debug.over(); });
  await page.waitForTimeout(500);
  await shot('over');

  console.log('ALL SHOTS OK');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
