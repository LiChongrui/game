// v99 验证：珊瑚浅海徽章改绿后的和谐度（进度条左端徽章 + 图鉴海域行）
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('PAGEERROR', e.message); });

  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1400);

  const btn = await page.evaluate(() => { const b = MG.debug.menuBtn(); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
  await page.mouse.click(btn.x, btn.y);
  await page.waitForTimeout(500);

  // 珊瑚浅海中段：进度条左端徽章应显绿色
  await page.evaluate(() => MG.debug.setLife(6500));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'v99_bar.png'), clip: { x: 0, y: 60, width: 420, height: 90 } });

  // 图鉴海域演进分节：点分节控件右半（dexSecRect(1) 中心）
  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(400);
  const seg = await page.evaluate(() => MG.debug.dexSecTab(1));
  await page.mouse.click(seg.x + seg.w / 2, seg.y + seg.h / 2);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'v99_dex.png') });

  console.log('页面错误:', errs);
  console.log(errs === 0 ? 'SHOTS OK' : 'SHOTS FAIL');
  await browser.close();
  process.exit(errs === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
