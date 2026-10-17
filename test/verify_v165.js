// v165 定位断言：游戏态 HUD 统一下移（drawQuest 纳入 translate(0,oy)）消除叠压；彩虹滴改用 rgba
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
    const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
    const s = Math.min(vb.iw / 420, vb.ih / 747);
    await page.mouse.click(210 * s, 426 * s);
    await page.waitForTimeout(500);
    const st = await page.evaluate(() => window.MG.probe());
    console.log(`[${label}] state=${st.state} oy=${st.oy.toFixed(2)} renderOy=${st.renderOy} VH=${st.VH} safeTop=${safeTop}`);
    ok(st.state === 'play', `${label}: 进入游戏态`);
    ok(st.renderOy === 0, `${label}: 游戏态 renderOy=0（块顶贴屏顶）`);
    const expectOy = Math.max(0, Math.min((safeTop || 0) / s - 20, st.VH - 747));
    ok(Math.abs(st.oy - expectOy) < 0.5, `${label}: 胶囊偏移 oy 仅用于 HUD 下挪（期望 ${expectOy.toFixed(1)}，实际 ${st.oy.toFixed(1)}）`);
    ok(errs.length === 0, `${label}: 无控制台错误${errs.length ? ' -> ' + errs.join(' | ') : ''}`);
    await browser.close();
  }

  // HSL→RGBA 工具正确性
  {
    const browser = await chromium.launch({ executablePath: exe });
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(base);
    await page.waitForFunction(() => window.MG && window.MG.util && window.MG.util.hslToRgba, null, { timeout: 8000 });
    const c = await page.evaluate(() => ({
      red: window.MG.util.hslToRgba(0, 100, 50, 1),
      green: window.MG.util.hslToRgba(120, 100, 50, 1),
      blue: window.MG.util.hslToRgba(240, 100, 50, 1),
      alpha: window.MG.util.hslToRgba(180, 50, 50, 0.5)
    }));
    console.log('[util] hslToRgba 样例', c);
    ok(/^rgba\(255,\s*0,\s*0,\s*1\)$/.test(c.red), 'util: 红色 hsl(0,100,50) → rgba(255,0,0,1)');
    ok(/^rgba\(0,\s*255,\s*0,\s*1\)$/.test(c.green), 'util: 绿色 hsl(120,100,50) → rgba(0,255,0,1)');
    ok(/^rgba\(0,\s*0,\s*255,\s*1\)$/.test(c.blue), 'util: 蓝色 hsl(240,100,50) → rgba(0,0,255,1)');
    ok(c.alpha.indexOf('0.5') > 0, 'util: alpha 通道保留');
    ok(errs.length === 0, 'util: 无控制台错误' + (errs.length ? ' -> ' + errs.join(' | ') : ''));
    await browser.close();
  }

  await run('Web-无胶囊', null, 375, 812);
  await run('微信-模拟胶囊(__safeTop=80)', 80, 375, 812);
  await run('微信-长屏模拟胶囊(__safeTop=88)', 88, 407, 885);

  console.log(`\n结果：通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
