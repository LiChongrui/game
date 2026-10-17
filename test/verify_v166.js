// v166 定位断言：垂直居中（renderOy=(VH-C.H)/2）+ transform 修正（dpr*view.s*renderOy）
// 验证：① renderOy 居中量正确；② hudInset 胶囊残余量正确（高屏=0，矮屏=24）；
//       ③ 菜单态实点静音键（按公式换算屏幕坐标）验证命中回环未被居中/单位修正破坏。只读状态+实点，不截图。
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
    if (safeTop != null) await page.addInitScript((st) => { window.__safeTop = st; }, safeTop);
    await page.goto(base);
    await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
    const st = await page.evaluate(() => window.MG.probe());
    const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
    const s = Math.min(vb.iw / 420, vb.ih / 747);
    const VH = vb.ih / s;
    const expOy = Math.max(0, (VH - 747) / 2);
    const capBottom = safeTop ? (safeTop - 8) / s : 0;
    const expInset = Math.max(0, Math.min(capBottom - expOy - 20, 24));
    console.log(`[${label}] ${w}x${h} s=${s.toFixed(3)} VH=${VH.toFixed(1)} renderOy=${st.renderOy.toFixed(2)}(期望${expOy.toFixed(2)}) hudInset=${st.hudInset}(期望${expInset.toFixed(1)})`);
    ok(Math.abs(st.renderOy - expOy) < 0.5, `${label}: renderOy=居中量 (VH-747)/2`);
    ok(Math.abs(st.hudInset - expInset) < 0.5, `${label}: hudInset=胶囊残余量 ${expInset.toFixed(1)}`);

    // 菜单态实点静音键：block(396, 36+hudInset) → 屏幕坐标（含居中 renderOy 与 BX）
    const rect = await page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { left: r.left, top: r.top }; });
    const LW = vb.iw / s, BX = (LW - 420) / 2;
    const mx = rect.left + s * (396 + BX);
    const my = rect.top + s * ((36 + st.hudInset) + st.renderOy);
    const before = await page.evaluate(() => window.audio.muted);
    await page.mouse.click(mx, my);
    await page.waitForTimeout(120);
    const after = await page.evaluate(() => window.audio.muted);
    ok(before !== after, `${label}: 实点静音键命中翻转 (${before}→${after}) @(${mx.toFixed(0)},${my.toFixed(0)})`);
    // 点回来复位，避免影响后续
    await page.mouse.click(mx, my);
    await page.waitForTimeout(80);
    ok(errs.length === 0, `${label}: 无控制台错误${errs.length ? ' -> ' + errs.join(' | ') : ''}`);
    await browser.close();
  }

  await run('Web-无胶囊-高屏', null, 375, 812);
  await run('微信胶囊-高屏(居中即避让)', 80, 375, 812);
  await run('微信胶囊-矮屏(需残余24)', 80, 420, 760);

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
})();
