const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  // 抬累计分让海域演进进度可见（珊瑚浅海 3000 门槛）
  await page.evaluate(() => MG.debug.setLife(2400));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v64_hud.png') }); // HUD 常驻海域称号
  await page.mouse.click(46, 688); // 图鉴
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v64_dex.png') }); // 图鉴头部演进进度
  await page.mouse.click(370, 87); // 关闭
  await page.waitForTimeout(200);
  await page.evaluate(() => MG.debug.share());
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v64_share.png') }); // 分享卡片新排版
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('SHOTS_OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
