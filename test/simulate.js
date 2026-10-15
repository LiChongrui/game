// 数值蒙特卡洛模拟器：headless 快进模拟 N 局（无渲染、rAF 空转），输出分布统计
// 用法：node simulate.js [局数，默认 50]
const { chromium } = require('playwright-core');
const path = require('path');
const N = parseInt(process.argv[2] || '50', 10);
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.error('PAGEERROR', String(e)));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { MG.debug.headless = true; });
  const results = await page.evaluate((N) => {
    const out = [];
    for (let g = 0; g < N; g++) {
      MG.debug.reset();
      let t = 0, maxTier = 0, dropTick = 0;
      while (MG.probe().state === 'play' && t < 600) {
        for (let s = 0; s < 30; s++) MG.debug.step(1 / 60); // 每 0.5s 模拟时间一批
        t += 0.5;
        if (++dropTick >= 2) { dropTick = 0; MG.debug.drop(20 + Math.random() * 380); }
        const pr = MG.probe();
        for (const b of pr.bodies) if (b.tier > maxTier) maxTier = b.tier;
      }
      const pr = MG.probe();
      out.push({ score: pr.score, dur: Math.round(t), maxTier, over: pr.state === 'over' });
    }
    return out;
  }, N);
  results.sort((a, b) => a.score - b.score);
  const q = p => results[Math.min(results.length - 1, (results.length * p) | 0)].score;
  const avgDur = results.reduce((s, r) => s + r.dur, 0) / results.length;
  const deaths = results.filter(r => r.over).length;
  const tierHist = {};
  results.forEach(r => tierHist[r.maxTier] = (tierHist[r.maxTier] || 0) + 1);
  console.log('games=' + N + ' deaths=' + deaths + '/' + N + ' avgDur=' + avgDur.toFixed(0) + 's');
  console.log('score p10=' + q(0.1) + ' p50=' + q(0.5) + ' p90=' + q(0.9) + ' max=' + results[results.length - 1].score);
  console.log('maxTier hist:', JSON.stringify(tierHist));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
