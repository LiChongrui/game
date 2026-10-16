// v106 验证：①无礁石来袭弹字 ②宝箱新配色（对局+图鉴） ③成就页无重复标题+饰条 ④每日/榜单无独立文本+序号居中
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

  // ② 对局中掉一个宝箱看新配色（潮汐池里礁石也在）
  await page.evaluate(() => { MG.debug.setNext({ tier: 1, iron: true }); MG.debug.drop(130); });
  await page.waitForTimeout(700);
  await page.evaluate(() => { MG.debug.setNext({ tier: 2, iron: true }); MG.debug.drop(290); });
  await page.waitForTimeout(700);
  await page.evaluate(() => { MG.debug.chestNow(210); });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: path.join(__dirname, 'v106_play.png') });

  // ③④ 成就三页签
  await page.mouse.click(24, 36);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v106_ach.png') });
  await page.mouse.click(209, 120);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v106_daily.png') });
  await page.mouse.click(325, 120);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v106_rank.png') });

  // 图鉴里宝箱图标
  await page.evaluate(() => MG.debug.closeDex());
  await page.waitForTimeout(200);
  await page.evaluate(() => MG.debug.openDex());
  await page.waitForTimeout(300);
  await page.mouse.click(298, 120); // 海域演进
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v106_dex.png') });

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
