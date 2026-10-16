// v134 验证：游戏块 420×736（HUD 132 与容器分离），出生点 182 下移——
// 顶部元素（任务条/海域进度条）不再遮挡水滴坠落区，最大档虚影(r=45)完整可见
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
  await page.screenshot({ path: path.join(__dirname, 'v134_menu_780.png') });

  // 几何断言：块内常量 + 居中偏移
  let g = await page.evaluate(() => {
    // 进局：直接调 restart（绕过菜单点击的坐标换算）
    restart();
    return new Promise(res => setTimeout(() => res(MG.probe()), 400));
  });
  ok(g.containerTop === 132, 'containerTop=132 (实际 ' + g.containerTop + ')');
  ok(g.floorY === 662, 'floorY=662 (实际 ' + g.floorY + ')');
  ok(g.dangerY === 198, 'dangerY=198 (实际 ' + g.dangerY + ')');
  ok(g.oy === 22, 'oy=22（(780-736)/2，实际 ' + g.oy + '）');
  ok(g.VH === 780, 'VH=780 (实际 ' + g.VH + ')');

  // 最大档虚影（r=45）停在出生点：必须完整位于容器内、不与顶部元素重叠
  await page.evaluate(() => { MG.debug.setNext({ tier: 5 }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'v134_ghost45_780.png') });

  // 投下大滴，坠落过程不应被 HUD 盖住（截图肉眼复核 + 球心已入容器）
  await page.evaluate(() => { MG.debug.drop(210); });
  await page.waitForTimeout(350);
  let mid = await page.evaluate(() => {
    var b = phys.bodies[phys.bodies.length - 1];
    return { y: b.y, r: b.r, top: b.y - b.r };
  });
  ok(mid.top > 122, 'r45 水滴坠落时球顶 ' + Math.round(mid.top) + ' > HUD 底沿 122');
  await page.screenshot({ path: path.join(__dirname, 'v134_play_780.png') });
  ok(errs.length === 0, '420×780 零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  // ---- 屏型 2：320×880（窄长屏，宽度受限缩放） ----
  page = await browser.newPage({ viewport: { width: 320, height: 880 } });
  errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1500);
  g = await page.evaluate(() => { restart(); return new Promise(res => setTimeout(() => res(MG.probe()), 400)); });
  ok(g.containerTop === 132 && g.floorY === 662, '窄屏块内几何与宽屏一致 (ct=' + g.containerTop + ' fy=' + g.floorY + ')');
  ok(g.oy === Math.round((g.VH - 736) / 2 * 100) / 100 || Math.abs(g.oy - (g.VH - 736) / 2) < 0.01,
    '窄屏 oy=(VH-736)/2 居中 (oy=' + g.oy + ' VH=' + g.VH + ')');
  await page.evaluate(() => { MG.debug.setNext({ tier: 5 }); MG.debug.drop(210); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'v134_play_320x880.png') });
  ok(errs.length === 0, '320×880 零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));
  await page.close();

  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
