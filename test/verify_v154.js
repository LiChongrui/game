// v154 验证：①礁石压住普通滴 → 被压滴压扁（pressS>0 且渲染形变生效）
// ②进度条两端徽章骑在端点并遮挡条端（左端实色徽章 / 右端不透明浅底）
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let fails = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) fails++; };
  const page = await browser.newPage({ viewport: { width: 420, height: 780 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);

  // ---- ①礁石压顶压扁 ----
  await page.evaluate(() => { restart(); });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    phys.create(210, 645, 2, 0, 0);   // 底部放一个露珠（r28）
    createIron(210, 520);                  // 正上方落一块礁石压住它
  });
  await page.waitForTimeout(2600);
  const press = await page.evaluate(() => {
    var list = phys.bodies, iron = null, ball = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].iron && !list[i].chest) iron = list[i];
      else if (!list[i].iron) ball = list[i];
    }
    if (!iron || !ball) return { has: false, n: list.length };
    var dy = iron.y - ball.y, d = Math.hypot(iron.x - ball.x, dy);
    return { has: true, pressS: ball.pressS || 0, above: dy < 0, touching: d < ball.r + iron.r + 6,
      dy: dy.toFixed(1), d: d.toFixed(1), n: list.length };
  });
  ok(press.has && press.above && press.touching,
    '礁石已压在普通滴上方并接触（' + JSON.stringify(press) + '）');
  ok(press.pressS > 0.02, '被压滴压扁量生效 pressS=' + (press.pressS || 0).toFixed(3));
  await page.screenshot({ path: path.join(__dirname, 'v154_press.png') });

  // ---- ②进度条两端徽章骑端点并遮挡 ----
  const ends = await page.evaluate(() => {
    var c2 = document.getElementById('game').getContext('2d');
    var t = c2.getTransform();
    var k = t.a, ox = t.e, oyT = t.f;
    var sy = 100, sh = 20, sx = 12, sw = C.W - 24;
    var midY = Math.round(k * (sy + sh / 2) + oyT);
    function px(lx) {
      var x = Math.round(k * lx + ox);
      var d = c2.getImageData(x - 3, midY - 3, 6, 6).data;
      var sr = 0, sg = 0, sb = 0, n = 0;
      for (var j = 0; j < d.length; j += 4) { sr += d[j]; sg += d[j + 1]; sb += d[j + 2]; n++; }
      return [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)];
    }
    // 左端徽章：潮汐池 #3BB8D8(59,184,216) —— 蓝青，g/b 明显高于 r
    var l = px(sx);
    // 右端徽章：不透明浅底 #EFF5FA(239,245,250) —— 近白且高于条底半透明白
    var r = px(sx + sw);
    return { left: l, right: r, sx: sx, rightX: sx + sw };
  });
  ok(ends.left[2] > 150 && ends.left[1] > 140 && ends.left[1] > ends.left[0] + 60,
    '左端为当前海域彩色徽章并遮挡条端 rgb(' + ends.left.join(',') + ')');
  ok(ends.right[0] > 170 && ends.right[2] > 200 && ends.right[2] > ends.right[0] + 20,
    '右端为不透明浅底徽章并遮挡条端 rgb(' + ends.right.join(',') + ')');
  await page.screenshot({ path: path.join(__dirname, 'v154_bar_ends.png') });

  ok(errs.length === 0, '零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
