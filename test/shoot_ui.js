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

  await page.mouse.click(210, 426);
  await page.waitForTimeout(300);
  const drops = [[3, 110], [3, 310], [4, 210], [2, 70], [2, 160], [2, 260], [2, 350], [3, 130], [3, 290], [1, 180], [1, 240], [2, 150]];
  for (const [t, x] of drops) { await drop(t, x); await page.waitForTimeout(520); }
  await page.waitForTimeout(2000);
  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'idle'; t.timer = 99; t.progress = 0; MG.debug.addScore(96); });

  await page.mouse.click(396, 36);
  await page.waitForTimeout(400);
  await shot('sound');

  await page.evaluate(() => { MG.debug.give('swap', 2); MG.debug.give('ripple', 2); MG.debug.give('evap', 2); MG.debug.give('flow', 2); MG.debug.chestNow(210); });
  await page.waitForTimeout(1500);
  await shot('prop');

  await page.mouse.click(24, 36);
  await page.waitForTimeout(500);
  await page.mouse.click(298, 120);
  await page.waitForTimeout(400);
  await shot('board');

  console.log('SYS SHOTS OK');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
