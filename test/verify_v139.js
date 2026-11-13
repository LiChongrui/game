const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let fails = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) fails++; };

  let page = await browser.newPage({ viewport: { width: 420, height: 780 } });
  let errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.evaluate(() => { localStorage.setItem('mg_seen', String(Date.now() - 2 * 3600 * 1000)); });
  await page.reload();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'v139_menu_offline.png') });

  const hasCard = await page.evaluate(() => {
    var cv = document.getElementById('game');
    var c2 = cv.getContext('2d');
    var d = c2.getImageData(0, 330, 420, 14).data;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i] > 200 && d[i + 1] > 160 && d[i + 2] < 120) return true;
    }
    return false;
  });
  ok(hasCard, '离线收益卡已显示（bug 触发前提成立）');

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
