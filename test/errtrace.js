// 定位 bookBtn ReferenceError 的完整堆栈
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.error('PAGEERROR-STACK\n' + (e.stack || String(e))));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(2500);
  console.log('done');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
