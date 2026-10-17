// 宽屏（横屏显示器/浏览器窗口）专项：复现“道具区下方蓝色方块”
const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ executablePath: exe });

  async function shot(label, w, h, filename) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base);
    await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
    const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight, oy: window.MG.probe().oy, VH: window.MG.probe().VH }));
    const s = Math.min(vb.iw / 420, vb.ih / 747);
    const LW = vb.iw / s, BX = (LW - 420) / 2;
    // 用菜单按钮真实几何换算屏幕坐标点击（块坐标 + BX/renderOy 居中偏移），带重试
    for (let t = 0; t < 6; t++) {
      const st = await page.evaluate(() => window.MG.probe().state);
      if (st === 'play') break;
      const b = await page.evaluate(() => window.MG.debug.menuBtn());
      const oy = await page.evaluate(() => window.MG.probe().oy);
      await page.mouse.click((b.x + b.w / 2 + BX) * s, (b.y + b.h / 2 + oy) * s);
      await page.waitForTimeout(300);
    }
    const stt = await page.evaluate(() => window.MG.probe().state);
    await page.waitForTimeout(400);
    await page.screenshot({ path: require('path').resolve(__dirname, filename) });
    console.log(label, w + 'x' + h, 's=' + s.toFixed(3), 'VH=' + vb.VH.toFixed(1), 'BX=' + BX.toFixed(1), 'oy=' + vb.oy.toFixed(1), 'state=' + stt, 'errors=' + errors.length);
    await page.close();
  }

  await shot('宽屏_1280x800', 1280, 800, 'v167_wide_1280x800.png');
  await shot('宽屏_1920x1080', 1920, 1080, 'v167_wide_1920x1080.png');
  await shot('宽屏_1440x900', 1440, 900, 'v167_wide_1440x900.png');

  await browser.close();
  console.log('完成');
})();
