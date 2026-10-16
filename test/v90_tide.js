// v91 验证：①潮位 1/4 设计（最矮距容器底 1/4、最高距警戒线 1/4 容器高，永不漫线）；
// ②潮期照常判负（堆高越线 + 潮期引信链路仍然致死）
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('PAGEERROR', e); });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => MG.debug.forceEndless()); // 潮汐仅无尽模式

  // ---- ① 潮位 1/4 设计：两端由几何决定，8 海域线性推进 ----
  await page.evaluate(() => {
    const t = MG.probe().tideRef;
    t.phase = 'active'; t.timer = 9999; t.progress = 1; t.banner = 0; // 满潮钉住
  });
  const geo = await page.evaluate(() => ({ floorY: MG.probe().floorY, dangerY: MG.probe().dangerY }));
  const H = geo.floorY - 118; // 容器高（containerTop=floorY-528 设计恒定）
  await page.evaluate(() => MG.debug.setLife(100)); // 潮汐池
  await page.waitForTimeout(300);
  const y0 = await page.evaluate(() => MG.debug.tideY());
  await page.evaluate(() => MG.debug.setLife(300100)); // 深渊王座
  await page.waitForTimeout(300);
  const y7 = await page.evaluate(() => MG.debug.tideY());
  console.log('潮面 y：潮汐池', y0.toFixed(1), '（期望', (geo.floorY - H / 4).toFixed(0) + '）',
    '→ 深渊王座', y7.toFixed(1), '（期望', (geo.dangerY + H / 4).toFixed(0) + '，警戒线', geo.dangerY + '）');
  const t1 = Math.abs(y0 - (geo.floorY - H / 4)) < 3 &&
             Math.abs(y7 - (geo.dangerY + H / 4)) < 3 &&
             y7 > geo.dangerY + 100; // 水面永远远低于警戒线

  // ---- ② 潮期判负链路存活：旧豁免代码会在潮期强制 dangerAlert=0；
  //      现在潮期堆出越线堆时 dangerAlert 必须能 >0（判负判定在潮期照常运行）----
  const kill = await page.evaluate(() => {
    MG.debug.headless = true; // 关闭 rAF 双跑，用 step 快进
    for (let i = 0; i < 40; i++) MG.debug.spawn(i % 4, 130 + (i % 2) * 80, 600 - i * 24);
    let t = 0, sawAlert = -1, trace = [];
    while (MG.probe().state === 'play' && t < 30) {
      for (let s = 0; s < 15; s++) MG.debug.step(1 / 60); // 每 0.25s 一批
      t += 0.25;
      const p = MG.probe();
      if (p.tideRef.progress > 0.15 && p.dangerAlert > 0 && sawAlert < 0) {
        sawAlert = t; // 潮期首次出现越线判负累积
      }
      if (Math.round(t * 4) % 4 === 0) {
        const top = p.bodies.length ? Math.min(...p.bodies.map(b => b.y - b.r)) : 999;
        trace.push('t=' + t.toFixed(1) + ' n=' + p.bodies.length + ' top=' + Math.round(top) + ' alert=' + p.dangerAlert.toFixed(2));
      }
    }
    const over = MG.probe().state === 'over';
    MG.debug.headless = false;
    return { sawAlert, over, t, trace };
  });
  console.log('潮期 dangerAlert 首次累积 t=' + kill.sawAlert + 's（<0 = 全程未累积）',
    '· 快进结束:', kill.over ? 'over（判负生效）' : '未判负');
  console.log('  ' + kill.trace.slice(0, 10).join(' | '));
  await page.screenshot({ path: path.join(__dirname, 'v91_tide_over.png') });

  const ok = t1 && kill.sawAlert > 0 && errs === 0;
  console.log('tideHeight:', t1 ? 'OK' : 'FAIL', ' tideJudge:', kill.sawAlert > 0 ? 'OK' : 'FAIL', ' errs:', errs);
  console.log(ok ? 'TIDE OK' : 'TIDE FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
