const { chromium } = require('playwright-core');
const path = require('path');
const SP_KEYS = ['vortex','cloud','iron','ice','rune','rainbow','gale','magnet','spring','thunder','pearl','magma','geyser','void','aurora','chest'];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errs = [];

  const pA = await browser.newPage({ viewport: { width: 420, height: 720 } });
  pA.on('pageerror', e => errs.push('A:' + e.message));
  await pA.addInitScript(() => { localStorage.clear(); });
  await pA.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await pA.waitForTimeout(1500);
  await pA.evaluate(() => { MG.debug.openDex(); });
  await pA.waitForTimeout(400);
  await pA.screenshot({ path: path.join(__dirname, 'v122_dex_clean.png') });
  const infoA = await pA.evaluate(() => MG.probe().col());
  console.log('A colProgress:', JSON.stringify(infoA));
  await pA.close();

  const pB = await browser.newPage({ viewport: { width: 420, height: 720 } });
  pB.on('pageerror', e => errs.push('B:' + e.message));
  await pB.addInitScript((keys) => {
    localStorage.clear();
    var u = {}; for (var i = 0; i <= 8; i++) u[i] = 1;
    var sp = {}; keys.forEach(function (k) { sp[k] = 1; });
    localStorage.setItem('mg_dex', JSON.stringify({ u: u, c: {}, sp: sp, stats: {}, ach: {}, col: {} }));
    localStorage.setItem('mg_ver', '1');
  }, SP_KEYS);
  await pB.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await pB.waitForTimeout(1500);
  await pB.mouse.click(210, 426);
  await pB.waitForTimeout(2000);
  await pB.screenshot({ path: path.join(__dirname, 'v122_claim_popups.png') });
  await pB.waitForTimeout(1800);
  await pB.evaluate(() => { MG.debug.openDex(); });
  await pB.waitForTimeout(400);
  await pB.screenshot({ path: path.join(__dirname, 'v122_dex_full.png') });
  const saved = await pB.evaluate(() => {
    var d = JSON.parse(localStorage.getItem('mg_dex') || '{}');
    return { col: d.col, chestTimer: MG.probe().chestTimer };
  });
  console.log('B colClaimed:', JSON.stringify(saved.col));
  await pB.close();

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
