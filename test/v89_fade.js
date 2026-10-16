// v89 验证：海域切换渐变 —— 跨里程碑后背景色应在 ~1.8s 内平滑插值而非跳变
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 }, deviceScaleFactor: 1.5 });
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('PAGEERROR', e); });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);

  // 背景像素采样（canvas 背衬坐标，取左侧水域）
  const px = () => page.evaluate(() => {
    const c = document.querySelector('canvas');
    const x = c.getContext('2d');
    const d = x.getImageData(20, 200, 1, 1).data;
    return [d[0], d[1], d[2]];
  });
  const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

  // 归零累计分：开局局内分 S0 一般几百，totalScore = S0 仍处潮汐池（<3000）
  const s0 = await page.evaluate(() => { MG.debug.setLife(0); return MG.probe().score; });
  await page.waitForTimeout(2600); // 等可能残留的过渡彻底结束
  const stage0 = await page.evaluate(() => MG.debug.stage());
  const before = await px();

  // 跨过 3000 → 珊瑚浅海，渐变开始
  await page.evaluate(n => MG.debug.addScore(n), 3200 - s0);
  await page.waitForTimeout(80);
  const t0 = await px();           // 应仍接近旧色
  await page.waitForTimeout(500);
  const t05 = await px();          // 中途：与两端都有距离
  await page.waitForTimeout(700);
  const t12 = await px();
  await page.waitForTimeout(900);
  const t21 = await px();          // ~2.2s：应已收敛到新色
  const stage1 = await page.evaluate(() => MG.debug.stage());

  console.log('S0=', s0, ' stage:', stage0.i, '->', stage1.i);
  console.log('before', before, ' t0.08s', t0, ' t0.6s', t05, ' t1.3s', t12, ' t2.2s', t21);
  console.log('d(before,t0)=', dist(before, t0), ' d(t0,t05)=', dist(t0, t05), ' d(t05,t12)=', dist(t05, t12), ' d(t12,t21)=', dist(t12, t21), ' d(before,t21)=', dist(before, t21));

  // 断言：起点≈旧色不跳变、中途两段都在移动、末期收敛、净位移可见、过程无报错
  const ok = dist(before, t0) < 6 && dist(t0, t05) >= 3 && dist(t05, t12) >= 3 &&
             dist(t12, t21) < 8 && dist(before, t21) > 15 && errs === 0;
  await page.screenshot({ path: path.join(__dirname, 'v89_fade.png'), clip: { x: 0, y: 0, width: 420, height: 700 } });
  await browser.close();
  console.log(ok ? 'FADE OK' : 'FADE FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
