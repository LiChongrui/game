const path = require('path');
let chromium;
try { chromium = require('playwright-core').chromium; } catch (e) { console.error('需要 playwright-core'); process.exit(1); }
const SEA_AT = [0, 3000, 10000, 25000, 50000, 100000, 180000, 300000];
const TIER_NAMES = ['雾泡', '水滴', '露珠', '浪花', '溪流', '湖泊', '江河', '大海', '沧海'];
const TRACE = [
  [3, 8], [4, 5], [5, 2], [7, 0]
];

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
  catch (e1) {
    try { browser = await chromium.launch({ headless: true }); }
    catch (e2) { console.error('浏览器启动失败:', String(e1), String(e2)); process.exit(1); }
  }
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.error('PAGEERROR', String(e)));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { MG.debug.headless = true; });

  const rows = await page.evaluate(({ SEA_AT, TIER_NAMES, TRACE }) => {
    const out = [];
    const settle = 150;
    const tideSteps = 480;
    const postSteps = 360;
    for (let s = 0; s < SEA_AT.length; s++) {
      const tiers = [];
      for (let t = 0; t < 9; t++) {
        MG.debug.reset();
        MG.debug.setLife(SEA_AT[s]);
        MG.debug.spawn(t, 210, 640);
        for (let k = 0; k < settle; k++) MG.debug.step(1 / 60);
        const pr0 = MG.probe();
        const restTop = pr0.bodies[0].y - pr0.bodies[0].r;
        const tide = pr0.tideRef;
        tide.phase = 'active'; tide.timer = 8; tide.progress = 0;
        let minTop = restTop, maxDangerT = 0, over = false, overAt = null;
        let aboveRun = 0, maxAboveRun = 0;
        let wantTrace = TRACE.some(tr => tr[0] === s && tr[1] === t);
        let trace = [];
        for (let k = 0; k < tideSteps + postSteps; k++) {
          MG.debug.step(1 / 60);
          const pr = MG.probe();
          if (pr.bodies.length) {
            const b = pr.bodies[0];
            const top = b.y - b.r;
            if (top < minTop) minTop = top;
            if (b.dangerT > maxDangerT) maxDangerT = b.dangerT;
            if (top < pr.dangerY) { aboveRun++; if (aboveRun > maxAboveRun) maxAboveRun = aboveRun; }
            else aboveRun = 0;
            if (wantTrace && k % 60 === 0) trace.push({ t: (k / 60).toFixed(0), top: Math.round(top), dT: Math.round(b.dangerT * 100) / 100, prog: Math.round(pr.tide * 100) / 100 });
          }
          if (pr.state === 'over' && !over) { over = true; overAt = ((k + 1) / 60).toFixed(1); }
        }
        tiers.push({
          tier: t, name: TIER_NAMES[t], r: pr0.bodies[0].r,
          restTop: Math.round(restTop), minTop: Math.round(minTop),
          clear: Math.round(pr0.dangerY - minTop),
          maxDangerT: Math.round(maxDangerT * 100) / 100,
          maxAboveRun: Math.round(maxAboveRun / 60 * 10) / 10,
          over: over, overAt: overAt,
          trace: wantTrace ? trace : null
        });
      }
      const prw = MG.probe();
      out.push({ sea: s, at: SEA_AT[s], stageName: MG.debug.stage().name, dangerY: prw.dangerY, tiers: tiers });
    }
    return out;
  }, { SEA_AT, TIER_NAMES, TRACE });

  const wyRows = await page.evaluate((SEA_AT) => {
    const out = [];
    for (let s = 0; s < SEA_AT.length; s++) {
      MG.debug.reset();
      MG.debug.setLife(SEA_AT[s]);
      const pr0 = MG.probe();
      const tide = pr0.tideRef;
      tide.phase = 'active'; tide.timer = 8; tide.progress = 0;
      for (let k = 0; k < 120; k++) MG.debug.step(1 / 60);
      out.push({ sea: s, wyPeak: Math.round(MG.debug.tideY()) });
    }
    return out;
  }, SEA_AT);
  await browser.close();

  console.log('海域门槛: ' + SEA_AT.join(' / '));
  console.log('警戒线 dangerY=315，出生点 spawnY=260，容器底 floorY=765；潮汐引信=2.2s（dangerTime×2）');
  console.log('');
  console.log('海域        满潮wy  档位     峰值越线  最大dangerT  最长连续越线  判负');
  for (const r of rows) {
    const wy = wyRows[r.sea].wyPeak;
    for (const t of r.tiers) {
      console.log(
        ('sea' + r.sea + ' ' + r.stageName).padEnd(12) +
        String(wy).padStart(6) + '  ' +
        (t.name + '(' + t.r + ')').padEnd(10) +
        (t.clear > 0 ? '+' + t.clear : String(t.clear)).padStart(8) + '  ' +
        String(t.maxDangerT).padStart(8) + '  ' +
        String(t.maxAboveRun + 's').padStart(10) + '  ' +
        (t.over ? '是 @' + t.overAt + 's' : '否')
      );
    }
  }
  console.log('');
  console.log('=== 代表案时间线（每秒：top=顶部y / dT=dangerT / prog=潮位） ===');
  for (const r of rows) {
    for (const t of r.tiers) {
      if (!t.trace) continue;
      console.log('sea' + r.sea + ' ' + r.stageName + ' ' + t.name + '(r' + t.r + ') 峰值越线' + (t.clear > 0 ? '+' + t.clear : t.clear) + ' 最大dT=' + t.maxDangerT + ' 连续越线' + t.maxAboveRun + 's 判负' + (t.over ? '@' + t.overAt + 's' : '无'));
      for (const p of t.trace) console.log('  t=' + p.t + 's top=' + p.top + ' dT=' + p.dT + ' prog=' + p.prog);
    }
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
