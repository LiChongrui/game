// v122 验证：图鉴收集度闭环
// ①干净档：图鉴页头收集度徽条渲染（0/25 空条+四个白色刻度）
// ②预置 25/25 全解锁老档：开局 1s 内自动补发全部里程碑（积分+充能弹条+称号+宝箱贺礼计时），徽条全金
const { chromium } = require('playwright-core');
const path = require('path');
const SP_KEYS = ['vortex','cloud','iron','ice','rune','rainbow','gale','magnet','spring','thunder','pearl','magma','geyser','void','aurora','chest'];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errs = [];

  // —— 场景 A：干净档 ——
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

  // —— 场景 B：25/25 全解锁老档（验证老存档自动补发） ——
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
  await pB.mouse.click(210, 426); // 开始
  await pB.waitForTimeout(2000);  // achTick 补发里程碑（弹条+宝箱贺礼计时）
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
