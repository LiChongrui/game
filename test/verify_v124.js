const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const url = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const pA = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errsA = [];
  pA.on('pageerror', e => errsA.push(e.message));
  const seen = Date.now() - 5 * 3600 * 1000;
  await pA.addInitScript((s) => {
    localStorage.clear();
    localStorage.setItem('mg_seen', String(s));
    localStorage.setItem('mg_best', '40000');
  }, seen);
  await pA.goto(url);
  await pA.waitForTimeout(1600);
  const menuA = await pA.evaluate(() => ({
    offline: MG.probe().offline,
    state: MG.probe().state
  }));
  await pA.screenshot({ path: 'v124_menu_card.png' });
  await pA.mouse.click(210, 426);
  await pA.waitForTimeout(900);
  const runA = await pA.evaluate(() => ({
    state: MG.probe().state,
    score: MG.probe().score,
    best: MG.probe().best
  }));
  await pA.screenshot({ path: 'v124_claim_popup.png' });
  await pA.close();

  const pB = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errsB = [];
  pB.on('pageerror', e => errsB.push(e.message));
  await pB.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('mg_seen', String(Date.now() - 60 * 1000));
    localStorage.setItem('mg_best', '40000');
  });
  await pB.goto(url);
  await pB.waitForTimeout(1600);
  const menuB = await pB.evaluate(() => ({ offline: MG.probe().offline }));
  await pB.mouse.click(210, 426);
  await pB.waitForTimeout(2600);
  const runB = await pB.evaluate(() => ({
    score: MG.probe().score,
    seenTick: (typeof seenTick !== 'undefined') ? seenTick : 'n/a',
    seenSaved: localStorage.getItem('mg_seen')
  }));
  await pB.close();

  await browser.close();
  const out = {
    A: { menu: menuA, run: runA, expectGain: (30 + Math.floor(40000 * 0.0004)) * 300, errs: errsA },
    B: { menu: menuB, run: runB, errs: errsB }
  };
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
