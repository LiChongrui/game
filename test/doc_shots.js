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

  await shot('menu');

  await page.mouse.click(210, 426);
  await page.waitForTimeout(300);
  const drops = [[2, 120], [3, 200], [2, 300], [3, 150], [4, 260], [2, 350], [3, 110], [4, 240]];
  for (const [t, x] of drops) {
    await page.evaluate(([t, x]) => { MG.debug.setNext({ tier: t }); MG.debug.drop(x); }, [t, x]);
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(1500);
  await shot('play');

  await page.evaluate(() => { MG.debug.openDex(); });
  await page.waitForTimeout(200);
  const sec = await page.evaluate(() => {
    const r = { x: 20, y: 64, w: 380, h: 560 };
    return { x: r.x + 15 + (r.w - 30) / 2 + (r.w - 30) / 4, y: r.y + 44 + 12 };
  });
  await page.mouse.click(sec.x, sec.y);
  await page.waitForTimeout(300);
  await shot('dex');
  await page.evaluate(() => MG.debug.closeDex());

  await page.evaluate(() => { MG.debug.forceEndless(); const t = MG.probe().tideRef; t.phase = 'active'; t.timer = 5; t.progress = 1; t.banner = 0; MG.debug.setLife(300100); });
  await page.waitForTimeout(2600);
  await shot('tide');

  await page.evaluate(() => { const t = MG.probe().tideRef; t.phase = 'idle'; t.timer = 18; t.progress = 0; MG.debug.addScore(28600); MG.debug.over(); });
  await page.waitForTimeout(400);
  await shot('over');

  console.log('DOC SHOTS OK');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
