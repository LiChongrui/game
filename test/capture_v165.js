// v165 截图：验证 HUD 无叠压 + 彩虹滴显示正常
const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ executablePath: exe });

  async function shot(label, safeTop, w, h, filename) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    if (safeTop != null) await page.addInitScript((st) => { window.__safeTop = st; }, safeTop);
    await page.goto(base);
    await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
    const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
    const s = Math.min(vb.iw / 420, vb.ih / 747);
    await page.mouse.click(210 * s, 426 * s);
    await page.waitForTimeout(600);
    // 生成一颗彩虹滴供观察（通过调试接口直接设 special）
    await page.evaluate(() => {
      var b = window.MG.debug.spawn(0, 210, 250);
      if (b) { b.special = 'rainbow'; window.__rb = b; }
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: require('path').resolve(__dirname, filename) });
    await page.close();
  }

  await shot('Web-标准屏', null, 420, 780, 'v165_play_780.png');
  await shot('微信-长屏胶囊', 88, 407, 885, 'v165_play_980_capsule.png');

  await browser.close();
  console.log('截图完成');
})();
