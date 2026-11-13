const path = require('path');
let chromium;
try { chromium = require('playwright-core').chromium; } catch (e) { console.error('需要 playwright-core'); process.exit(1); }
const SEA_AT = [0, 3000, 10000, 25000, 50000, 100000, 180000, 300000];

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

  const res = await page.evaluate(({ SEA_AT }) => {
    const DT = 1 / 60;
    function pin(tide) { tide.phase = 'active'; tide.timer = 8; tide.progress = 1; }

    function tideCase(sea, spawnFn, seconds) {
      MG.debug.reset();
      MG.debug.setLife(SEA_AT[sea]);
      const bodies0 = spawnFn();
      for (let k = 0; k < 150; k++) MG.debug.step(DT);
      const pr0 = MG.probe();
      const dangerY = pr0.dangerY;
      const tide = pr0.tideRef;
      tide.phase = 'active'; tide.timer = 8; tide.progress = 0;
      const st = { overN: 0, spSum: 0, spMax: 0, blocked: 0, slow: 0, maxDangerT: 0, bufferedAt: null, overAt: null, firstOverAt: null };
      const steps = Math.round(seconds / DT);
      for (let k = 0; k < steps; k++) {
        MG.debug.step(DT);
        pin(tide);
        const pr = MG.probe();
        if (pr.state === 'over') { if (st.overAt == null) st.overAt = (k + 1) * DT; break; }
        let anyGrace = false;
        for (const b of pr.bodies) {
          if (b.grace > 2.9) anyGrace = true;
          const top = b.y - b.r;
          if (top < dangerY) {
            if (st.firstOverAt == null) st.firstOverAt = (k + 1) * DT;
            const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            st.overN++; st.spSum += sp; if (sp > st.spMax) st.spMax = sp;
            if (sp >= 120) st.blocked++; else st.slow++;
            if (b.dangerT > st.maxDangerT) st.maxDangerT = b.dangerT;
          }
        }
        if (anyGrace && st.bufferedAt == null) st.bufferedAt = (k + 1) * DT;
      }
      st.spAvg = st.overN ? st.spSum / st.overN : 0;
      return { n0: bodies0, st: st };
    }

    function transitCase() {
      MG.debug.reset();
      MG.debug.setLife(SEA_AT[7]);
      const pr0 = MG.probe();
      const dangerY = pr0.dangerY;
      MG.debug.spawn(0, 210, dangerY - 105);
      let maxDangerT = 0, maxSpOver = 0, over = false, overAt = null, overN = 0;
      for (let k = 0; k < 180; k++) {
        MG.debug.step(DT);
        const pr = MG.probe();
        if (pr.state === 'over') { over = true; overAt = (k + 1) * DT; break; }
        for (const bb of pr.bodies) {
          const top = bb.y - bb.r;
          if (top < dangerY) {
            const sp = Math.sqrt(bb.vx * bb.vx + bb.vy * bb.vy);
            overN++; if (sp > maxSpOver) maxSpOver = sp;
            if (bb.dangerT > maxDangerT) maxDangerT = bb.dangerT;
          }
        }
      }
      return { maxDangerT: Math.round(maxDangerT * 100) / 100, maxSpOver: Math.round(maxSpOver), overN: overN, over: over, overAt: overAt };
    }

    const A = tideCase(7, () => { const b = MG.debug.spawn(0, 210, 640); return [b.r]; }, 15);
    const B = tideCase(7, () => {
      const pileTiers = [0, 1, 2, 0, 1, 2, 3, 1, 2, 0, 3, 2];
      const rs = [];
      for (let i = 0; i < pileTiers.length; i++) rs.push(MG.debug.spawn(pileTiers[i], 60 + (i * 53) % 300, 500 + (i % 4) * 40).r);
      return rs;
    }, 15);
    const C = tideCase(6, () => { const b = MG.debug.spawn(8, 210, 640); return [b.r]; }, 15);
    const D = transitCase();

    const E = (function () {
      MG.debug.reset();
      MG.debug.setLife(SEA_AT[7]);
      MG.debug.spawn(0, 210, 640);
      for (let k = 0; k < 150; k++) MG.debug.step(DT);
      const pr0 = MG.probe();
      const dangerY = pr0.dangerY;
      const tide = pr0.tideRef;
      tide.phase = 'active'; tide.timer = 8; tide.progress = 0;
      const trace = [];
      let minTop = 1e9, maxTopAfterFloat = -1e9, floatStarted = false;
      for (let k = 0; k < 900; k++) {
        MG.debug.step(DT);
        pin(tide);
        const pr = MG.probe();
        const top = pr.bodies.length ? pr.bodies[0].y - pr.bodies[0].r : null;
        if (top == null) continue;
        if (k % 12 === 0) trace.push([Math.round((k + 1) * DT * 10) / 10, Math.round(top)]);
        if (top < dangerY) { floatStarted = true; }
        if (floatStarted) { if (top < minTop) minTop = top; if (top > maxTopAfterFloat) maxTopAfterFloat = top; }
      }
      return { dangerY: dangerY, minTop: Math.round(minTop), maxTopAfterFloat: Math.round(maxTopAfterFloat), trace: trace };
    })();
    const F = (function () {
      function natural(sea, spawnFn, seconds) {
        MG.debug.reset();
        MG.debug.setLife(SEA_AT[sea]);
        spawnFn();
        for (let k = 0; k < 150; k++) MG.debug.step(DT);
        const pr0 = MG.probe();
        const dangerY = pr0.dangerY;
        const tide = pr0.tideRef;
        tide.phase = 'active'; tide.timer = 8; tide.progress = 0;
        let overAt = null, bufferedAt = null, firstOverAt = null, tideStarts = 1, prevPhase = 'active';
        const steps = Math.round(seconds / DT);
        for (let k = 0; k < steps; k++) {
          MG.debug.step(DT);
          const pr = MG.probe();
          if (pr.tideRef.phase === 'active' && prevPhase !== 'active') tideStarts++;
          prevPhase = pr.tideRef.phase;
          if (pr.state === 'over') { overAt = (k + 1) * DT; break; }
          let anyGrace = false, anyOver = false;
          for (const b of pr.bodies) {
            if (b.grace > 2.9) anyGrace = true;
            if (b.y - b.r < dangerY) anyOver = true;
          }
          if (anyOver && firstOverAt == null) firstOverAt = (k + 1) * DT;
          if (anyGrace && bufferedAt == null) bufferedAt = (k + 1) * DT;
        }
        return { overAt: overAt, bufferedAt: bufferedAt, firstOverAt: firstOverAt, tideStarts: tideStarts };
      }
      return {
        single: natural(7, () => { MG.debug.spawn(0, 210, 640); }, 50),
        pile: natural(7, () => {
          const pileTiers = [0, 1, 2, 0, 1, 2, 3, 1, 2, 0, 3, 2];
          for (let i = 0; i < pileTiers.length; i++) MG.debug.spawn(pileTiers[i], 60 + (i * 53) % 300, 500 + (i % 4) * 40);
        }, 50)
      };
    })();
    return { A, B, C, D, E, F };
  }, { SEA_AT });

  await browser.close();

  function row(name, r) {
    const st = r.st;
    const pct = st.overN ? Math.round(100 * st.blocked / st.overN) : 0;
    return [
      name.padEnd(14),
      ('越线采样 ' + st.overN).padStart(12),
      ('均速 ' + Math.round(st.spAvg)).padStart(10),
      ('峰速 ' + Math.round(st.spMax)).padStart(10),
      ('高速采样 ' + pct + '%').padStart(14),
      ('dangerT峰值 ' + (Math.round(st.maxDangerT * 10) / 10) + 's').padStart(16),
      ('首越线 ' + (st.firstOverAt == null ? '未越线' : st.firstOverAt.toFixed(1) + 's')).padStart(14),
      ('缓冲 ' + (st.bufferedAt == null ? '未触发' : st.bufferedAt.toFixed(1) + 's')).padStart(12),
      ('判负 ' + (st.overAt == null ? '从未' : st.overAt.toFixed(1) + 's')).padStart(12)
    ].join(' ');
  }

  console.log('=== 潮汐越线判负诊断 ===');
  console.log('引信：v368 起统一 dangerTime = 3s（潮汐 / 首次越线 / 复活后均同值）；v326 起非潮汐同潮汐——越线即计时、不看速度');
  console.log('（瞬时横穿由出生宽限 0.6s + 引信 1.1s + 出线即清零三重区分，见 sim_column.js J 案回归）');
  console.log('（A/B/C 钉住满潮 15s 测引信与缓冲时序；D 验非潮汐快速横穿不误伤；F 验自然潮周期）');
  console.log('');
  console.log(row('A sea7单滴雾泡', res.A));
  console.log(row('B sea7十二滴堆', res.B));
  console.log(row('C sea6单滴沧海', res.C));
  console.log('');
  console.log('D 非潮汐高速横穿（线上方120px自由落体，峰速约600px/s）:');
  console.log('  越线采样 ' + res.D.overN + ' 次，峰速 ' + res.D.maxSpOver + 'px/s，dangerT峰值 ' + res.D.maxDangerT + 's，判负 ' + (res.D.over ? '有@' + res.D.overAt.toFixed(1) + 's' : '无'));
  console.log('');
  console.log('F 自然潮周期 50s（sea7，首潮 t=0 强制开启，之后自然；间隔约 16s）:');
  for (const [k, v] of [['单滴雾泡', res.F.single], ['十二滴堆', res.F.pile]]) {
    console.log('  ' + k.padEnd(6) +
      ' 首越线 ' + (v.firstOverAt == null ? '未越线' : v.firstOverAt.toFixed(1) + 's') +
      ' 缓冲 ' + (v.bufferedAt == null ? '未触发' : v.bufferedAt.toFixed(1) + 's') +
      ' 判负 ' + (v.overAt == null ? '从未（50s 内）' : v.overAt.toFixed(1) + 's') +
      ' 经历潮次 ' + v.tideStarts);
  }
  console.log('');
  console.log('E sea7单滴雾泡 top(t) 轨迹（dangerY=' + res.E.dangerY + '，浮起后 top 范围 ' + res.E.minTop + ' ~ ' + res.E.maxTopAfterFloat + '，即线下最深 ' + (res.E.maxTopAfterFloat - res.E.dangerY) + 'px）:');
  const line = [];
  for (const [t, top] of res.E.trace) line.push(t + 's:' + top);
  for (let i = 0; i < line.length; i += 10) console.log('  ' + line.slice(i, i + 10).join('  '));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
