// v168 验证：宽屏/矮屏/高屏下道具区下方均无蓝色方块（海床两段式）
const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ executablePath: exe });

  // [标签, safeTop, 宽, 高]
  const cases = [
    ['宽屏_1920x1080', null, 1920, 1080],
    ['宽屏_1280x800', null, 1280, 800],
    ['标准_420x780', null, 420, 780],
    ['矮屏_320x568', null, 320, 568],
    ['长屏_407x885_capsule', 88, 407, 885],
    ['高屏_500x1000', null, 500, 1000],
  ];

  for (const [label, st, w, h] of cases) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (st != null) await page.addInitScript((s) => { window.__safeTop = s; }, st);
    await page.goto(base);
    await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
    const s = Math.min(w / 420, h / 747);
    const LW = w / s, BX = (LW - 420) / 2;
    for (let t = 0; t < 6; t++) {
      const stt = await page.evaluate(() => window.MG.probe().state);
      if (stt === 'play') break;
      const b = await page.evaluate(() => window.MG.debug.menuBtn());
      const oy = await page.evaluate(() => window.MG.probe().oy);
      await page.mouse.click((b.x + b.w / 2 + BX) * s, (b.y + b.h / 2 + oy) * s);
      await page.waitForTimeout(300);
    }
    const stt = await page.evaluate(() => window.MG.probe().state);
    await page.waitForTimeout(400);
    await page.screenshot({ path: require('path').resolve(__dirname, 'v168_' + label + '.png') });
    console.log(label, w + 'x' + h, 'state=' + stt, 'errors=' + errors.length);
    await page.close();
  }

  await browser.close();
  console.log('完成');
})();
