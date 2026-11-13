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
  await page.evaluate(() => MG.debug.forceEndless());

  await page.evaluate(() => {
    const t = MG.probe().tideRef;
    t.phase = 'active'; t.timer = 9999; t.progress = 1; t.banner = 0;
  });
  const geo = await page.evaluate(() => ({ floorY: MG.probe().floorY, dangerY: MG.probe().dangerY }));
  const H = geo.floorY - 118;
  await page.evaluate(() => MG.debug.setLife(100));
  await page.waitForTimeout(300);
  const y0 = await page.evaluate(() => MG.debug.tideY());
  await page.evaluate(() => MG.debug.setLife(300100));
  await page.waitForTimeout(300);
  const y7 = await page.evaluate(() => MG.debug.tideY());
  console.log('潮面 y：潮汐池', y0.toFixed(1), '（期望', (geo.floorY - H / 4).toFixed(0) + '）',
    '→ 深渊王座', y7.toFixed(1), '（期望', (geo.dangerY + H / 4).toFixed(0) + '，警戒线', geo.dangerY + '）');
  const t1 = Math.abs(y0 - (geo.floorY - H / 4)) < 3 &&
             Math.abs(y7 - (geo.dangerY + H / 4)) < 3 &&
             y7 > geo.dangerY + 100;

  const kill = await page.evaluate(() => {
    MG.debug.headless = true;
    for (let i = 0; i < 40; i++) MG.debug.spawn(i % 4, 130 + (i % 2) * 80, 600 - i * 24);
    let t = 0, sawAlert = -1, trace = [];
    while (MG.probe().state === 'play' && t < 30) {
      for (let s = 0; s < 15; s++) MG.debug.step(1 / 60);
      t += 0.25;
      const p = MG.probe();
      if (p.tideRef.progress > 0.15 && p.dangerAlert > 0 && sawAlert < 0) {
        sawAlert = t;
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
