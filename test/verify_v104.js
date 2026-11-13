const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve('../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);
  await page.mouse.click(210, 426);
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    MG.debug.setLife(5200);
  });
  await page.waitForTimeout(300);
  await page.mouse.click(24, 36);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v104_ach.png') });

  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v104_dex0.png') });

  await page.mouse.click(298, 120);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v104_dex1.png') });
  await page.evaluate(() => MG.debug.closeDex());
  await page.waitForTimeout(200);

  const drops = [
    [0, 100], [1, 320], [2, 210], [3, 130], [4, 290],
    [1, 160], [2, 350], [3, 80], [4, 250], [5, 180],
    [2, 300], [3, 150], [6, 210],
  ];
  for (const [t, x] of drops) {
    await page.evaluate(([t, x]) => { MG.debug.setNext({ tier: t }); MG.debug.drop(x); }, [t, x]);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(2400);
  await page.screenshot({ path: path.join(__dirname, 'v104_play.png') });

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
