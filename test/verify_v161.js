// v161 验证：顶部按钮与底部圆钮同径(r20) + 结算海报排版放松 + 结算双倍不再看广告
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

  // ① 半径一致且与底部圆钮同径
  const radii = await page.evaluate(() => ({
    trophy: window.trophyBtn.r, menuTrophy: window.menuTrophy.r, mute: window.MUTE.r,
    bottom: window.SKILL_BTNS[0].r, restart: window.restartBtn.r
  }));
  ok(radii.trophy === radii.mute && radii.menuTrophy === radii.mute,
    '顶部三按钮半径一致 trophy=' + radii.trophy + ' menuTrophy=' + radii.menuTrophy + ' mute=' + radii.mute);
  ok(radii.trophy >= radii.bottom, '顶部按钮不小于底部道具钮（' + radii.trophy + ' ≥ ' + radii.bottom + '）');

  // 像素实测：扫描按钮中心行，测「奖杯金色圆」与「静音白色圆」的水平直径（换算回逻辑坐标）
  const measure = () => page.evaluate(() => {
    var c2 = document.getElementById('game').getContext('2d');
    var t = c2.getTransform(), k = t.a, ox = t.e, oyT = t.f;
    function scanAt(logicalCx, logicalCy, isGold) {
      var px = Math.round(k * logicalCx + ox), py = Math.round(k * logicalCy + oyT);
      var half = Math.round(k * 24); // 只扫按钮附近，避开旁边的文字描边
      var d = c2.getImageData(px - half, py, half * 2, 1).data;
      var first = -1, last = -1;
      for (var i = 0; i < half * 2; i++) {
        var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        var hit = isGold ? (r > 110 && r < 245 && g > 70 && g < 190 && b < 130 && r - b > 45)
                         : (r > 215 && g > 222 && b > 226 && Math.abs(r - b) < 40);
        if (hit) { if (first < 0) first = i; last = i; }
      }
      if (first < 0) return -1;
      return (last - first + 1) / k; // 逻辑直径
    }
    var oy = window.oy || 0;
    var ty = window.trophyBtn.cy, my = window.MUTE.cy;
    if (window.state === 'menu') { ty += oy; my += oy; }
    return {
      state: window.state,
      trophyD: scanAt(window.trophyBtn.cx, ty, true),
      muteD: scanAt(window.MUTE.cx, my, false)
    };
  });

  const m1 = await measure();
  ok(m1.trophyD > 0 && m1.muteD > 0, '菜单态两按钮均可见 (奖杯 ' + m1.trophyD.toFixed(1) + 'px / 静音 ' + m1.muteD.toFixed(1) + 'px)');
  ok(Math.abs(m1.trophyD - m1.muteD) <= 2.5, '菜单态奖杯与静音直径一致（差 ' + Math.abs(m1.trophyD - m1.muteD).toFixed(1) + 'px ≤ 2.5）');
  await page.screenshot({ path: path.join(__dirname, 'v161_menu.png') });

  // 进入局内复查
  await page.mouse.click(210, 442); // 「开始游戏」主按钮（块内 210,396 + oy16.5）
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => window.state);
  ok(st === 'play', '已进入局内 (state=' + st + ')');
  const m2 = await measure();
  ok(m2.trophyD > 0 && m2.muteD > 0, '局内两按钮均可见 (奖杯 ' + m2.trophyD.toFixed(1) + 'px / 静音 ' + m2.muteD.toFixed(1) + 'px)');
  ok(Math.abs(m2.trophyD - m2.muteD) <= 2.5, '局内奖杯与静音直径一致（差 ' + Math.abs(m2.trophyD - m2.muteD).toFixed(1) + 'px ≤ 2.5）');
  await page.screenshot({ path: path.join(__dirname, 'v161_play.png') });

  // 不越界
  const bounds = await page.evaluate(() => ({
    trophyLeft: window.trophyBtn.cx - window.trophyBtn.r,
    muteRight: window.MUTE.cx + window.MUTE.r,
    W: window.C.W,
    statX: 48
  }));
  ok(bounds.trophyLeft >= 4, '奖杯未越左边界（左缘 ' + bounds.trophyLeft + ' ≥ 4）');
  ok(bounds.muteRight <= bounds.W - 4, '静音未越右边界（右缘 ' + bounds.muteRight + ' ≤ ' + (bounds.W - 4) + '）');

  // ② 结算海报：排版放松 + 双倍不再看广告
  const over = await page.evaluate(() => {
    window.score = 120; window.maxCombo = 3; window.state = 'over';
    return true;
  });
  await page.waitForTimeout(700);
  const lay = await page.evaluate(() => {
    var bs = window.overButtons.map(function (b) { return { label: b.label, y: b.y, h: b.h }; });
    var gaps = [];
    for (var i = 1; i < bs.length; i++) gaps.push(bs[i].y - (bs[i - 1].y + bs[i - 1].h));
    var last = bs[bs.length - 1];
    return {
      labels: bs.map(function (b) { return b.label; }),
      gaps: gaps, minGap: Math.min.apply(null, gaps),
      bottomMargin: (134 + 472 - 22) - (last.y + last.h),
      panelBottom: 134 + 472
    };
  });
  ok(over, '进入结算态');
  ok(lay.labels.indexOf('结算双倍') >= 0 && lay.labels.every(function (l) { return l.indexOf('广告') < 0; }),
    '双倍按钮文案无「广告」字样（' + lay.labels.join(' | ') + '）');
  ok(lay.minGap >= 10, '按钮间距已放松（最小间距 ' + lay.minGap + 'px ≥ 10，原 8）');
  ok(lay.bottomMargin >= 6, '按钮组底部留白 ' + lay.bottomMargin + 'px ≥ 6');
  ok(lay.panelBottom <= 620, '面板未超出屏内（底部 ' + lay.panelBottom + ' ≤ 620）');
  await page.screenshot({ path: path.join(__dirname, 'v161_over.png') });

  // 点击「结算双倍」：直接翻倍、无广告遮罩（按钮组垂直居中于 320~584，第 2 颗中心块内 y≈400 → 屏 +oy16.5）
  await page.mouse.click(210, 400 + 16.5);
  await page.waitForTimeout(400);
  const res = await page.evaluate(() => ({
    score: window.score, doubled: window.doubled, adOverlay: !!window.adOverlay, state: window.state
  }));
  ok(res.adOverlay === false, '点击结算双倍未弹出广告遮罩');
  ok(res.doubled === true && res.score === 240, '分数已双倍（120 → ' + res.score + '，doubled=' + res.doubled + '）');
  ok(res.state === 'over', '仍在结算页（state=' + res.state + '）');

  ok(errs.length === 0, '零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
