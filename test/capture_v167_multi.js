// v167 多分辨率底部检查：确认道具区下方无色块
const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ executablePath: exe });

  // [标签, safeTop, 宽, 高]
  const cases = [
    ['A_420x780', null, 420, 780],
    ['B_407x885_capsule', 88, 407, 885],
    ['C_390x844', null, 390, 844],
    ['D_360x780', null, 360, 780],
    ['E_412x892_capsule', 88, 412, 892],
    ['F_320x568', null, 320, 568],
    ['G_800x480_land', null, 800, 480],
    ['H_500x1000_tall', null, 500, 1000],
  ];

  for (const [label, st, w, h] of cases) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (st != null) await page.addInitScript((s) => { window.__safeTop = s; }, st);
    await page.goto(base);
    await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
    const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight, oy: window.MG.probe().oy, renderOy: window.MG.probe().renderOy }));
    const s = Math.min(vb.iw / 420, vb.ih / 747);
    await page.mouse.click(210 * s, (426 + vb.oy) * s);
    await page.waitForTimeout(600);
    const stt = await page.evaluate(() => window.MG.probe().state);
    await page.screenshot({ path: require('path').resolve(__dirname, 'v167_multi_' + label + '.png') });
    console.log(label, 'viewport', w + 'x' + h, 's=' + s.toFixed(3), 'oy=' + vb.oy.toFixed(1), 'renderOy=' + vb.renderOy.toFixed(1), 'state=' + stt, 'errors=' + errors.length);
    await page.close();
  }

  await browser.close();
  console.log('完成');
})();
