// 定位诊断：强制生成彩虹滴，逐帧读内部状态，判断 special/time 是否跳变导致"闪"
const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(base);
  await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });
  const vb = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
  const s = Math.min(vb.iw / 420, vb.ih / 747);
  await page.mouse.click(210 * s, 426 * s);
  await page.waitForTimeout(400);

  // 强制生成一颗孤立彩虹滴（落点上方，避免立刻合并）
  await page.evaluate(() => {
    var b = window.MG.debug.spawn(0, 210, 250);
    b.special = 'rainbow';
    b.frozen = 0;
    window.__rb = b;
  });

  console.log('frame | time    | rb.special | rb.y  | hue0(deg) | note');
  let prevTime = 0, prevHue = 0, flickerSpecial = false, flickerTime = false;
  for (let f = 0; f < 45; f++) {
    const r = await page.evaluate(() => {
      const p = window.MG.probe();
      const rb = window.__rb;
      return {
        time: p.time,
        special: rb ? (rb.special || null) : 'DEAD',
        y: rb ? Math.round(rb.y) : -1,
        alive: rb ? window.MG.probe().bodies.some(b => b.x === Math.round(rb.x) && b.special === 'rainbow') : false
      };
    });
    const hue = (r.time * 120) % 360;
    const dt = r.time - prevTime;
    const dHue = hue - prevHue;
    let note = '';
    if (f > 0 && Math.abs(dt) > 0.1) note = 'DT_SPIKE=' + dt.toFixed(3);
    if (r.special !== 'rainbow') { flickerSpecial = true; note += ' SPECIAL_LOST'; }
    if (f > 0 && Math.abs(dHue) > 30) { flickerTime = true; note += ' HUE_JUMP=' + dHue.toFixed(0); }
    console.log(
      String(f).padStart(5) + ' | ' +
      r.time.toFixed(3).padStart(7) + ' | ' +
      String(r.special).padEnd(10) + ' | ' +
      String(r.y).padStart(4) + ' | ' +
      hue.toFixed(1).padStart(7) + ' | ' + note
    );
    prevTime = r.time; prevHue = hue;
    await page.waitForTimeout(33);
  }
  console.log('\nSPECIAL_LOST(闪烁?):', flickerSpecial, ' | HUE_JUMP(频闪?):', flickerTime, ' | 控制台错误:', errs.length);
  await browser.close();
})();
