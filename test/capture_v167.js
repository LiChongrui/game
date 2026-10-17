// v167 截图：确认道具区下方蓝色方块背景已去除（底部为海床渐变，无色块）
const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ executablePath: exe });

  async function shot(safeTop, w, h, filename) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (safeTop != null) await page.addInitScript((st) => { window.__safeTop = st; }, safeTop);
    await page.goto(base);
    await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
    const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight, oy: window.MG.probe().oy }));
    const s = Math.min(vb.iw / 420, vb.ih / 747);
    await page.mouse.click(210 * s, (426 + vb.oy) * s); // 开始按钮（块内 210,426 + 居中偏移 oy）
    await page.waitForTimeout(700);
    await page.screenshot({ path: require('path').resolve(__dirname, filename) });
    console.log(filename, 'errors:', errors.length);
    await page.close();
  }

  await shot(null, 420, 780, 'v167_play_780.png');
  await shot(88, 407, 885, 'v167_play_980_capsule.png');

  await browser.close();
  console.log('截图完成');
})();
