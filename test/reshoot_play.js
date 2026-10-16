// 重拍对局截图：成型水堆 + 进度条有内容的中局状态
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1600);

  // 进入对局
  await page.mouse.click(210, 426);
  await page.waitForTimeout(300);

  // 分层投放：底层大滴、上层小滴，模拟真实玩到中局的堆积
  // [tier, x] —— x 拉开间距避免重叠求解慢
  const drops = [
    [3, 110], [3, 310], [4, 210],          // 底层骨架
    [2, 70], [2, 160], [2, 260], [2, 350], // 二层铺开
    [3, 130], [3, 290],                    // 又一层
    [1, 100], [1, 180], [1, 240], [1, 320], // 顶层小滴
    [2, 150], [2, 270],
  ];
  for (const [t, x] of drops) {
    await page.evaluate(([t, x]) => { MG.debug.setNext({ tier: t }); MG.debug.drop(x); }, [t, x]);
    await page.waitForTimeout(520);
  }
  await page.waitForTimeout(2200); // 等物理沉降 + 合成完成

  // 给一点累计分，让海域进度条呈现中局进度（潮汐池 → 珊瑚浅海 途中的观感）
  await page.evaluate(() => { MG.debug.addScore(96); });
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(__dirname, 'doc_play.png') });
  console.log('PLAY SHOT OK');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
