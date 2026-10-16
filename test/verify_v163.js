// v163 验证：底部按钮回到块内底部带（cy=701，容器底 673~块底 747 的 74 带内），顶部仍贴顶
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
    trophy: window.trophyBtn.r, mute: window.MUTE.r, menuTrophy: window.menuTrophy.r,
    restart: window.restartBtn.r, oy: window.oy, VH: window.VH,
    rCy: window.restartBtn.cy, bCy: window.bookBtn.cy, sCy: window.SKILL_BTNS[0].cy,
    floorY: window.C.floorY, H: window.C.H
  }));
  ok(r1.trophy === 16 && r1.mute === 16 && r1.menuTrophy === 16 && r1.trophy === r1.restart,
    '顶部按钮 r16 与重开同径');
  ok(r1.oy === 0, 'Web 块贴屏顶（oy=' + r1.oy + '）');
  ok(r1.rCy === 701 && r1.bCy === 701 && r1.sCy === 701,
    '底部六个按钮回到块内 701（重开/图鉴/道具 cy=' + r1.rCy + '/' + r1.bCy + '/' + r1.sCy + '）');
  ok(r1.rCy - 20 >= r1.floorY && r1.rCy + 20 <= r1.H,
    '按钮完全落在底部带内（' + (r1.rCy - 20) + ' ≥ 容器底 ' + r1.floorY + ' 且 ' + (r1.rCy + 20) + ' ≤ 块底 ' + r1.H + '）');
  ok(Math.abs((r1.rCy - r1.floorY) - 28) < 0.5, '与容器底距离恒定 28px（不随屏高变化）');

  await page.mouse.click(210, 396);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(__dirname, 'v163_play_780.png') });

  // —— 页 2：长屏 420×980 + 模拟微信胶囊 safeTop=100 ——
  const page2 = await browser.newPage({ viewport: { width: 420, height: 980 } });
  page2.on('pageerror', e => errs.push(e.message));
  await page2.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page2.waitForTimeout(1400);
  await page2.evaluate(() => { window.__safeTop = 100; window.dispatchEvent(new Event('resize')); });
  await page2.waitForTimeout(400);
  const r2 = await page2.evaluate(() => ({
    oy: window.oy, VH: window.VH, s: window.view.s, rCy: window.restartBtn.cy,
    floorY: window.C.floorY, H: window.C.H,
    muteTop: window.MUTE.cy - window.MUTE.r + window.oy
  }));
  ok(Math.abs(r2.oy - (100 / r2.s - 20)) < 0.5, '胶囊下压仍生效（oy=' + r2.oy.toFixed(1) + '）');
  ok(r2.rCy === 701, '长屏下按钮仍在块内 701（cy=' + r2.rCy + '，不随屏高下移）');
  ok(Math.abs((r2.rCy - r2.floorY) - 28) < 0.5, '长屏下与容器底距离仍是 28px');
  ok(r2.muteTop >= 100 / r2.s - 0.5, '静音圆顶缘不低于胶囊下缘');

  // 底部带下方到屏底由海床/渐变延伸填充（无缝）：屏底像素应为深水色而非背景断裂
  const bot = await page2.evaluate(() => {
    var c2 = document.getElementById('game').getContext('2d');
    var t = c2.getTransform(), k = t.a, oyT = t.f;
    function px(x, y) {
      var d = c2.getImageData(Math.round(k * x + t.e), Math.round(k * y + oyT), 1, 1).data;
      return [d[0], d[1], d[2]];
    }
    return { at747: px(210, 746), at780: px(210, 780), atBottom: px(210, 978) };
  });
  var d1 = Math.abs(bot.at747[0] - bot.at780[0]) + Math.abs(bot.at747[1] - bot.at780[1]) + Math.abs(bot.at747[2] - bot.at780[2]);
  ok(d1 <= 12, '块底 747 与屏底之间为连续延伸（色差 ' + d1 + ' ≤ 12，无明暗接缝）');
  ok(bot.atBottom[2] > bot.atBottom[0], '屏底仍为海水色（b=' + bot.atBottom[2] + ' > r=' + bot.atBottom[0] + '）');

  await page2.mouse.click(210, 396 * r2.s);
  await page2.waitForTimeout(900);
  await page2.screenshot({ path: path.join(__dirname, 'v163_play_980_capsule.png') });
  const st2 = await page2.evaluate(() => window.state);
  ok(st2 === 'play', '长屏+胶囊可正常开局（state=' + st2 + '）');

  // 底部按钮点击链路（重开右下角，长屏+胶囊下仍在块内 701 位置）
  const hit = await page2.evaluate(() => {
    var sy = (701 + window.oy) * window.view.s; // 块内 701 → 屏幕逻辑 → 设备 px
    return { sy: sy, expected: 701 + window.oy };
  });
  await page2.mouse.click(396, hit.sy);
  await page2.waitForTimeout(300);
  const conf = await page2.evaluate(() => window.confirmOpen);
  ok(conf === true, '点击右下重开按钮仍命中（弹出确认框，屏幕 y=' + hit.sy.toFixed(0) + '）');

  ok(errs.length === 0, '零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
