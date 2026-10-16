// 诊断：为何 8/8 全死。逐局记录死亡时间、死亡前堆顶三球状态、failReason 相关线索
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.error('PAGEERROR', String(e)));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { MG.debug.headless = true; });
  const noGate = process.argv.includes('--nogate');
  if (noGate) await page.evaluate(() => { MG.config.spawnGate = [0, 0, 0, 0, 0]; MG.config.specialGate = {}; });
  const out = await page.evaluate(() => {
    const log = [];
    for (let g = 0; g < 3; g++) {
      MG.debug.reset();
      let t = 0, dropTick = 0, lastSnap = null, deathT = -1;
      while (MG.probe().state === 'play' && t < 600) {
        for (let s = 0; s < 30; s++) MG.debug.step(1 / 60);
        t += 0.5;
        if (++dropTick >= 2) { dropTick = 0; MG.debug.drop(20 + Math.random() * 380); }
        const pr = MG.probe();
        // 记录最顶上三颗球
        const tops = pr.bodies.slice().sort((a, b) => (a.y - a.r) - (b.y - b.r)).slice(0, 3)
          .map(b => ({ t: b.tier, top: b.y - b.r, y: b.y, r: b.r }));
        lastSnap = { pileTop: Math.round(pr.pileTop), dangerY: Math.round(pr.dangerY), n: pr.n, tops };
        if (pr.state !== 'play') { deathT = t; break; }
      }
      log.push({ game: g, dur: deathT > 0 ? deathT : t, died: deathT > 0, score: MG.probe().score, lastSnap });
    }
    return log;
  });
  for (const g of out) {
    console.log('game', g.game, 'dur=' + g.dur + 's died=' + g.died + ' score=' + g.score,
      'pileTop=' + g.lastSnap.pileTop, 'dangerY=' + g.lastSnap.dangerY, 'n=' + g.lastSnap.n);
    console.log('  tops:', JSON.stringify(g.lastSnap.tops));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
