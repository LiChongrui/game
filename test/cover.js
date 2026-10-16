// 公众号封面生成：用游戏真实图标素材合成 900×383 首图 + 200×200 次图
const { chromium } = require('playwright-core');
const path = require('path');

const tiers = ['tier0', 'tier1', 'tier2', 'tier3', 'tier4', 'tier5', 'tier6', 'tier7', 'tier8'];

// 首图 900×383：左侧标题文案，右侧水滴合成链拱形排列
const coverHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:900px; height:383px; overflow:hidden; font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;
    background:linear-gradient(115deg,#0A1538 0%,#0E3A5C 42%,#11517E 72%,#1C669C 100%); position:relative; }
  /* 气泡装饰 */
  .bub { position:absolute; border-radius:50%; border:1.5px solid rgba(174,224,244,.35); }
  .bub.f { background:radial-gradient(circle at 32% 30%, rgba(255,255,255,.5), rgba(174,224,244,.08) 65%); border:none; }
  /* 光柱 */
  .beam { position:absolute; top:-40px; width:150px; height:500px;
    background:linear-gradient(180deg,rgba(120,200,240,.14),rgba(120,200,240,0));
    transform:rotate(18deg); }
  .left { position:absolute; left:56px; top:0; height:100%; display:flex; flex-direction:column; justify-content:center; }
  h1 { color:#fff; font-size:74px; letter-spacing:14px; font-weight:800;
    text-shadow:0 4px 24px rgba(0,10,30,.6); }
  .tag { margin-top:16px; color:#BDE9F7; font-size:20px; letter-spacing:5px; opacity:.95; }
  .url { margin-top:26px; display:inline-flex; align-self:flex-start; align-items:center; gap:10px;
    background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.35);
    border-radius:999px; padding:9px 26px; color:#fff; font-size:19px; font-weight:700; letter-spacing:1px; }
  .url .dot { width:8px; height:8px; border-radius:50%; background:#5EEAD4; box-shadow:0 0 10px #5EEAD4; }
  /* 右侧合成链：小→大拱形上升 */
  .chain { position:absolute; right:44px; bottom:34px; display:flex; align-items:flex-end; gap:2px; }
  .chain img { filter:drop-shadow(0 6px 12px rgba(0,10,30,.55)); }
  .chain .ar { color:rgba(255,255,255,.4); font-size:13px; align-self:center; margin:0 3px 30px; }
  .crown { position:absolute; right:36px; top:40px; width:56px; height:56px; opacity:.95;
    filter:drop-shadow(0 4px 10px rgba(0,10,30,.5)); }
</style></head>
<body>
  <div class="beam" style="left:560px"></div>
  <div class="beam" style="left:740px;opacity:.7"></div>
  <div class="bub f" style="left:470px;top:60px;width:14px;height:14px"></div>
  <div class="bub f" style="left:520px;top:210px;width:9px;height:9px"></div>
  <div class="bub" style="left:440px;top:280px;width:22px;height:22px"></div>
  <div class="bub f" style="left:840px;top:70px;width:12px;height:12px"></div>
  <div class="bub" style="left:60px;top:52px;width:26px;height:26px;opacity:.5"></div>

  <div class="left">
    <h1>水滴合成深海</h1>
    <div class="tag">一缕雾泡 · 汇入深渊王座</div>
    <div class="url"><span class="dot"></span>game.luosgeo.com</div>
  </div>

  <img class="crown" src="sea7.png">
  <div class="chain">
    ${tiers.slice(0, 8).map((t, i) => `<img src="${t}.png" style="width:${18 + i * 9}px;height:${18 + i * 9}px">`).join('<span class="ar">›</span>')}
  </div>
</body></html>`;

// 次图 200×200：大水滴 + 标题
const squareHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:200px; height:200px; overflow:hidden; font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;
    background:linear-gradient(150deg,#0A1538,#11517E 70%,#1C669C); position:relative; text-align:center; }
  .bub { position:absolute; border-radius:50%; border:1px solid rgba(174,224,244,.35); }
  .drop { width:84px; height:84px; margin-top:26px; filter:drop-shadow(0 4px 10px rgba(0,10,30,.6)); }
  .nm { color:#fff; font-size:26px; font-weight:800; letter-spacing:6px; margin-top:6px; text-shadow:0 2px 10px rgba(0,10,30,.6); }
  .sub { color:#BDE9F7; font-size:10.5px; letter-spacing:2px; margin-top:4px; opacity:.9; }
</style></head>
<body>
  <div class="bub" style="left:16px;top:24px;width:14px;height:14px"></div>
  <div class="bub" style="right:20px;top:60px;width:10px;height:10px"></div>
  <div class="bub" style="right:34px;bottom:24px;width:8px;height:8px"></div>
  <img class="drop" src="tier3.png">
  <div class="nm">水滴合成深海</div>
  <div class="sub">合成 · 潜入深渊王座</div>
</body></html>`;

(async () => {
  const fs = require('fs');
  fs.writeFileSync(path.join(__dirname, 'icons', '_cover.html'), coverHTML);
  fs.writeFileSync(path.join(__dirname, 'icons', '_square.html'), squareHTML);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 383 }, deviceScaleFactor: 2 });

  await page.goto('file:///' + path.join(__dirname, 'icons', '_cover.html').replace(/\\/g, '/'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, '..', '封面_公众号900x383.png') });

  await page.setViewportSize({ width: 200, height: 200 });
  await page.goto('file:///' + path.join(__dirname, 'icons', '_square.html').replace(/\\/g, '/'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, '..', '封面_公众号200x200.png') });

  await browser.close();
  fs.unlinkSync(path.join(__dirname, 'icons', '_cover.html'));
  fs.unlinkSync(path.join(__dirname, 'icons', '_square.html'));
  console.log('COVER OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
