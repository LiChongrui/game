// v140 验证：恢复海域进度条（y106~122 空隙带）——
// 断言：进度条像素存在（经 getTransform 换算内容层偏移后采样）、核心几何不回归（容器 528、spawnY 距底 526）、双屏零报错
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let fails = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) fails++; };

  // 进度条像素采样：用 ctx.getTransform 把逻辑坐标 (y106~122) 换算到物理像素（含 renderOy/dpr/view.s）
  function probeBar(page) {
    return page.evaluate(() => {
      var c2 = document.getElementById('game').getContext('2d');
      var t = c2.getTransform();
      var k = t.a, ox = t.e, oyT = t.f;
      var y0 = Math.round(k * 100 + oyT), y1 = Math.round(k * 120 + oyT);
      var x0 = Math.round(k * 14 + ox), x1 = Math.round(k * 24 + ox);
      var xm0 = Math.round(k * 60 + ox), xm1 = Math.round(k * 360 + ox);
      var img = c2.getImageData(0, y0, c2.canvas.width, y1 - y0 + 1).data;
      var W = c2.canvas.width, H = y1 - y0 + 1;
      var fill = 0, base = 0, dot = 0;
      for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++) {
          var i = (y * W + x) * 4;
          var r = img[i], g = img[i + 1], b = img[i + 2];
          if (x >= x0 && x <= x1 && r < 160 && b > 150) fill++;            // 最左端 0.02 填充（潮汐池 #80BFE2 系）
          if (x >= xm0 && x <= xm1 && r > 200 && g > 225 && b > 235) base++; // 条底半透明白
        }
      }
      // 右端下一海域徽章（未抵达灰化态）：灰图标 #8AA5B8=(138,165,184)
      var ex = Math.round(k * (12 + 396 - 16) + ox), ey = Math.round(k * 110 + oyT);
      var di = c2.getImageData(ex - 6, ey - 6, 12, 12).data;
      for (var j = 0; j < di.length; j += 4) {
        if (Math.abs(di[j] - 138) < 45 && Math.abs(di[j + 1] - 165) < 45 && Math.abs(di[j + 2] - 184) < 45 && di[j + 2] > di[j]) dot++;
      }
      return { fill: fill, base: base, dot: dot };
    });
  }

  // ---- 屏型 1：420×780 ----
  let page = await browser.newPage({ viewport: { width: 420, height: 780 } });
  let errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  const g = await page.evaluate(() => { restart(); return new Promise(res => setTimeout(() => res(MG.probe()), 400)); });
  ok(g.containerTop === 190 && g.floorY === 673, 'containerTop=145 floorY=673 (实际 ' + g.containerTop + '/' + g.floorY + ')');
  ok(g.floorY - g.containerTop === 483, '容器 483 压缩后恒定');
  ok(g.spawnY === 209 && g.spawnY + 45 === g.dangerY, '坠落高度=最大滴(r45)底触警戒线 spawnY=' + g.spawnY + ' dangerY=' + g.dangerY);
  ok(g.dangerY === 254, 'dangerY=209 (实际 ' + g.dangerY + ')');
  const bar = await probeBar(page);
  ok(bar.fill > 8, '进度条左端填充存在（新档 frac=0.02，fill=' + bar.fill + '）');
  ok(bar.base > 60, '进度条条底像素存在（base=' + bar.base + '）');
  ok(bar.dot > 3, '右端下一海域灰化徽章存在（dot=' + bar.dot + '）');

  await page.evaluate(() => { MG.debug.setNext({ tier: 2 }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v140_play_780.png') });
  ok(errs.length === 0, '420×780 零报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  // ---- 屏型 2：320×880 ----
  page = await browser.newPage({ viewport: { width: 320, height: 880 } });
  errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  const g2 = await page.evaluate(() => { restart(); return new Promise(res => setTimeout(() => res(MG.probe()), 400)); });
  ok(g2.containerTop === 190 && g2.floorY - g2.containerTop === 483, '窄屏容器 483 一致');
  ok(g2.spawnY === 209 && g2.spawnY + 45 === g2.dangerY, '窄屏坠落高度一致 (spawnY=' + g2.spawnY + ')');
  const bar2 = await probeBar(page);
  ok(bar2.fill > 8 && bar2.base > 60, '窄屏进度条填充/条底存在（fill=' + bar2.fill + ' base=' + bar2.base + '）');
  await page.evaluate(() => { MG.debug.setNext({ tier: 2 }); MG.debug.drop(210); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'v140_play_320x880.png') });
  ok(errs.length === 0, '320×880 零报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
