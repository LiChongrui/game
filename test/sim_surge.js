// 深海涌泉抬升高度仿真（headless 快进，无渲染）——用户："深海涌泉力太大了，吹起的水滴太高了，可以减少一半的高度"
// 测量：混合堆 + 单滴落底两种局面下，涌泉事件（6s）中每滴的抬升峰值（静止顶部 → 最高顶部）
// 另记录堆顶抬升、是否越警戒线、是否判负。
// 能量模型参考：抬升高度 ≈ 作用区 ×(1+净上托/重力)；当前 作用区210 × (1+400/1500) ≈ 266px
// 用法：node sim_surge.js
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
    function surgeCase(spawnFn, seconds) {
      MG.debug.reset();
      MG.debug.setLife(25000); // 午夜深渊（事件与海域无关，取中段海域即可）
      spawnFn();
      for (let k = 0; k < 150; k++) MG.debug.step(DT); // 2.5s 静置成堆
      const pr0 = MG.probe();
      const dangerY = pr0.dangerY;
      const rest = pr0.bodies.map(b => b.y - b.r);
      const restPileTop = pr0.pileTop;
      MG.debug.forceEvent('surge');
      const steps = Math.round(seconds / DT);
      const minTops = rest.map(() => 1e9);
      let minPileTop = restPileTop, over = false, overAt = null, overN = 0;
      for (let k = 0; k < steps; k++) {
        MG.debug.step(DT);
        const pr = MG.probe();
        if (pr.state === 'over' && !over) { over = true; overAt = (k + 1) * DT; }
        // 按 x 距离匹配回同一滴（堆内基本不换位；取最近的静止位置）
        pr.bodies.forEach((b, i) => {
          if (i < minTops.length) {
            const top = b.y - b.r;
            if (top < minTops[i]) minTops[i] = top;
          }
        });
        if (pr.pileTop >= 0 && pr.pileTop < minPileTop) minPileTop = pr.pileTop;
        if (pr.pileTop < dangerY) overN++;
      }
      const rises = minTops.map((m, i) => Math.round(rest[i] - m));
      return {
        n: rest.length,
        rises: rises,
        maxRise: Math.max.apply(null, rises),
        pileRise: Math.round(restPileTop - minPileTop),
        overN: overN, over: over, overAt: overAt
      };
    }
    return {
      single: surgeCase(() => { MG.debug.spawn(3, 210, 700); }, 7), // 浪花单滴落底（r≈36）
      // 异档堆（0~7 各一滴，无同档合并干扰——合并反冲会额外甩高，污染高度测量）
      pile: surgeCase(() => {
        for (let t = 0; t < 8; t++) MG.debug.spawn(t, 60 + (t * 45) % 300, 480 + (t % 4) * 40);
      }, 7),
      // 混合堆（含同档位，合成反冲会额外抬升——真实对局参考）
      pileMix: surgeCase(() => {
        const tiers = [0, 1, 2, 0, 1, 2, 3, 1, 2, 0, 3, 2];
        for (let i = 0; i < tiers.length; i++) MG.debug.spawn(tiers[i], 60 + (i * 53) % 300, 500 + (i % 4) * 40);
      }, 7)
    };
  });
  await browser.close();

  console.log('=== 深海涌泉抬升高度仿真（事件全长 6s + 1s 收尾）===');
  console.log('单滴落底:   抬升峰值 ' + res.single.maxRise + 'px（静顶→最高顶），越线采样 ' + res.single.overN + '，判负 ' + (res.single.over ? '有@' + res.single.overAt.toFixed(1) + 's' : '无'));
  console.log('异档八滴堆: 逐滴抬升 ' + JSON.stringify(res.pile.rises));
  console.log('            最大抬升 ' + res.pile.maxRise + 'px，堆顶抬升 ' + res.pile.pileRise + 'px，越线采样 ' + res.pile.overN + '，判负 ' + (res.pile.over ? '有@' + res.pile.overAt.toFixed(1) + 's' : '无'));
  console.log('混合十二堆: 最大抬升 ' + res.pileMix.maxRise + 'px（含同档合成反冲），堆顶抬升 ' + res.pileMix.pileRise + 'px，越线采样 ' + res.pileMix.overN + '，判负 ' + (res.pileMix.over ? '有@' + res.pileMix.overAt.toFixed(1) + 's' : '无'));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
