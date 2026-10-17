// 诊断：宽屏下点击开始按钮为何无效
const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const base = 'file://' + require('path').resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => console.log('[console]', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', String(e)));
  await page.goto(base);
  await page.waitForFunction(() => window.MG && window.MG.probe, null, { timeout: 8000 });

  const info = await page.evaluate(() => {
    var c = document.getElementById('game');
    var r = c.getBoundingClientRect();
    return {
      canvasRect: { x: r.x, y: r.y, w: r.width, h: r.height },
      canvasAttr: { w: c.width, h: c.height },
      style: { w: c.style.width, h: c.style.height },
      iw: innerWidth, ih: innerHeight,
      state: window.MG.probe().state,
      menuBtn: window.MG.debug.menuBtn(),
      bodyMargin: getComputedStyle(document.body).margin
    };
  });
  console.log(JSON.stringify(info, null, 1));

  // 点击按钮中心
  const b = info.menuBtn;
  const s = Math.min(info.iw / 420, info.ih / 747);
  const cx = (b.x + b.w / 2) * s, cy = (b.y + b.h / 2) * s;
  console.log('click at', cx, cy, 's=', s);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(500);
  console.log('state after click:', await page.evaluate(() => window.MG.probe().state));

  // 再试：直接派发 pointerdown/up 到 canvas
  const r2 = await page.evaluate(() => {
    var c = document.getElementById('game');
    var rect = c.getBoundingClientRect();
    function pe(type, x, y) {
      var ev = new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true });
      c.dispatchEvent(ev);
    }
    pe('pointerdown', 225, 456); pe('pointerup', 225, 456);
    return { rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } };
  });
  await page.waitForTimeout(500);
  console.log('state after dispatch:', await page.evaluate(() => window.MG.probe().state), JSON.stringify(r2));

  await browser.close();
})();
