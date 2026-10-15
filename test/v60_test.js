// v60 验证：渐进加压 / 潮汐限定合成 / 高潮时刻 / 成就加成 / 图鉴 perk 显示
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGE: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  const url = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
  await page.goto(url);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForTimeout(900);
  await page.evaluate(() => { MG.start && MG.start(); MG.debug.forceEndless(); });
  await page.waitForTimeout(500);

  const P = () => page.evaluate(() => MG.probe());
  const wait = ms => page.waitForTimeout(ms);
  // 逻辑坐标 → CSS 像素
  const conv = await page.evaluate(() => {
    const pr = MG.probe();
    const s = window.innerHeight / (pr.floorY + 74);
    return { s, bx: window.innerWidth / (2 * s) - 210 };
  });
  const clickL = async (lx, ly) => page.mouse.click((conv.bx + lx) * conv.s, ly * conv.s);

  // ---- 1. 渐进加压：满档后退潮间隔应演进到 ~18s ----
  await page.evaluate(() => MG.debug.setRamp(1200)); // 20 分钟满档
  await wait(300);
  await page.evaluate(() => {
    const t = MG.probe().tideRef;
    t.phase = 'active'; t.timer = 0.01; t.progress = 1; t.banner = 0;
  });
  await wait(200);
  let pr = await P();
  console.log('ramp满档后退潮间隔 timer=', Math.round(pr.tideRef.timer * 10) / 10, '(应接近18)');
  if (!(pr.tideRef.timer <= 19)) { console.log('FAIL: tide interval not ramped'); process.exit(1); }
  console.log('PASS: 渐进加压（潮汐间隔 26→18 演进生效）');

  // ---- 2. 潮汐限定合成：两枚江河旱期不合，涨潮即合 ----
  await page.evaluate(() => {
    const t = MG.probe().tideRef;
    t.phase = 'idle'; t.progress = 0; t.timer = 99; t.banner = 0; // 明确旱期
    MG.debug.spawn(6, 150, 560);
    MG.debug.spawn(6, 215, 560);
  });
  await wait(1200);
  pr = await P();
  if (pr.bodies.filter(b => b.tier === 6).length !== 2) { console.log('FAIL: rivers not kept'); process.exit(1); }
  console.log('PASS: 旱期两枚江河保持不合（潮汐限定生效）');
  await page.screenshot({ path: path.join(__dirname, 'v60_gate.png') });
  await page.evaluate(() => {
    const t = MG.probe().tideRef;
    t.phase = 'active'; t.progress = 0.5; t.timer = 30; t.banner = 0;
  });
  await wait(600);
  pr = await P();
  if (pr.bodies.filter(b => b.tier === 6).length !== 0 || pr.bodies.filter(b => b.tier === 7).length !== 1) {
    console.log('FAIL: tide merge', JSON.stringify(pr.bodies)); process.exit(1);
  }
  console.log('PASS: 涨潮时江河聚成大海');

  // ---- 3. 高潮时刻：+500 分自动合并最高档对 ----
  await page.evaluate(() => {
    MG.debug.spawn(2, 120, 560);
    MG.debug.spawn(2, 170, 560);
    MG.debug.addScore(500);
  });
  await wait(1000);
  pr = await P();
  // 高潮时刻把两枚露珠(2)合并成一枚浪花(3)：t2 应为 0，t3 应为 1
  if (pr.bodies.filter(b => b.tier === 2).length !== 0 || pr.bodies.filter(b => b.tier === 3).length !== 1) {
    console.log('FAIL: climax', JSON.stringify(pr.bodies)); process.exit(1);
  }
  console.log('PASS: 高潮时刻自动合并（+500 分触发）');

  // ---- 4. 成就永久加成：grant 全部成就 → 合成仍正常 ----
  await page.evaluate(() => {
    ['canghai', 'combo6', 'chest5', 'tide12', 'iron5', 'rainbow5', 'quest12', 'score2k'].forEach(id => MG.debug.grant(id));
    MG.debug.spawn(3, 300, 560);
    MG.debug.spawn(3, 350, 560);
  });
  await wait(1200);
  pr = await P();
  if (pr.bodies.filter(b => b.tier === 4).length !== 1) { console.log('FAIL: perk-mode merge'); process.exit(1); }
  if (!pr.ach.combo6 || !pr.ach.canghai) { console.log('FAIL: ach not granted'); process.exit(1); }
  console.log('PASS: 成就授予后合成正常（加成路径无报错）');

  // ---- 5. 成就页截图（右侧应显示 perk 文案，全部金色已达成） ----
  pr = await P();
  await clickL(pr.ui.book.cx, pr.ui.book.cy);
  await wait(400);
  await clickL(20 + 98 + 38, 64 + 10 + 13); // 成就页签中心
  await wait(400);
  await page.screenshot({ path: path.join(__dirname, 'v60_ach.png') });
  await page.mouse.click(40, 40);
  await wait(200);

  console.log('errors:', errors.length ? errors.join(' | ') : 'NONE');
  await browser.close();
  if (errors.length) process.exit(1);
  console.log('V60_ALL_PASS');
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
