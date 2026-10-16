// v123 验证：每日挑战闭环
// ①菜单态：成就殿堂→每日页签显示挑战卡（词缀/目标/开始按钮）+任务卡下移无重叠
// ②点「开始挑战」→ 进入挑战局：词缀弹条 + HUD「每日挑战 0/goal」进度
// ③MG.debug.addScore 达标 → 1s 内自动发奖 → 页签卡变金已完成 +「再玩一局」
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errs = [];
  const p = await browser.newPage({ viewport: { width: 420, height: 720 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.clear(); });
  await p.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(1500);

  // ① 每日页签挑战卡（trophyBtn 左上角 → 每日页签 achTabRect(1) 中点 209,118）
  await p.mouse.click(30, 30);
  await p.waitForTimeout(400);
  await p.mouse.click(209, 118);
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, 'v123_daily_card.png') });
  const ci = await p.evaluate(() => dchalInfo());
  console.log('dchalInfo:', JSON.stringify(ci));

  // ② 点开始挑战 → 挑战局
  const br = await p.evaluate(() => dchalBtnRect());
  await p.mouse.click(br.x + br.w / 2, br.y + br.h / 2);
  await p.waitForTimeout(900);
  const ngInfo = await p.evaluate(() => MG.debug.ngInfo());
  console.log('after start: ng=', JSON.stringify(ngInfo), 'goal=', ci.goal);
  await p.screenshot({ path: path.join(__dirname, 'v123_run_hud.png') });

  // ③ 加分达标 → 自动发奖
  await p.evaluate((g) => { MG.debug.addScore(g + 10); }, ci.goal);
  await p.waitForTimeout(1400); // achTick 周期 1s
  await p.screenshot({ path: path.join(__dirname, 'v123_claim.png') });
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_dchal') || '{}'));
  console.log('mg_dchal:', JSON.stringify(saved));

  // ④ 重开每日页签：金卡已完成 + 再玩一局
  await p.mouse.click(30, 30);
  await p.waitForTimeout(300);
  await p.mouse.click(209, 118);
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, 'v123_daily_done.png') });

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
