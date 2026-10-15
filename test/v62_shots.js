const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  // 每日页签
  await page.evaluate(() => { MG.probe(); });
  const bookBtn = { x: 46, y: 688 };
  await page.mouse.click(bookBtn.x, bookBtn.y);
  await page.waitForTimeout(300);
  // 每日 tab：DEX_PANEL x=20 y=64 → tabDaily x=178..244, y=74..100
  await page.mouse.click(210, 87);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(__dirname, 'v62_daily.png') });
  // 榜单 tab x=250..316
  await page.mouse.click(282, 87);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(__dirname, 'v62_rank.png') });
  // 关闭图鉴 → 打开分享卡片
  await page.mouse.click(370, 87); // 关闭按钮
  await page.waitForTimeout(200);
  await page.evaluate(() => MG.debug.share());
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v62_share.png') });
  await browser.close();
  console.log('SHOTS_OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
