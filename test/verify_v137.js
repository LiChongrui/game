// v137 验证：容器区域恢复 528px 恒定不变（核心约束）——
// 块 420×747 (9:16)：顶部 HUD 0~100 + 出生空隙带 + 容器 145~673=528 + 底部 74；
// 坠落高度 spawnY=120 恒定；双屏型几何一致 + 零报错
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let fails = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) fails++; };

  // ---- 屏型 1：420×780 ----
  let page = await browser.newPage({ viewport: { width: 420, height: 780 } });
  let errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'v137_menu_780.png') });

  let g = await page.evaluate(() => {
    restart();
    return new Promise(res => setTimeout(() => res(MG.probe()), 400));
  });
  ok(g.containerTop === 145, 'containerTop=145 (实际 ' + g.containerTop + ')');
  ok(g.floorY === 673, 'floorY=673 (实际 ' + g.floorY + ')');
  ok(g.floorY - g.containerTop === 528, '容器高度 528 恒定不变（实际 ' + (g.floorY - g.containerTop) + '）');
  ok(g.dangerY === 209, 'dangerY=209 (实际 ' + g.dangerY + ')');
  ok(g.spawnY === 120, 'spawnY=120 坠落高度恒定');
  ok(Math.abs(g.oy - 16.5) < 0.01, 'oy=16.5（(780-747)/2，实际 ' + g.oy + '）');
  ok(g.VH === 780, 'VH=780 (实际 ' + g.VH + ')');
  ok(Math.abs(420 / 747 - 9 / 16) < 0.001, '块比例 ' + (420 / 747).toFixed(4) + ' ≈ 9/16');

  await page.evaluate(() => { MG.debug.setNext({ tier: 2 }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v137_ghost_780.png') });
  await page.evaluate(() => { MG.debug.drop(210); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v137_play_780.png') });
  ok(errs.length === 0, '420×780 零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  // ---- 屏型 2：320×880（窄长屏） ----
  page = await browser.newPage({ viewport: { width: 320, height: 880 } });
  errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  g = await page.evaluate(() => { restart(); return new Promise(res => setTimeout(() => res(MG.probe()), 400)); });
  ok(g.containerTop === 145 && g.floorY === 673, '窄屏容器几何与宽屏一致 (ct=' + g.containerTop + ' fy=' + g.floorY + ')');
  ok(g.floorY - g.containerTop === 528, '窄屏容器高度同为 528');
  ok(Math.abs(g.oy - (g.VH - 747) / 2) < 0.01, '窄屏 oy=(VH-747)/2 居中 (oy=' + g.oy + ' VH=' + g.VH + ')');
  await page.evaluate(() => { MG.debug.setNext({ tier: 2 }); MG.debug.drop(210); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'v137_play_320x880.png') });
  ok(errs.length === 0, '320×880 零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
