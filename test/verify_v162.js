// v162 验证：① 顶部按钮 r16 与重开按钮同径  ② 游戏块贴顶（oy=0），底部技能栏/按钮贴屏底  ③ 模拟微信胶囊（__safeTop）HUD 贴其下方
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let fails = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) fails++; };

  // —— 页 1：标准 420×780 ——
  const page = await browser.newPage({ viewport: { width: 420, height: 780 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);

  const r1 = await page.evaluate(() => ({
    trophy: window.trophyBtn.r, menuTrophy: window.menuTrophy.r, mute: window.MUTE.r,
    restart: window.restartBtn.r, oy: window.oy, VH: window.VH, rCy: window.restartBtn.cy
  }));
  ok(r1.trophy === 16 && r1.menuTrophy === 16 && r1.mute === 16, '顶部三按钮 r=16（原 20）');
  ok(r1.trophy === r1.restart, '与重开按钮同径（' + r1.trophy + ' = ' + r1.restart + '）');
  ok(r1.oy === 0, 'Web 无胶囊：块贴屏顶（oy=' + r1.oy + '）');
  ok(Math.abs(r1.rCy - (r1.VH - 46)) < 0.5, '底部按钮贴屏底（cy=' + r1.rCy + ' ≈ VH-46=' + (r1.VH - 46) + '）');

  // 进入局内，像素实测奖杯/静音位置与直径
  await page.mouse.click(210, 412); // 菜单开始按钮（块内 y396，oy=0）
  await page.waitForTimeout(900);
  const m1 = await page.evaluate(() => {
    var c2 = document.getElementById('game').getContext('2d');
    var t = c2.getTransform(), k = t.a, ox = t.e, oyT = t.f;
    function scanAt(cx, cy, isGold) {
      var px = Math.round(k * cx + ox), py = Math.round(k * cy + oyT);
      var half = Math.round(k * 24);
      var d = c2.getImageData(px - half, py, half * 2, 1).data;
      var first = -1, last = -1;
      for (var i = 0; i < half * 2; i++) {
        var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        var hit = isGold ? (r > 110 && r < 245 && g > 70 && g < 190 && b < 130 && r - b > 45)
                         : (r > 246 && g > 249 && b > 250); // 纯白圆（0.8 白叠天空≈251）比天空本身(≈237)更亮
        if (hit) { if (first < 0) first = i; last = i; }
      }
      return first < 0 ? -1 : (last - first + 1) / k;
    }
    return {
      oyT: oyT / k, trophyD: scanAt(24, 36, true), muteD: scanAt(396, 36, false),
      muteC: scanAt(396, 36 + 26, false) // 中心偏下一点仍在圆内 → 圆心位置正确
    };
  });
  ok(Math.abs(m1.oyT) < 0.5, '局内渲染零偏移（renderOy*=' + m1.oyT + '）');
  ok(m1.trophyD > 0 && m1.muteD > 0, '两按钮可见（奖杯 ' + m1.trophyD.toFixed(1) + ' / 静音 ' + m1.muteD.toFixed(1) + 'px 直径）');
  ok(Math.abs(m1.trophyD - m1.muteD) <= 3, '直径一致（差 ' + Math.abs(m1.trophyD - m1.muteD).toFixed(1) + 'px ≤ 3）');
  ok(m1.muteD >= 26 && m1.muteD <= 34, '直径≈32px（r16）');
  await page.screenshot({ path: path.join(__dirname, 'v162_play_780.png') });

  // —— 页 2：长屏 420×980 + 模拟微信胶囊 safeTop=100 ——
  const page2 = await browser.newPage({ viewport: { width: 420, height: 980 } });
  page2.on('pageerror', e => errs.push(e.message));
  await page2.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page2.waitForTimeout(1400);
  const r2a = await page2.evaluate(() => ({ oy: window.oy, VH: window.VH, rCy: window.restartBtn.cy }));
  ok(r2a.oy === 0, '长屏无胶囊也贴顶（oy=' + r2a.oy + '，原居中会是 ' + ((r2a.VH - 747) / 2) + '）');
  // 模拟胶囊：safeTop=100 CSS px → oy = 100/s - 20
  await page2.evaluate(() => { window.__safeTop = 100; window.dispatchEvent(new Event('resize')); });
  await page2.waitForTimeout(400);
  const r2 = await page2.evaluate(() => ({
    oy: window.oy, VH: window.VH, s: window.view.s, rCy: window.restartBtn.cy,
    muteTop: window.MUTE.cy - window.MUTE.r + window.oy, // 静音圆顶缘（逻辑屏坐标）
    trophyBottomInBlock: window.trophyBtn.cy + window.trophyBtn.r
  }));
  const expectOy = 100 / r2.s - 20;
  ok(Math.abs(r2.oy - expectOy) < 0.5, '胶囊下压生效：oy=' + r2.oy.toFixed(1) + ' ≈ safeTop/s-20=' + expectOy.toFixed(1));
  ok(r2.muteTop >= 100 / r2.s - 0.5, '静音圆顶缘（' + r2.muteTop.toFixed(1) + '）不低于胶囊下缘（' + (100 / r2.s).toFixed(1) + '）');
  ok(Math.abs(r2.rCy - (r2.VH - r2.oy - 46)) < 0.5, '长屏底部按钮仍贴屏底（cy=' + r2.rCy.toFixed(1) + '）');
  ok(r2.VH - r2.oy - 46 > 747 - 46 + 20, '底部按钮位于块底之下（海床加深填充长屏）');

  // 菜单态静音按钮与局内同位置（+oy），点击可切换
  const before = await page2.evaluate(() => window.audio.muted);
  await page2.mouse.click(396, (36 + r2.oy) * r2.s);
  await page2.waitForTimeout(200);
  const after = await page2.evaluate(() => window.audio.muted);
  ok(before !== after, '菜单态点静音（+oy 位置）仍可切换 (' + before + '→' + after + ')');
  await page2.evaluate(function (v) { window.audio.muted = v; }, before);
  await page2.screenshot({ path: path.join(__dirname, 'v162_menu_980_capsule.png') });

  // 局内截图（模拟胶囊长屏）：菜单主体铺满不偏移，开始按钮在块内 y396（屏上即 396*s）
  await page2.mouse.click(210, 396 * r2.s);
  await page2.waitForTimeout(900);
  await page2.screenshot({ path: path.join(__dirname, 'v162_play_980_capsule.png') });
  const st2 = await page2.evaluate(() => window.state);
  ok(st2 === 'play', '长屏+胶囊下可正常开局（state=' + st2 + '）');

  ok(errs.length === 0, '零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
