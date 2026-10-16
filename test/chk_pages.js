// 现状截图：成就页(3页签) + 图鉴页
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);

  await page.mouse.click(210, 426);
  await page.waitForTimeout(400);

  // 成就页 → 3 页签
  await page.mouse.click(24, 36);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'chk_ach0.png') });
  await page.mouse.click(72, 120); // 中间页签（每日）
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'chk_ach1.png') });
  await page.mouse.click(298, 120); // 榜单
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'chk_ach2.png') });

  // 图鉴
  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'chk_dex0.png') });
  await browser.close();
  console.log('CHK OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
