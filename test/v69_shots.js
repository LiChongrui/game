const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  // 1) 技能栏锁定态排版（累计 300 分：涟漪/蒸发/水流全锁）
  await page.evaluate(() => MG.debug.setLife(300));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v69_skilllock.png'), clip: { x: 0, y: 640, width: 420, height: 80 } });
  // 2) 图鉴 6 阶段全景条（累计 62000 → 海沟之眼当前高亮）
  await page.evaluate(() => MG.debug.setLife(62000));
  await page.waitForTimeout(400);
  await page.mouse.click(46, 688);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v69_dex6.png'), clip: { x: 0, y: 440, width: 420, height: 280 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
