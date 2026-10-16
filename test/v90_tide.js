// v90 验证：①潮位随海域上涨；②潮汐浮起越线可致死（不再豁免）
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('PAGEERROR', e); });
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => MG.debug.forceEndless()); // 潮汐仅无尽模式

  // ---- ① 潮位随海域上涨 ----
  await page.evaluate(() => {
    const t = MG.probe().tideRef;
    t.phase = 'active'; t.timer = 999; t.progress = 1; t.banner = 0; // 满潮钉住
  });
  await page.evaluate(() => MG.debug.setLife(0));       // 潮汐池
  await page.waitForTimeout(300);
  const y0 = await page.evaluate(() => MG.debug.tideY());
  await page.evaluate(() => MG.debug.setLife(310000));  // 深渊王座
  await page.waitForTimeout(300);
  const y7 = await page.evaluate(() => MG.debug.tideY());
  const dangerY = await page.evaluate(() => MG.probe().dangerY);
  console.log('潮面 y：潮汐池', y0.toFixed(1), '→ 深渊王座', y7.toFixed(1), '（警戒线', dangerY + '）');
  const t1 = y7 < y0 - 100 && y7 < dangerY + 30 && y0 > dangerY + 100;

  // ---- ② 潮汐浮起越线致死（深渊王座满潮，潮面 y7 已贴近警戒线）----
  await page.evaluate(() => {
    // 清掉海域演进弹窗期，投几枚大滴进满潮水里，浮起后顶部将越过警戒线
    MG.debug.spawn(3, 120, 320);
    MG.debug.spawn(3, 210, 340);
    MG.debug.spawn(3, 300, 320);
  });
  let over = false, waited = 0;
  while (waited < 45000) {
    await page.waitForTimeout(1500); waited += 1500;
    const st = await page.evaluate(() => ({ state: MG.probe().state, n: MG.probe().n }));
    if (st.state === 'over') { over = true; break; }
  }
  console.log('满潮浮起', waited / 1000 + 's 后状态:', over ? 'over（判负生效）' : '未判负');
  await page.screenshot({ path: path.join(__dirname, 'v90_tide_over.png') });

  const ok = t1 && over && errs === 0;
  console.log('tideHeight:', t1 ? 'OK' : 'FAIL', ' tideKill:', over ? 'OK' : 'FAIL', ' errs:', errs);
  console.log(ok ? 'TIDE OK' : 'TIDE FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
