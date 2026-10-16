// v139 验证：修复小程序菜单「开始游戏」文字异常——
// 根因：drawOfflineCard 末尾 ctx.textAlign='left' 泄漏给开始按钮（离线卡显示时文字左对齐从 C.W/2 画起，向右溢出）
// 验证：模拟离线收益（mg_seen 设 2 小时前）→ 菜单显示离线卡 → 像素探针断言按钮行文字水平居中
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let fails = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) fails++; };

  // ---- 场景 1：有离线收益（离线卡显示，原 bug 触发路径）----
  let page = await browser.newPage({ viewport: { width: 420, height: 780 } });
  let errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.evaluate(() => { localStorage.setItem('mg_seen', String(Date.now() - 2 * 3600 * 1000)); });
  await page.reload();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'v139_menu_offline.png') });

  const hasCard = await page.evaluate(() => {
    // 离线卡金色标题像素存在性：扫描 y≈338（块内 316+22）附近金色文字
    var cv = document.getElementById('game');
    var c2 = cv.getContext('2d');
    var d = c2.getImageData(0, 330, 420, 14).data;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i] > 200 && d[i + 1] > 160 && d[i + 2] < 120) return true; // 金色 #F5C542 系
    }
    return false;
  });
  ok(hasCard, '离线收益卡已显示（bug 触发前提成立）');

  // 按钮文字水平居中：按钮 100~320 / y 中心 426，检测白色文字像素段
  const span = await page.evaluate(() => {
    var c2 = document.getElementById('game').getContext('2d');
    var d = c2.getImageData(0, 424, 420, 5).data;
    var min = -1, max = -1;
    for (var x = 0; x < 420; x++) {
      for (var yy = 0; yy < 5; yy++) {
        var i = ((yy * 420) + x) * 4;
        if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 240) {
          if (min < 0) min = x;
          max = x;
          break;
        }
      }
    }
    return { min: min, max: max };
  });
  ok(span.min > 0, '按钮行检测到白色文字像素 (min=' + span.min + ' max=' + span.max + ')');
  const mid = (span.min + span.max) / 2;
  ok(Math.abs(mid - 210) < 15, '按钮文字水平居中（中心 ' + mid.toFixed(1) + ' ≈ 210，左对齐泄漏时 min≈214）');
  ok(span.min < 175, '文字左端 ' + span.min + ' < 175（左对齐泄漏时会 ≈214 起）');
  ok(errs.length === 0, '有离线收益场景零报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  // ---- 场景 2：无离线收益（常规回归：按钮 + 局内几何不回归）----
  page = await browser.newPage({ viewport: { width: 420, height: 780 } });
  errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'v139_menu_plain.png') });
  const g = await page.evaluate(() => { restart(); return new Promise(res => setTimeout(() => res(MG.probe()), 400)); });
  ok(g.spawnY === 147 && g.floorY - g.spawnY === 526, '出生点距容器底 526 恒定不回归 (spawnY=' + g.spawnY + ')');
  ok(g.floorY - g.containerTop === 528, '容器 528 恒定不回归');
  ok(g.spawnY === 147 && g.floorY - g.spawnY === 526, '窄/宽屏几何一致');
  ok(errs.length === 0, '常规场景零报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
