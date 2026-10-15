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
  // 1) 技能锁定渲染：累计 300 分 → ripple/evap/flow 均锁定，仅 swap 可用
  await page.evaluate(() => MG.debug.setLife(300));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v67_skilllock.png') });
  // 2) 图鉴海域全景条：累计 3500 → 珊瑚浅海，潮汐池已点亮
  await page.evaluate(() => MG.debug.setLife(3500));
  await page.waitForTimeout(400);
  await page.mouse.click(46, 688); // 图鉴
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v67_dex.png') });
  await page.mouse.click(370, 87); // 关闭
  await page.waitForTimeout(200);
  // 3) NG+ 入口与词缀选择弹窗
  await page.evaluate(() => MG.debug.ngUnlock());
  await page.waitForTimeout(200);
  await page.mouse.click(349, 688); // 渊按钮
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v67_ng.png') });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('SHOTS_OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
