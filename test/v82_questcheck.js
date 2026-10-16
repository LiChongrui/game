const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  const readQuest = () => page.evaluate(() => (function(){ try { return MG.probe().questText || null; } catch(e){ return null; } })());
  // 直接读内部 quest 文本：通过渲染层不可行，改用截图对比
  await page.evaluate(() => MG.debug.addScore(48000));
  await page.waitForTimeout(5200); // 等滞留刷新（4s 计时）
  await page.screenshot({ path: path.join(__dirname, 'v82_quest.png'), clip: { x: 0, y: 0, width: 420, height: 130 } });
  console.log('errors:', errors.length ? errors : 'NONE');
  await browser.close();
  console.log('OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
