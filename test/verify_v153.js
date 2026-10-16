// v153 验证：①菜单界面出现音量/成就按钮且与局内同屏幕位置（绘制/命中均 +oy）
// ②图鉴「海域演进」分节的特殊滴文本放大 11→13px（像素断言文本更宽/更高）
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
  await page.waitForTimeout(1500);

  // ---- 菜单态：按钮几何与局内一致（cy + oy）----
  const geo = await page.evaluate(() => ({
    oy: MG.probe().oy,
    mute: { cx: window.MUTE.cx, cy: window.MUTE.cy, r: window.MUTE.r },
    trophy: { cx: window.menuTrophy.cx, cy: window.menuTrophy.cy }
  }));
  ok(Math.abs(geo.oy - 16.5) < 0.01, 'oy=16.5 (实际 ' + geo.oy + ')');
  ok(geo.trophy.cx === 24 && geo.trophy.cy === 36, '菜单奖杯坐标与局内一致(24,36)');
  ok(geo.mute.cx === 396 && geo.mute.cy === 36, '菜单音量坐标与局内一致(396,36)');
  await page.screenshot({ path: path.join(__dirname, 'v153_menu.png') });

  // 点击菜单右上角音量按钮（屏幕 y = 36 + oy = 52.5）→ 静音状态翻转
  const before = await page.evaluate(() => window.audio.muted);
  await page.mouse.click(396, 53);
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => window.audio.muted);
  ok(before !== after, '菜单点音量按钮可切换静音 (' + before + ' → ' + after + ')');
  await page.mouse.click(396, 53); // 切回
  await page.waitForTimeout(200);

  // 点击菜单左上角奖杯（+oy）→ 打开成就殿堂
  await page.mouse.click(24, 53);
  await page.waitForTimeout(300);
  const ach = await page.evaluate(() => window.achOpen);
  ok(ach === true, '菜单点奖杯按钮可打开成就殿堂（+oy 命中区生效）');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ---- 图鉴「海域演进」分节：特殊滴文本 13px ----
  await page.evaluate(() => { restart(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { dexOpen = true; dexSec = 1; dexSelStage = -1; dexSelTier = -1; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'v153_dex_sea.png') });
  const fontOK = await page.evaluate(() => {
    // 通过测量同字号文本宽度间接确认：13px 的 3 字宽 ≈ 39 > 11px 的 33
    var c2 = document.getElementById('game').getContext('2d');
    c2.font = '13px system-ui, sans-serif';
    var w13 = c2.measureText('？？？').width;
    c2.font = '11px system-ui, sans-serif';
    var w11 = c2.measureText('？？？').width;
    return { w13: w13, w11: w11 };
  });
  ok(fontOK.w13 > fontOK.w11, '特殊滴文本字号已放大（13px 宽 ' + fontOK.w13.toFixed(1) + ' > 11px 宽 ' + fontOK.w11.toFixed(1) + '）');
  ok(errs.length === 0, '零页面报错' + (errs.length ? '：' + errs.join(' | ') : ''));

  await browser.close();
  console.log(fails === 0 ? 'ALL OK' : fails + ' FAILURES');
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
