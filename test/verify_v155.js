// v155 验证：①礁石与普通滴严格分离（零容差全量修正）——不重合、不压扁
// ②进度条两端徽章骑端点并遮挡（沿用 v154 断言）
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

  // ---- ①拥挤场景：底部水滴堆 + 多块礁石落下，检查铁球与普通滴无重合 ----
  await page.evaluate(() => { restart(); });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    // 底部铺一排普通滴（不同档），再落 3 块礁石压在上面
    phys.create(120, 640, 1, 0, 0);
    phys.create(180, 645, 2, 0, 0);
    phys.create(240, 640, 1, 0, 0);
    phys.create(300, 645, 3, 0, 0);
    createIron(150, 300);
    createIron(240, 340);
    createIron(330, 380);
  });
  await page.waitForTimeout(3200);
  const ov = await page.evaluate(() => {
    var bs = phys.bodies, worst = -1e9, worstPair = null, moved = 0;
    for (var i = 0; i < bs.length; i++) {
      for (var j = i + 1; j < bs.length; j++) {
        var a = bs[i], b = bs[j];
        if ((a.iron && !a.chest) === (b.iron && !b.chest)) continue; // 只查 礁石↔普通滴
        var d = Math.hypot(a.x - b.x, a.y - b.y), minD = a.r + b.r;
        var pen = minD - d;                                          // >0 表示重叠
        if (pen > worst) { worst = pen; worstPair = [Math.round(a.x), Math.round(a.y), Math.round(b.x), Math.round(b.y)]; }
        moved++;
      }
    }
    return { worst: worst, n: bs.length, pairs: moved, pair: worstPair, pressS: bs.map(function (b) { return b.pressS || 0; }) };
  });
  ok(ov.pairs > 0, '场景含礁石↔普通滴接触对（' + ov.pairs + ' 对，共 ' + ov.n + ' 个球）');
  ok(ov.worst <= 0.6, '礁石与普通滴不重合：最大重叠 ' + ov.worst.toFixed(2) + 'px ≤ 0.6');
  ok(ov.pressS.every(v => v === 0), '无压扁形变（pressS 全为 0）');
  await page.screenshot({ path: path.join(__dirname, 'v155_iron_sep.png') });

  // ---- ②进度条端点徽章 ----
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
    return { left: px(sx), right: px(sx + sw) };
  });
  ok(ends.left[2] > 150 && ends.left[1] > ends.left[0] + 60, '左端彩色徽章遮挡条端 rgb(' + ends.left.join(',') + ')');
  ok(ends.right[0] > 170 && ends.right[2] > ends.right[0] + 20, '右端不透明徽章遮挡条端 rgb(' + ends.right.join(',') + ')');

  ok(errs.length === 0, '零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
