// v160 验证：初始界面音量按钮只绘制一次（v153 曾在 drawMenu 内与菜单分支各画一次 → 两个按钮）
// 判据：沿音量按钮中心列竖扫白色圆底像素，连续段数量应为 1
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
  await page.waitForTimeout(1600);

  const scan = await page.evaluate(() => {
    var c2 = document.getElementById('game').getContext('2d');
    var t = c2.getTransform();
    var k = t.a, ox = t.e, oyT = t.f;
    // 菜单态 renderOy=0：奖杯/音量按钮绘制于 cy+oy，竖扫 x=396 列
    var cx = Math.round(k * 396 + ox);
    var y0 = Math.round(k * 18 + oyT), y1 = Math.round(k * 80 + oyT);
    var d = c2.getImageData(cx - 2, y0, 4, y1 - y0).data;
    var runs = [], inRun = false, start = 0;
    for (var yy = 0; yy < y1 - y0; yy++) {
      var i = yy * 4 * 4; // 每行 4 像素宽
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var white = r > 225 && g > 232 && b > 235;     // drawMiniBtn 白底 rgba(255,255,255,0.8)
      if (white && !inRun) { inRun = true; start = yy; }
      else if (!white && inRun) { inRun = false; runs.push([start + y0, yy + y0]); }
    }
    if (inRun) runs.push([start + y0, y1]);
    // 注意：白色圆会被中间的喇叭图标切断成 2 段（正常），故用「总跨度」判数量：
    // 单个按钮跨度 ≈ 26px；若重复绘制（cy 36 与 36+oy 各一个）跨度会 ≈ 42px
    var first = runs.length ? runs[0][0] : -1;
    var last = runs.length ? runs[runs.length - 1][1] : -1;
    var span = last - first, center = (first + last) / 2;
    return { runs: runs, span: span, center: center, y0: y0, y1: y1 };
  });
  ok(scan.span > 0 && scan.span < 32, '音量按钮仅一个（白色圆总跨度 ' + scan.span + 'px < 32；两个会≈42）');
  ok(scan.center > scan.y0 + 20, '按钮位于 +oy 后的位置（中心 ' + scan.center + '，不贴顶）');
  await page.screenshot({ path: path.join(__dirname, 'v160_menu.png') });

  // 点击仍可切换静音（+oy 命中区）
  const before = await page.evaluate(() => window.audio.muted);
  await page.mouse.click(396, 53);
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => window.audio.muted);
  ok(before !== after, '菜单点音量仍可切换静音 (' + before + ' → ' + after + ')');

  ok(errs.length === 0, '零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
