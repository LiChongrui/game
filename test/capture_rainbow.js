// 仅用于观察渲染现象：生成彩虹滴后连续抓取若干帧（不量像素，仅导出图片供肉眼看）
const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  await page.goto(base);
  await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
  const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
  const s = Math.min(vb.iw / 420, vb.ih / 747);
  await page.mouse.click(210 * s, 426 * s);
  await page.waitForTimeout(400);

  // 反复投放彩虹滴，让它落在堆里持续可见
  for (let i = 0; i < 6; i++) {
    await page.evaluate((x) => { window.MG.debug.setNext({ special: 'rainbow' }); window.MG.debug.drop(x); }, 150 + i * 30);
    await page.waitForTimeout(120);
  }
  // 再强制放一颗悬空的，便于看清标记
  await page.evaluate(() => { var b = window.MG.debug.spawn(3, 210, 300); b.special = 'rainbow'; b.frozen = 0; window.__rb = b; });
  await page.waitForTimeout(200);

  const dir = __dirname;
  for (let f = 0; f < 8; f++) {
    await page.screenshot({ path: dir + '/rb_frame_' + f + '.png' });
    await page.waitForTimeout(50);
  }
  console.log('captured rb_frame_0..7.png');
  await browser.close();
})();
