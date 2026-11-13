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

  let st = await page.evaluate(() => MG.probe().state);
  console.log('初始状态:', st, '(期望 menu)');
  await page.screenshot({ path: path.join(__dirname, 'v95_menu.png') });

  const btn = await page.evaluate(() => { const b = MG.debug.menuBtn(); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
  await page.mouse.click(btn.x, btn.y);
  await page.waitForTimeout(600);
  st = await page.evaluate(() => MG.probe().state);
  console.log('点击开始后:', st, '(期望 play)');

  await page.evaluate(() => { for (let i = 0; i < 6; i++) MG.debug.drop(60 + i * 60); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'v95_play.png') });

  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v95_dex.png') });
  await page.evaluate(() => MG.debug.closeDex());

  await page.evaluate(() => MG.debug.over());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v95_over.png') });

  console.log('页面错误:', errs);
  console.log(errs === 0 ? 'SHOTS OK' : 'SHOTS FAIL');
  await browser.close();
  process.exit(errs === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
