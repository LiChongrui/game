// 文档图标导出：用 MG.debug.icon 把游戏内图形画到主画布，逐个截图裁剪成 PNG（test/icons/）
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'icons');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const SPECS = [
  // 合成链 9 档
  ...['雾泡', '水滴', '露珠', '浪花', '溪流', '湖泊', '江河', '大海', '沧海'].map((n, i) => ({ kind: 'tier', id: i, name: 'tier' + i })),
  // 特殊滴 15 种
  ...['vortex', 'cloud', 'iron', 'ice', 'rune', 'rainbow', 'gale', 'magnet', 'spring', 'thunder', 'pearl', 'magma', 'geyser', 'void', 'aurora']
    .map(k => ({ kind: 'sp', id: k, name: 'sp_' + k })),
  // 海域徽章 8 枚
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ kind: 'sea', id: i, name: 'sea' + i })),
  // 技能 4 枚 + 宝箱 + 深渊潜航
  ...['swap', 'ripple', 'evap', 'flow'].map(k => ({ kind: 'skill', id: k, name: 'skill_' + k })),
  { kind: 'chest', id: 0, name: 'chest' },
  { kind: 'ng', id: 0, name: 'ng' }
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 720 }, deviceScaleFactor: 2 });
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('PAGEERROR', e.message); });

  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);

  // 冻结渲染循环，画布交给 icon 钩子手绘
  await page.evaluate(() => { MG.debug.headless = true; });

  const CX = 60, CY = 60;
  for (const s of SPECS) {
    await page.evaluate(([kind, id, x, y]) => { MG.debug.icon(kind, id, x, y); }, [s.kind, s.id, CX, CY]);
    await page.screenshot({ path: path.join(OUT, s.name + '.png'), clip: { x: CX - 48, y: CY - 48, width: 96, height: 96 } });
  }
  console.log('导出图标:', SPECS.length, '个');
  console.log('页面错误:', errs);
  console.log(errs === 0 ? 'ICONS OK' : 'ICONS FAIL');
  await browser.close();
  process.exit(errs === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
