// v164 定位断言：游戏态顶部铺满（renderOy=0），胶囊偏移仅下挪 HUD（oy>0 但块顶仍贴屏顶）
const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

  async function run(label, safeTop, w, h) {
    const browser = await chromium.launch({ executablePath: exe });
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    if (safeTop != null) {
      await page.addInitScript((st) => { window.__safeTop = st; }, safeTop);
    }
    await page.goto(base);
    await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
    // 进入游戏：菜单态点「开始游戏」（块坐标 210,426 → 屏坐标，renderOy=0）
    const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
    const s = Math.min(vb.iw / 420, vb.ih / 747);
    await page.mouse.click(210 * s, 426 * s);
    await page.waitForTimeout(500);
    const st = await page.evaluate(() => window.MG.probe());
    console.log(`[${label}] state=${st.state} oy=${st.oy.toFixed(2)} renderOy=${st.renderOy} VH=${st.VH} safeTop=${safeTop}`);
    ok(st.state === 'play', `${label}: 进入游戏态`);
    ok(st.renderOy === 0, `${label}: 游戏态 renderOy=0（块顶贴屏顶，顶部留白消除）`);
    const expectOy = Math.max(0, Math.min((safeTop || 0) / s - 20, st.VH - 747));
    ok(Math.abs(st.oy - expectOy) < 0.5, `${label}: 胶囊偏移 oy 仅用于 HUD 下挪（期望 ${expectOy.toFixed(1)}，实际 ${st.oy.toFixed(1)}）`);
    ok(errs.length === 0, `${label}: 无控制台错误${errs.length ? ' -> ' + errs.join(' | ') : ''}`);
    await browser.close();
  }

  await run('Web-无胶囊', null, 375, 812);
  await run('微信-模拟胶囊(__safeTop=80)', 80, 375, 812);
  await run('微信-长屏模拟胶囊(__safeTop=88)', 88, 407, 885);

  console.log(`\n结果：通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
