// v98 验证：海域进度条配色（填充=当前海域深水色，右端圆点=下一海域色）多海域截图
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
  console.log('状态:', await page.evaluate(() => MG.probe().state), '(期望 play)');

  // 海域 0（潮汐池）中段 + 邻近下一海域
  for (const [name, score] of [['s0_mid', 1500], ['s1_mid', 6500], ['s3_mid', 37000], ['s6_mid', 240000]]) {
    await page.evaluate(sc => { MG.debug.setLife(sc); }, score);
    await page.waitForTimeout(900);
    const st = await page.evaluate(() => MG.probe().seaStage);
    await page.screenshot({ path: path.join(__dirname, `v98_bar_${name}.png`), clip: { x: 0, y: 60, width: 420, height: 90 } });
    console.log(name, '-> seaStage', st);
  }
  console.log('页面错误:', errs);
  console.log(errs === 0 ? 'SHOTS OK' : 'SHOTS FAIL');
  await browser.close();
  process.exit(errs === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
