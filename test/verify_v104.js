// v104 验证：①成就页已达成文字不再压进度条 ②页签胶囊新样式 ③九档滴新配色
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve('../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);
  await page.mouse.click(210, 426); // 开始
  await page.waitForTimeout(400);

  // ① 成就页签（含已达成卡）：先给若干成就进度
  await page.evaluate(() => {
    MG.debug.setLife(5200); // 触发一些累计类进度
  });
  await page.waitForTimeout(300);
  await page.mouse.click(24, 36); // 奖杯钮
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v104_ach.png') });

  // ② 图鉴分节控件（合成链/海域演进 新胶囊样式）+ 合成链九档新配色
  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v104_dex0.png') });

  // 海域演进页签
  await page.mouse.click(298, 120);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v104_dex1.png') });
  await page.evaluate(() => MG.debug.closeDex());
  await page.waitForTimeout(200);

  // ③ 对局中真实水堆（新配色辨识度）：覆盖全 9 档
  const drops = [
    [0, 100], [1, 320], [2, 210], [3, 130], [4, 290],
    [1, 160], [2, 350], [3, 80], [4, 250], [5, 180],
    [2, 300], [3, 150], [6, 210],
  ];
  for (const [t, x] of drops) {
    await page.evaluate(([t, x]) => { MG.debug.setNext({ tier: t }); MG.debug.drop(x); }, [t, x]);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(2400);
  await page.screenshot({ path: path.join(__dirname, 'v104_play.png') });

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
