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

  await p.mouse.click(30, 30);
  await p.waitForTimeout(400);
  await p.mouse.click(209, 118);
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, 'v123_daily_card.png') });
  const ci = await p.evaluate(() => dchalInfo());
  console.log('dchalInfo:', JSON.stringify(ci));

  const br = await p.evaluate(() => dchalBtnRect());
  await p.mouse.click(br.x + br.w / 2, br.y + br.h / 2);
  await p.waitForTimeout(900);
  const ngInfo = await p.evaluate(() => MG.debug.ngInfo());
  console.log('after start: ng=', JSON.stringify(ngInfo), 'goal=', ci.goal);
  await p.screenshot({ path: path.join(__dirname, 'v123_run_hud.png') });

  await p.evaluate((g) => { MG.debug.addScore(g + 10); }, ci.goal);
  await p.waitForTimeout(1400);
  await p.screenshot({ path: path.join(__dirname, 'v123_claim.png') });
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_dchal') || '{}'));
  console.log('mg_dchal:', JSON.stringify(saved));

  await p.mouse.click(30, 30);
  await p.waitForTimeout(300);
  await p.mouse.click(209, 118);
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, 'v123_daily_done.png') });

  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
