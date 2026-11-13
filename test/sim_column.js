const path = require('path');
let chromium;
try { chromium = require('playwright-core').chromium; } catch (e) { console.error('需要 playwright-core'); process.exit(1); }

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

  const res = await page.evaluate(() => {
    const DT = 1 / 60;
    const X = 210;
    function watch(pr, dangerY) {
      let overN = 0, spSum = 0, spMax = 0, blocked = 0, maxDangerT = 0, edgeTop = null;
      for (const b of pr.bodies) {
        const top = b.y - b.r;
        if (top < dangerY) {
          overN++;
          const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          spSum += sp; if (sp > spMax) spMax = sp;
          if (sp >= 120) blocked++;
          if (b.dangerT > maxDangerT) maxDangerT = b.dangerT;
          if (edgeTop == null || top > edgeTop) edgeTop = top;
        }
      }
      return { overN: overN, spAvg: overN ? spSum / overN : 0, spMax: spMax, blocked: blocked, maxDangerT: maxDangerT, edgeTop: edgeTop };
    }

    function growCase(quietSeconds) {
      MG.debug.reset();
      const pr0 = MG.probe();
      const dangerY = pr0.dangerY;
      const log = [];
      MG.debug.setNext({ tier: 7 });
      MG.debug.drop(X);
      for (let k = 0; k < 90; k++) MG.debug.step(DT);
      const smalls = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1];
      for (let i = 0; i < smalls.length; i++) {
        MG.debug.setNext({ tier: smalls[i] });
        MG.debug.drop(X);
        for (let k = 0; k < 36; k++) MG.debug.step(DT);
        const pr = MG.probe();
        let pileTop = 1e9;
        for (const b of pr.bodies) pileTop = Math.min(pileTop, b.y - b.r);
        const w = watch(pr, dangerY);
        log.push({ i: i + 1, tier: smalls[i], n: pr.bodies.length, pileTop: Math.round(pileTop), overN: w.overN, edgeTop: w.edgeTop == null ? null : Math.round(w.edgeTop) });
      }
      const st = { overFrames: 0, blockedFrames: 0, maxDangerT: 0, bufferedAt: null, overAt: null, firstOverAt: null, edgeResets: 0, edgeTrace: [], frames: 0 };
      let prevEdge = null;
      const steps = Math.round(quietSeconds / DT);
      for (let k = 0; k < steps; k++) {
        MG.debug.step(DT);
        const pr = MG.probe();
        st.frames++;
        if (pr.state === 'over') { st.overAt = (k + 1) * DT; break; }
        const w = watch(pr, dangerY);
        if (w.overN > 0) { st.overFrames++; if (st.firstOverAt == null) st.firstOverAt = (k + 1) * DT; }
        if (w.blocked > 0) st.blockedFrames++;
        if (w.maxDangerT > st.maxDangerT) st.maxDangerT = w.maxDangerT;
        let anyGrace = false;
        for (const b of pr.bodies) if (b.grace > 2.9) anyGrace = true;
        if (anyGrace && st.bufferedAt == null) st.bufferedAt = (k + 1) * DT;
        if (w.edgeTop != null) {
          if (prevEdge != null && w.edgeTop > prevEdge + 1 && w.edgeTop >= dangerY) st.edgeResets++;
          prevEdge = w.edgeTop;
          if (k % 30 === 0) st.edgeTrace.push([Math.round((k + 1) * DT * 10) / 10, Math.round(w.edgeTop)]);
        } else prevEdge = null;
      }
      return { dangerY: dangerY, log: log, st: st, fuse: 3 };
    }

    function staticCase(seconds) {
      MG.debug.reset();
      const pr0 = MG.probe();
      const dangerY = pr0.dangerY;
      const floorY = pr0.floorY;
      const rs = [78, 21, 15, 28, 21, 15, 28, 21, 15, 28, 21, 15];
      let y = floorY;
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i];
        y -= r;
        MG.debug.spawn(i === 0 ? 7 : (r === 21 ? 1 : (r === 28 ? 2 : 0)), X, y);
        y -= r;
      }
      const st = { overFrames: 0, blockedFrames: 0, maxDangerT: 0, bufferedAt: null, overAt: null, firstOverAt: null, spAtRest: 0, edgeTrace: [] };
      const steps = Math.round(seconds / DT);
      let prevEdge = null;
      for (let k = 0; k < steps; k++) {
        MG.debug.step(DT);
        const pr = MG.probe();
        if (pr.state === 'over') { st.overAt = (k + 1) * DT; break; }
        const w = watch(pr, dangerY);
        if (w.overN > 0) { st.overFrames++; if (st.firstOverAt == null) st.firstOverAt = (k + 1) * DT; }
        if (w.blocked > 0) st.blockedFrames++;
        if (w.maxDangerT > st.maxDangerT) st.maxDangerT = w.maxDangerT;
        let anyGrace = false;
        for (const b of pr.bodies) if (b.grace > 2.9) anyGrace = true;
        if (anyGrace && st.bufferedAt == null) st.bufferedAt = (k + 1) * DT;
        if (w.edgeTop != null) {
          if (prevEdge != null && w.edgeTop > prevEdge + 1 && w.edgeTop >= dangerY) st.edgeResets = (st.edgeResets || 0) + 1;
          prevEdge = w.edgeTop;
          if (k % 60 === 0) st.edgeTrace.push([Math.round((k + 1) * DT * 10) / 10, Math.round(w.edgeTop)]);
        } else prevEdge = null;
      }
      const pr = MG.probe();
      const w = watch(pr, dangerY);
      st.spAtRest = Math.round(w.spAvg);
      st.finalOverN = w.overN;
      return { dangerY: dangerY, st: st };
    }

    function transitCase() {
      MG.debug.reset();
      const pr0 = MG.probe();
      const dangerY = pr0.dangerY;
      MG.debug.spawn(0, X, dangerY - 105);
      let maxDangerT = 0, over = false, overAt = null;
      for (let k = 0; k < 180; k++) {
        MG.debug.step(DT);
        const pr = MG.probe();
        if (pr.state === 'over') { over = true; overAt = (k + 1) * DT; break; }
        for (const b of pr.bodies) if (b.y - b.r < dangerY && b.dangerT > maxDangerT) maxDangerT = b.dangerT;
      }
      return { maxDangerT: Math.round(maxDangerT * 100) / 100, over: over, overAt: overAt };
    }

    const G = growCase(8);
    const H = staticCase(8);
    const J = transitCase();
    return { G, H, J };
  }, {});

  await browser.close();

  console.log('=== 叠罗汉越线无警示诊断 ===');
  console.log('判据：fuse = dangerTime = 3s（v368 起统一，潮汐/首次/复活后均同值）；警示条等价量 = maxDangerT / 3（>0.12 才显示）');
  console.log('');
  console.log('G 投放生长（大海打底 + 11 小滴同 x，0.55s 冷却）:');
  console.log('  #  档位  球数  pileTop  越线滴数  边缘滴top(负=线上方)');
  for (const r of res.G.log) {
    console.log('  ' + String(r.i).padStart(2) + '  t' + r.tier + '    ' + String(r.n).padStart(2) +
      '    ' + String(r.pileTop).padStart(4) + '   ' + String(r.overN).padStart(2) +
      '       ' + (r.edgeTop == null ? '—' : (r.edgeTop - res.G.dangerY)));
  }
  const g = res.G.st;
  console.log('  静置 8s：越线帧 ' + g.overFrames + '/' + g.frames +
    '，速度门堵死帧 ' + g.blockedFrames +
    '，maxDangerT ' + (Math.round(g.maxDangerT * 100) / 100) + 's（警示等价 ' + (Math.round(g.maxDangerT / 3 * 100) / 100) + '）' +
    '，缓冲 ' + (g.bufferedAt == null ? '未触发' : g.bufferedAt.toFixed(1) + 's') +
    '，判负 ' + (g.overAt == null ? '从未' : g.overAt.toFixed(1) + 's'));
  console.log('  边缘滴 top 轨迹（相对警戒线）: ' + g.edgeTrace.map(([t, v]) => t + 's:' + (v - res.G.dangerY)).join(' '));
  console.log('');
  const h = res.H.st;
  console.log('H 静态构造同终局（无下落冲击，8s）:');
  console.log('  越线帧 ' + h.overFrames +
    '，速度门堵死帧 ' + h.blockedFrames +
    '，maxDangerT ' + (Math.round(h.maxDangerT * 100) / 100) + 's（警示等价 ' + (Math.round(h.maxDangerT / 3 * 100) / 100) + '）' +
    '，缓冲 ' + (h.bufferedAt == null ? '未触发' : h.bufferedAt.toFixed(1) + 's') +
    '，判负 ' + (h.overAt == null ? '从未' : h.overAt.toFixed(1) + 's') +
    '，静置后越线滴均速 ' + h.spAtRest + 'px/s');
  console.log('  边缘滴 top 轨迹（相对警戒线）: ' + h.edgeTrace.map(([t, v]) => t + 's:' + (v - res.H.dangerY)).join(' '));
  console.log('');
  console.log('J 回归保护（非潮汐高速横穿，峰速约600px/s）: dangerT峰值 ' + res.J.maxDangerT + 's，判负 ' + (res.J.over ? '有@' + res.J.overAt.toFixed(1) + 's' : '无'));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
