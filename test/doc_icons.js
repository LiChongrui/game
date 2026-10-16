// 文档图标导出：调用 MG.debug.iconData 在离屏 canvas 渲染，返回真透明 PNG dataURL 直存文件（test/icons/）
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
  const page = await browser.newPage({ viewport: { width: 420, height: 720 } });
  let errs = 0;
  page.on('pageerror', e => { errs++; console.log('PAGEERROR', e.message); });

  await page.addInitScript(() => { if (localStorage.getItem('__init') !== '1') { localStorage.clear(); localStorage.setItem('__init', '1'); } });
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(1200);

  for (const s of SPECS) {
    const dataURL = await page.evaluate(([kind, id]) => MG.debug.iconData(kind, id), [s.kind, s.id]);
    fs.writeFileSync(path.join(OUT, s.name + '.png'), Buffer.from(dataURL.split(',')[1], 'base64'));
  }
  console.log('导出图标:', SPECS.length, '个');
  console.log('页面错误:', errs);
  console.log(errs === 0 ? 'ICONS OK' : 'ICONS FAIL');
  await browser.close();
  process.exit(errs === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
