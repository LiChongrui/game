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

  const gate = await page.evaluate(() => {
    const r = {};
    MG.debug.setLife(0);
    let ironYes = 0, vortexYes = 0;
    for (let i = 0; i < 400; i++) {  }
    r.stage0 = MG.probe().seaStage;
    return r;
  });
  await page.evaluate(() => { MG.debug.setNext({ tier: 1, iron: true }); MG.debug.drop(120); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { MG.debug.setNext({ tier: 2, iron: true }); MG.debug.drop(300); });
  await page.waitForTimeout(900);

  await page.mouse.click(24, 36);
  await page.waitForTimeout(300);
  await page.mouse.click(209, 120);
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(__dirname, 'v105_daily.png') });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'v105_daily_done.png') });

  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(300);
  await page.mouse.click(298, 120);
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(__dirname, 'v105_seg_mid.png') });
  await page.evaluate(() => MG.debug.closeDex());
  await page.waitForTimeout(200);

  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v105_play.png') });

  await page.evaluate(() => { MG.debug.forceEndless(); MG.debug.over(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'v105_over.png') });

  console.log('gate:', JSON.stringify(gate), 'errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
