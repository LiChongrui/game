// v122 补充：干净档图鉴收集度徽条初始态（0/25 空条+白色刻度）
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errs = [];
  const p = await browser.newPage({ viewport: { width: 420, height: 720 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.clear(); });
  await p.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(1500);
  await p.mouse.click(210, 426); // 开始进入局内
  await p.waitForTimeout(600);
  await p.evaluate(() => { MG.debug.openDex(); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, 'v122_dex_clean.png') });
  console.log('col:', JSON.stringify(await p.evaluate(() => MG.probe().col())));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
