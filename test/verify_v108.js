// v108 验证：①宝箱改名（图鉴海域演进页文字） ②大滴内部新版水景（水面线+光柱+小鱼+气泡） ③高光呼吸（两帧对比）
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errs = [];

  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve('../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);
  await page.mouse.click(210, 426);
  await page.waitForTimeout(400);
  // 大滴内部水景
  await page.evaluate(() => { MG.debug.spawn(5, 140, 400); MG.debug.spawn(6, 280, 380); MG.debug.spawn(7, 210, 300); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'v108_play.png') });
  // 高光呼吸对比：间隔 1.2s 再拍一张（相位差约 2rad，透明度差肉眼可辨）
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'v108_play2.png') });
  // 图鉴 → 海域演进：宝箱改名
  await page.evaluate(() => { MG.debug.openDex(); });
  await page.waitForTimeout(300);
  await page.mouse.click(298, 120);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v108_dex.png') });
  await page.close();

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
