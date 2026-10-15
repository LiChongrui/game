// v62 综合验证：每日任务 / 好友榜 / 战报分享 / 首局引导 / 乘区封顶 / 海域演进
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // 独立存储（不污染手工进度）：只在首次导航清一次（reload 不清，否则进度测试失效）
  await page.addInitScript(() => {
    if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); }
  });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);

  const P = () => page.evaluate(() => MG.probe());
  const D = () => page.evaluate(() => MG.debug);

  // ---- 1. 每日任务：种子生成 3 项 + 进度 + 全勤 ----
  let st = await P();
  if (!st.daily || st.daily.done.length !== 3) { console.log('FAIL: daily tasks', JSON.stringify(st.daily)); process.exit(1); }
  console.log('PASS: 每日任务已生成 3 项（连续 ' + st.daily.streak + ' 天）');
  // 直接喂合成进度：任选任务里的 merge tier 喂满
  await page.evaluate(() => {
    const d = MG.debug.dailyState();
    for (let i = 0; i < 3; i++) {
      const t = d.tasks[i];
      if (t.type === 'merge') MG.debug.dailyProg('merge', t.tier, t.need);
      else if (t.type === 'combo') MG.debug.dailyProg('combo', 0, t.need);
      else MG.debug.dailyProg(t.type, 0, t.need);
    }
  });
  await page.waitForTimeout(300);
  st = await P();
  if (!(st.daily.done[0] && st.daily.done[1] && st.daily.done[2])) { console.log('FAIL: 全勤判定', JSON.stringify(st.daily)); process.exit(1); }
  if (st.daily.streak !== 1) { console.log('FAIL: streak 应为 1，实际 ' + st.daily.streak); process.exit(1); }
  console.log('PASS: 三项全勤 → 连续天数 +1，奖励分已入账（score=' + st.score + '）');
  // 刷新后同日不重置、次日种子不同
  const tasksA = await page.evaluate(() => MG.debug.dailyState().tasks.map(t => t.text));
  await page.reload(); await page.waitForTimeout(1200);
  const d2 = await page.evaluate(() => MG.debug.dailyState());
  const tasksB = d2.tasks.map(t => t.text);
  if (JSON.stringify(tasksA) !== JSON.stringify(tasksB)) { console.log('FAIL: 同日任务重载后变化'); process.exit(1); }
  if (!(d2.done[0] && d2.done[1] && d2.done[2])) { console.log('FAIL: 同日进度未持久化'); process.exit(1); }
  console.log('PASS: 同日刷新任务与进度均持久化');

  // ---- 2. 榜单：好友榜含我且按分排序 ----
  const board = await page.evaluate(() => MG.debug.board());
  if (board.length !== 7 || !board.some(r => r.me)) { console.log('FAIL: 榜单', JSON.stringify(board)); process.exit(1); }
  for (let i = 1; i < board.length; i++) if (board[i - 1].score < board[i].score) { console.log('FAIL: 榜单未排序'); process.exit(1); }
  console.log('PASS: 好友榜 7 行（含我）、按分降序');

  // ---- 3. 分享：文案生成 + 复制不报错 ----
  const shareText = await page.evaluate(() => MG.debug.share());
  if (!/水滴成海/.test(shareText) || !/\d+ 分/.test(shareText)) { console.log('FAIL: 分享文案', shareText); process.exit(1); }
  await page.evaluate(() => MG.debug.shareCopy());
  await page.waitForTimeout(200);
  console.log('PASS: 战报文案生成并复制无报错 → ' + shareText.slice(0, 40) + '…');
  // 关闭分享（点面板外）
  await page.mouse.click(210, 40);
  await page.waitForTimeout(150);

  // ---- 4. 乘区封顶：cm() 上限生效 + 真实合成收益正常 ----
  await page.evaluate(() => { MG.debug.forceEndless(); });
  const capped = await page.evaluate(() => MG.debug.cm(1e9));
  if (capped !== 8) { console.log('FAIL: 乘区上限应为 8，实际 ' + capped); process.exit(1); }
  const small = await page.evaluate(() => MG.debug.cm(3));
  if (small !== 3) { console.log('FAIL: 低倍率不应被截断'); process.exit(1); }
  console.log('PASS: 乘区封顶 cm(1e9)=8，低倍率不截断');
  // 真实合成一次：两枚雾泡相碰
  const before = (await P()).score;
  await page.evaluate(() => { MG.debug.spawn(0, 190, 560); MG.debug.spawn(0, 215, 560); });
  await page.waitForTimeout(1200);
  const after = (await P()).score;
  if (!(after > before)) { console.log('FAIL: 真实合成收益异常', before, after); process.exit(1); }
  console.log('PASS: 真实合成收益正常入账（+' + (after - before) + '）');

  // ---- 5. 海域演进：setLife 抬累计分 → 阶段跳变 ----
  await page.evaluate(() => MG.debug.setLife(12000));
  await page.waitForTimeout(600);
  st = await P();
  if (st.stage < 2) { console.log('FAIL: stage 应 ≥2，实际 ' + st.stage); process.exit(1); }
  const name = await page.evaluate(() => MG.debug.stage().name);
  console.log('PASS: 海域演进 → 「' + name + '」（stage=' + st.stage + '）');
  await page.screenshot({ path: path.join(__dirname, 'v62_stage.png') });

  // ---- 6. 首局引导：dropCount<5 显示、≥5 结束并持久化 ----
  await page.evaluate(() => localStorage.removeItem('mg_tut'));
  await page.evaluate(() => { MG.debug.setDrops(0); }); // 内部变量重置（仅测试）
  await page.evaluate(() => { MG.debug.setDrops(2); });
  await page.waitForTimeout(200);
  const mid = await page.evaluate(() => !MG.debug.tutDone());
  await page.evaluate(() => { MG.debug.setDrops(5); });
  await page.waitForTimeout(200);
  // 第 6 投触发落袋 → tutDone
  await page.mouse.move(210, 300); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(300);
  const doneTut = await page.evaluate(() => MG.debug.tutDone());
  if (!mid || !doneTut) { console.log('FAIL: 引导状态 mid=' + mid + ' done=' + doneTut); process.exit(1); }
  const persisted = await page.evaluate(() => localStorage.getItem('mg_tut'));
  if (persisted !== '1') { console.log('FAIL: 引导完成未持久化'); process.exit(1); }
  console.log('PASS: 首局引导 5 投结束并持久化');
  await page.screenshot({ path: path.join(__dirname, 'v62_final.png') });

  console.log('errors:', errors.length ? errors : 'NONE');
  if (errors.length) process.exit(1);
  console.log('V62_ALL_PASS');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
