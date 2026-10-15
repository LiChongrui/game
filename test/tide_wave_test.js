// 潮汐波浪水面验证：file:// 加载游戏，强制满潮，等过渡横幅消失后连拍确认波形
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const url = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
  await page.goto(url);
  await page.waitForTimeout(1000);

  await page.evaluate(() => { MG.start && MG.start(); });
  // 强制满潮（tideRef 为内部对象引用）
  await page.evaluate(() => {
    const t = MG.probe().tideRef;
    t.phase = 'active'; t.timer = 99; t.banner = 0; t.progress = 1;
  });
  // 等关卡横幅("进入无尽模式")淡出
  await page.waitForTimeout(3600);

  const pr = await page.evaluate(() => {
    const p = MG.probe();
    return { progress: p.tide, state: p.state };
  });

  // 连拍两帧（间隔 0.7s，水面波形应明显移动）
  await page.screenshot({ path: path.join(__dirname, 'tide_a.png') });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(__dirname, 'tide_b.png') });

  console.log('progress:', pr.progress, 'state:', pr.state);
  console.log('errors:', errors.length ? errors.join(' | ') : 'NONE');
  await browser.close();
  if (errors.length || pr.progress < 0.9) process.exit(1);
  console.log('TIDE_TEST_PASS');
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
