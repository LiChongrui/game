const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errs = [];
  page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);
  const drop = (t, x, extra) => page.evaluate(([t, x, extra]) => { MG.debug.setNext(Object.assign({ tier: t }, extra || {})); MG.debug.drop(x); }, [t, x, extra]);

  await page.mouse.click(210, 426);
  await page.waitForTimeout(300);
  await drop(2, 150, { iron: true }); await page.waitForTimeout(600);
  await drop(2, 280, { iron: true }); await page.waitForTimeout(600);
  const ironN = await page.evaluate(() => MG.probe().bodies ? MG.probe().bodies.filter(b => b.iron).length : -1);
  const nextIsIron = await page.evaluate(() => { MG.debug.setNext({ iron: true }); MG.debug.drop(210); const p = MG.probe(); return p.bodies.filter(b => b.iron).length; });
  console.log('IRON board=' + ironN + ' after3rdDrop=' + nextIsIron + '（应为 2：第三颗不再变礁石，也不会假装礁石）');
  await page.waitForTimeout(1200);

  await page.mouse.click(24, 36);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'fix_ach.png') });
  await page.mouse.click(209, 120);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'fix_daily.png') });
  await page.evaluate(() => {  });
  await page.mouse.click(372, 78);
  await page.waitForTimeout(300);

  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(400);
  await page.mouse.click(298, 120);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'fix_dex_sea.png') });

  console.log(errs.length ? 'HAS ERRORS' : 'NO PAGE ERRORS');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
