const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);

  await page.mouse.click(210, 426);
  await page.waitForTimeout(300);

  const drops = [
    [3, 110], [3, 310], [4, 210],
    [2, 70], [2, 160], [2, 260], [2, 350],
    [3, 130], [3, 290],
    [1, 100], [1, 180], [1, 240], [1, 320],
    [2, 150], [2, 270],
  ];
  for (const [t, x] of drops) {
    await page.evaluate(([t, x]) => { MG.debug.setNext({ tier: t }); MG.debug.drop(x); }, [t, x]);
    await page.waitForTimeout(520);
  }
  await page.waitForTimeout(2200);

  await page.evaluate(() => { MG.debug.addScore(96); });
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(__dirname, 'doc_play.png') });
  console.log('PLAY SHOT OK');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
