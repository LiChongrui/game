// 潮汐越线仿真（headless，无渲染快进）——用户："水滴还是无法浮起到警戒线上面，请认真测试一下"
// 逐海域 × 逐档位：单滴静置落底 → 强制满潮 8s → 记录该滴浮到的最高点(top y)与警戒线的关系
// 另测每海域一个 12 滴混合堆：整堆作为筏子能抬多高、是否会被潮汐判负
// 用法：node sim_tide.js
const path = require('path');
let chromium;
try { chromium = require('playwright-core').chromium; } catch (e) { console.error('需要 playwright-core'); process.exit(1); }
const SEA_AT = [0, 3000, 10000, 25000, 50000, 100000, 180000, 300000];
const TIER_NAMES = ['雾泡', '水滴', '露珠', '浪花', '溪流', '湖泊', '江河', '大海', '沧海'];

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

  const rows = await page.evaluate(({ SEA_AT, TIER_NAMES }) => {
    const out = [];
    const settle = 150;   // 2.5s 静置
    const tideSteps = 480; // 8s 满潮
    for (let s = 0; s < SEA_AT.length; s++) {
      // ---- 单滴逐档位 ----
      const tiers = [];
      for (let t = 0; t < 9; t++) {
        MG.debug.reset();
        MG.debug.setLife(SEA_AT[s]);
        const b = MG.debug.spawn(t, 210, 640);
        for (let k = 0; k < settle; k++) MG.debug.step(1 / 60);
        const pr0 = MG.probe();
        const restTop = pr0.bodies[0].y - pr0.bodies[0].r;
        const tide = pr0.tideRef;
        tide.phase = 'active'; tide.timer = 8; tide.progress = 0;
        let minTop = restTop, over = false, overAt = null;
        for (let k = 0; k < tideSteps; k++) {
          MG.debug.step(1 / 60);
          const pr = MG.probe();
          if (pr.bodies.length) {
            const top = pr.bodies[0].y - pr.bodies[0].r;
            if (top < minTop) minTop = top;
          }
          if (pr.state === 'over' && !over) { over = true; overAt = (k + 1) / 60; }
        }
        tiers.push({
          tier: t, name: TIER_NAMES[t], r: b.r,
          restTop: Math.round(restTop), minTop: Math.round(minTop),
          clear: Math.round(pr0.dangerY - minTop), // >0 = 顶部越过警戒线
          over: over, overAt: overAt
        });
      }
      // ---- 12 滴混合堆（筏子效应）----
      MG.debug.reset();
      MG.debug.setLife(SEA_AT[s]);
      const pileTiers = [0, 1, 2, 0, 1, 2, 3, 1, 2, 0, 3, 2];
      for (let i = 0; i < pileTiers.length; i++) MG.debug.spawn(pileTiers[i], 60 + (i * 53) % 300, 500 + (i % 4) * 40);
      for (let k = 0; k < settle; k++) MG.debug.step(1 / 60);
      const pr0 = MG.probe();
      const restPileTop = pr0.pileTop;
      const tide = pr0.tideRef;
      tide.phase = 'active'; tide.timer = 8; tide.progress = 0;
      let minPileTop = restPileTop, pOver = false, pOverAt = null;
      for (let k = 0; k < tideSteps; k++) {
        MG.debug.step(1 / 60);
        const pr = MG.probe();
        if (pr.pileTop >= 0 && pr.pileTop < minPileTop) minPileTop = pr.pileTop;
        if (pr.state === 'over' && !pOver) { pOver = true; pOverAt = (k + 1) / 60; }
      }
      out.push({
        sea: s, at: SEA_AT[s],
        stageName: MG.debug.stage().name,
        tiers: tiers,
        pile: { restTop: Math.round(restPileTop), minTop: Math.round(minPileTop), clear: Math.round(pr0.dangerY - minPileTop), over: pOver, overAt: pOverAt }
      });
    }
    return out;
  }, { SEA_AT, TIER_NAMES });

  // wyPeak 修正：probe 里拿不到，直接用 tier0 记录值回填（每海域同水位）
  // （上面 evaluate 内 wyPeak 计算有占位，重新跑一遍轻量取水位）
  const wyRows = await page.evaluate((SEA_AT) => {
    const out = [];
    for (let s = 0; s < SEA_AT.length; s++) {
      MG.debug.reset();
      MG.debug.setLife(SEA_AT[s]);
      const pr0 = MG.probe();
      const tide = pr0.tideRef;
      tide.phase = 'active'; tide.timer = 8; tide.progress = 0;
      for (let k = 0; k < 120; k++) MG.debug.step(1 / 60); // 2s 到 progress=1
      out.push({ sea: s, wyPeak: Math.round(MG.debug.tideY()), stage: MG.debug.stage().name, dangerY: pr0.dangerY });
    }
    return out;
  }, SEA_AT);
  await browser.close();

  // ---- 输出 ----
  console.log('海域门槛: ' + SEA_AT.join(' / ') + '（共 ' + SEA_AT.length + ' 档）');
  console.log('警戒线 dangerY=315，出生点 spawnY=260，容器底 floorY=765');
  console.log('');
  console.log('海域        满潮水面wy  雾泡15  水滴21  露珠28  浪花36  溪流45  湖泊55  江河66  大海78  沧海92');
  for (const r of rows) {
    const wy = wyRows[r.sea].wyPeak;
    const cells = r.tiers.map(t => (t.clear > 0 ? '+' + t.clear : String(t.clear)).padStart(6));
    console.log(
      ('sea' + r.sea + ' ' + r.stageName).padEnd(12) +
      String(wy).padStart(6) + ' ' +
      cells.join(' ') +
      '  | 堆抬升' + (r.pile.restTop - r.pile.minTop) + 'px 堆越线' + (r.pile.clear > 0 ? '+' + r.pile.clear : r.pile.clear) +
      (r.pile.over ? ' 堆判负@' + r.pile.overAt.toFixed(1) + 's' : '')
    );
  }
  console.log('');
  console.log('单元格 = 该档位满潮时顶部距警戒线的 px（+=越线，-=线下）。单滴 8s 满潮仿真。');
  const anyOver = rows.some(r => r.tiers.some(t => t.over));
  console.log('单滴判负发生: ' + (anyOver ? '有' : '无'));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
