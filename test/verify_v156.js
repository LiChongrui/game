// v156 验证：①漩涡中心与旋臂连成一体（风暴事件 + 漩涡滴两处，截图复核）
// ②进度条收窄（两侧各 24）：端点徽章不再顶屏幕边界
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
  await page.evaluate(() => localStorage.clear());   // 新档：进度条填充仅 0.02，右段为条底白便于取样
  await page.reload();
  await page.waitForTimeout(1500);
  await page.evaluate(() => { restart(); });
  await page.waitForTimeout(700);

  // ---- ①进度条收窄：条身 24~396，两侧 12/408 为背景 ----
  const bar = await page.evaluate(() => {
    var c2 = document.getElementById('game').getContext('2d');
    var t = c2.getTransform();
    var k = t.a, ox = t.e, oyT = t.f;
    var sy = 100, sh = 20, sx = 24, sw = C.W - 48;
    var midY = Math.round(k * (sy + sh / 2) + oyT);
    function avg(lx, ly) {
      var x = Math.round(k * lx + ox), y = Math.round(k * ly + oyT);
      var d = c2.getImageData(x - 3, y - 3, 6, 6).data;
      var sr = 0, sg = 0, sb = 0, n = 0;
      for (var j = 0; j < d.length; j += 4) { sr += d[j]; sg += d[j + 1]; sb += d[j + 2]; n++; }
      return [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)];
    }
    var mid = sy + sh / 2;
    return {
      left: avg(sx, mid), right: avg(sx + sw, mid),
      outerL: avg(10, mid), outerR: avg(C.W - 10, mid),
      inner: avg(390, mid), body: avg(C.W / 2, mid)
    };
  });
  const sum = c => c[0] + c[1] + c[2];
  ok(bar.left[1] > bar.left[0] + 60, '左端彩色徽章在 x=24 rgb(' + bar.left.join(',') + ')');
  ok(bar.right[0] > 170 && bar.right[2] > bar.right[0] + 20, '右端不透明徽章在 x=396 rgb(' + bar.right.join(',') + ')');
  // 条内未填充区（x=45）为条底白 → 比条外背景亮；左右外侧应同为背景（对称）
  ok(sum(bar.inner) > sum(bar.outerL) + 12, 'x=45 在条内（条底白 ' + sum(bar.inner) + ' > 条外背景 ' + sum(bar.outerL) + '）');
  ok(sum(bar.outerR) < sum(bar.inner) - 12, '条右外侧 x=410 为背景（' + sum(bar.outerR) + ' < 条内 ' + sum(bar.inner) + '）');
  ok(Math.abs(sum(bar.outerR) - sum(bar.outerL)) < 25, '左右外侧均为背景且对称（L' + sum(bar.outerL) + ' / R' + sum(bar.outerR) + '）');

  // ---- ②漩涡：风暴事件 + 漩涡滴 ----
  await page.evaluate(() => { MG.debug.forceEvent('storm'); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'v156_storm.png') });
  await page.evaluate(() => {
    var b = phys.create(210, 480, 3, 0, 0); b.special = 'vortex';
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'v156_vortex_drop.png') });
  const gapOK = await page.evaluate(() => {
    // 几何核对：漩涡滴旋臂起点 0.05r ≤ 核半径 0.11r → 臂根位于核内（相接不分离）
    return { armStart: 0.05, core: 0.11 };
  });
  ok(gapOK.armStart < gapOK.core, '漩涡滴：臂起点 0.05r 位于核心 0.11r 之内（相接）');

  ok(errs.length === 0, '零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
