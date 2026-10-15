// 性能探针 v2：维持满场压力 + CDP CPU 降速（6x 模拟中端安卓机）
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { MG.debug.forceEndless(); });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); // 中端安卓近似

  // 维持约 55 枚：每 800ms 补一次货
  const topup = setInterval(() => {
    page.evaluate(() => {
      const cur = MG.probe().n;
      const tiers = [0, 1, 2, 3, 4];
      for (let i = cur; i < 55; i++) {
        MG.debug.spawn(tiers[i % 5], 50 + (i % 8) * 45, 140 + ((i / 8) | 0) * 42);
      }
    }).catch(() => {});
  }, 800);

  await page.waitForTimeout(3000);
  const n = await page.evaluate(() => MG.probe().n);
  const stats = await page.evaluate(() => new Promise((res) => {
    const ds = []; let last = performance.now(), cnt = 0;
    function tick(t) {
      ds.push(t - last); last = t;
      if (++cnt < 240) requestAnimationFrame(tick);
      else {
        ds.sort((a, b) => a - b);
        const avg = ds.reduce((s, x) => s + x, 0) / ds.length;
        res({ avg, p50: ds[(ds.length * 0.5) | 0], p95: ds[(ds.length * 0.95) | 0], max: ds[ds.length - 1] });
      }
    }
    requestAnimationFrame(tick);
  }));
  clearInterval(topup);
  console.log('bodies~' + n + ' throttle=6x frameMs avg=' + stats.avg.toFixed(2) + ' p50=' + stats.p50.toFixed(2) + ' p95=' + stats.p95.toFixed(2) + ' max=' + stats.max.toFixed(2) + ' ~fps=' + Math.round(1000 / stats.avg));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
