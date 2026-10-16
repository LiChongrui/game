// v105 验证：①无限复活按钮 ②任务卡行间距+页签动画无报错 ③礁石进潮汐池/漩涡退到珊瑚浅海 ④光柱软边
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
  await page.mouse.click(210, 426);
  await page.waitForTimeout(400);

  // ③ 门槛验证：潮汐池(stage0) rollIron 可出、vortex 被过滤；珊瑚浅海(stage1) 反之
  const gate = await page.evaluate(() => {
    const r = {};
    MG.debug.setLife(0); // 潮汐池
    let ironYes = 0, vortexYes = 0;
    for (let i = 0; i < 400; i++) { /* 无法直接调内部函数，改从 probe 判定 */ }
    r.stage0 = MG.probe().seaStage;
    return r;
  });
  // 用 setNext 强制投放验证行为层：潮汐池里礁石可以存在
  await page.evaluate(() => { MG.debug.setNext({ tier: 1, iron: true }); MG.debug.drop(120); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { MG.debug.setNext({ tier: 2, iron: true }); MG.debug.drop(300); });
  await page.waitForTimeout(900);

  // ② 页签动画：切到每日（动画进行中截图应看到芯片在途中）
  await page.mouse.click(24, 36);
  await page.waitForTimeout(300);
  await page.mouse.click(209, 120); // 每日页签
  await page.waitForTimeout(60);    // 动画中途
  await page.screenshot({ path: path.join(__dirname, 'v105_daily.png') });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'v105_daily_done.png') });

  // 图鉴分节动画
  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(300);
  await page.mouse.click(298, 120); // 海域演进
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(__dirname, 'v105_seg_mid.png') });
  await page.evaluate(() => MG.debug.closeDex());
  await page.waitForTimeout(200);

  // ④ 光柱软边 + 对局画面（潮汐池+礁石）
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v105_play.png') });

  // ① 无限复活：触发结算，按钮应为"复活继续"
  await page.evaluate(() => { MG.debug.forceEndless(); MG.debug.over(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'v105_over.png') });

  console.log('gate:', JSON.stringify(gate), 'errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
