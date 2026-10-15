// 综合验证：4 道具栏 / 水流交换 / 成就触发 / 图鉴页签 / 潮汐保底与统计
const { chromium } = require('playwright-core');
const path = require('path');

function l2c(p, s, bx) { // 逻辑坐标 → CSS 像素
  return { x: (bx + p.cx) * s, y: p.cy * s };
}

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
  await page.evaluate(() => { MG.start && MG.start(); });
  await page.waitForTimeout(500);

  // 逻辑→CSS 换算参数
  const conv = await page.evaluate(() => {
    const pr = MG.probe();
    const s = window.innerHeight / (pr.floorY + 74);
    return { s, bx: window.innerWidth / (2 * s) - 210 };
  });
  const P = () => page.evaluate(() => MG.probe());
  const clickL = async (lx, ly) => {
    await page.mouse.click((conv.bx + lx) * conv.s, ly * conv.s);
  };

  // ---- 1. 道具栏：4 个按钮含水流 ----
  let pr = await P();
  const flowBtn = pr.ui.skills.find(b => b.key === 'flow');
  if (!flowBtn || pr.ui.skills.length !== 4) { console.log('FAIL: skillbar', JSON.stringify(pr.ui.skills)); process.exit(1); }
  console.log('PASS: 道具栏 4 按钮，含水流');

  // ---- 2. 投两滴水（不同位置），等落定 ----
  await clickL(140, 300); await page.waitForTimeout(1100);
  await clickL(280, 300); await page.waitForTimeout(1800);
  pr = await P();
  if (pr.n < 2) { console.log('FAIL: drops n=' + pr.n); process.exit(1); }
  const drops = pr.bodies.filter(b => !b.iron && !b.chest).slice(0, 2);
  console.log('PASS: 两滴水就位', JSON.stringify(drops));

  // ---- 3. 水流交换：激活 → 选A → 选B → 位置互换 ----
  await page.evaluate(() => MG.debug.give('flow', 6));
  const fc = l2c(flowBtn, conv.s, conv.bx);
  await page.mouse.click(fc.x, fc.y);
  await page.waitForTimeout(200);
  pr = await P();
  if (!pr.modes.flow) { console.log('FAIL: flow mode not on'); process.exit(1); }
  const before = (await P()).bodies.slice(0, 2);
  await clickL(before[0].x, before[0].y); await page.waitForTimeout(150);
  pr = await P();
  if (!pr.modes.flow) { console.log('FAIL: flow mode lost after first pick'); process.exit(1); }
  await clickL(before[1].x, before[1].y); await page.waitForTimeout(150);
  pr = await P();
  if (pr.modes.flow) { console.log('FAIL: flow mode should be off after swap'); process.exit(1); }
  const after = pr.bodies.slice(0, 2);
  const dxa = Math.abs(after[0].x - before[1].x) + Math.abs(after[0].y - before[1].y);
  const dxb = Math.abs(after[1].x - before[0].x) + Math.abs(after[1].y - before[0].y);
  if (dxa > 30 || dxb > 30) { console.log('FAIL: swap mismatch', JSON.stringify({ before, after })); process.exit(1); }
  console.log('PASS: 水流交换成功（位置互换）');

  // ---- 4. 成就：bump chest 5 → 成就达成 ----
  await page.evaluate(() => { MG.debug.bump('chest', 5); MG.debug.achCheck(); });
  pr = await P();
  if (!pr.ach.chest5) { console.log('FAIL: achievement chest5 not done'); process.exit(1); }
  if (pr.stats.chest !== 5) { console.log('FAIL: stats.chest=' + pr.stats.chest); process.exit(1); }
  console.log('PASS: 成就达成（寻宝猎人）+ 统计累计');

  // ---- 5. 图鉴页签：打开 → 截图 → 切成就页 → 截图 ----
  const bc = l2c(pr.ui.book, conv.s, conv.bx);
  await page.mouse.click(bc.x, bc.y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v59_dex.png') });
  // 成就页签在面板左上第二个
  await page.mouse.click((conv.bx + 20 + 98 + 38) * conv.s, (64 + 10 + 13) * conv.s);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v59_ach.png') });
  // 点一个特殊滴格子再切回图鉴，确认说明框
  await page.mouse.click((conv.bx + 20 + 98 + 38) * conv.s, (64 + 10 + 13) * conv.s);
  await page.waitForTimeout(200);
  await page.mouse.click((conv.bx + 20 + 12 + 24) * conv.s, (64 + 452 + 40) * conv.s);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'v59_sp.png') });
  await page.mouse.click(40, 40); // 点面板外关闭
  await page.waitForTimeout(200);
  console.log('PASS: 图鉴/成就页签交互完成');

  // ---- 6. 潮汐保底与统计：强制无尽模式后强制退潮 ×3 ----
  await page.evaluate(() => MG.debug.forceEndless());
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => {
      const t = MG.probe().tideRef;
      t.phase = 'active'; t.timer = 0.01; t.progress = 1; t.banner = 0;
    });
    await page.waitForTimeout(300);
  }
  pr = await P();
  if (!(pr.stats.tide >= 3)) { console.log('FAIL: tide stat=' + pr.stats.tide); process.exit(1); }
  console.log('PASS: 潮汐退潮统计 + 退潮保底（事件延后）无报错，tide=' + pr.stats.tide);

  console.log('errors:', errors.length ? errors.join(' | ') : 'NONE');
  await browser.close();
  if (errors.length) process.exit(1);
  console.log('V59_ALL_PASS');
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
