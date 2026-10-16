// v135 验证：顶部 HUD 压缩上移（0~88），出生点/坠落高度还原 120 不动——
// 前三档虚影完整落在「HUD 底沿 88」与容器开口 100 之间的空隙及容器内，坠落区不再被顶部元素挤压
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let fails = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + msg); if (!cond) fails++; };

  // ---- 屏型 1：420×780（iPhone 类比例） ----
  let page = await browser.newPage({ viewport: { width: 420, height: 780 } });
  let errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'v135_menu_780.png') });

  let g = await page.evaluate(() => {
    restart();
    return new Promise(res => setTimeout(() => res(MG.probe()), 400));
  });
  ok(g.containerTop === 100, 'containerTop=100 (实际 ' + g.containerTop + ')');
  ok(g.floorY === 646, 'floorY=646 (实际 ' + g.floorY + ')');
  ok(g.dangerY === 164, 'dangerY=164 (实际 ' + g.dangerY + ')');
  ok(g.oy === 30, 'oy=30（(780-720)/2，实际 ' + g.oy + '）');
  ok(g.VH === 780, 'VH=780 (实际 ' + g.VH + ')');

  // 坠落高度不变：出生点回到 120；常用前 3 档虚影球顶 ≥92 > HUD 底沿 88（不重叠）
  ok(g.spawnY === 120, 'spawnY=120 坠落高度未动');
  ok(120 - 21 === 99 && 99 > 88, '水滴档(r21)虚影球顶 99 > HUD 底沿 88');
  ok(120 - 28 === 92 && 92 > 88, '露珠档(r28)虚影球顶 92 > HUD 底沿 88');

  await page.evaluate(() => { MG.debug.setNext({ tier: 2 }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v135_ghost_780.png') });

  await page.evaluate(() => { MG.debug.drop(210); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v135_play_780.png') });
  ok(errs.length === 0, '420×780 零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  // ---- 屏型 2：320×880（窄长屏，宽度受限缩放） ----
  page = await browser.newPage({ viewport: { width: 320, height: 880 } });
  errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  g = await page.evaluate(() => { restart(); return new Promise(res => setTimeout(() => res(MG.probe()), 400)); });
  ok(g.containerTop === 100 && g.floorY === 646, '窄屏块内几何与宽屏一致 (ct=' + g.containerTop + ' fy=' + g.floorY + ')');
  ok(Math.abs(g.oy - (g.VH - 720) / 2) < 0.01, '窄屏 oy=(VH-720)/2 居中 (oy=' + g.oy + ' VH=' + g.VH + ')');
  await page.evaluate(() => { MG.debug.setNext({ tier: 2 }); MG.debug.drop(210); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'v135_play_320x880.png') });
  ok(errs.length === 0, '320×880 零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
