// 小程序头像生成 v3：满版海底叙事——戴冠大水滴 + 小水滴螺旋汇入 + 光柱/海草/宝箱
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:840px; height:840px; overflow:hidden; position:relative;
    background:linear-gradient(178deg,#2E86B4 0%,#1C669C 22%,#11517E 48%,#0E3A5C 72%,#0A1538 100%); }
  /* 顶部光柱 */
  .beam { position:absolute; top:-60px; height:640px; transform:rotate(16deg);
    background:linear-gradient(180deg,rgba(140,215,245,.22),rgba(140,215,245,0)); }
  .bub { position:absolute; border-radius:50%;
    background:radial-gradient(circle at 32% 30%, rgba(255,255,255,.5), rgba(174,224,244,.05) 66%); }
  /* 底部海草剪影 */
  .weed { position:absolute; bottom:0; opacity:.85; }
  /* 主角：戴冠大水滴，偏右下坐镇 */
  .drop { position:absolute; left:57%; top:56%; width:600px; height:600px;
    transform:translate(-50%,-50%); filter:drop-shadow(0 20px 46px rgba(0,8,25,.7)); }
  .crown { position:absolute; left:57%; top:21%; width:200px; height:200px;
    transform:translate(-102%,-6%) rotate(-15deg);
    filter:drop-shadow(0 8px 16px rgba(0,8,25,.6)); }
  /* 小水滴螺旋汇入（合成链叙事：左下→上方绕入大滴） */
  .s { position:absolute; filter:drop-shadow(0 6px 14px rgba(0,8,25,.5)); }
  /* 宝箱微光 */
  .chest { position:absolute; right:74px; bottom:96px; width:110px; height:110px;
    filter:drop-shadow(0 0 26px rgba(255,208,96,.55)); }
  .glow { position:absolute; border-radius:50%;
    background:radial-gradient(circle,rgba(255,208,96,.28),rgba(255,208,96,0) 70%); }
</style></head>
<body>
  <div class="beam" style="left:430px;width:190px"></div>
  <div class="beam" style="left:640px;width:120px;opacity:.65"></div>
  <div class="beam" style="left:250px;width:90px;opacity:.45"></div>

  <!-- 海草剪影（左右两丛，曲线简单干净） -->
  <svg class="weed" style="left:-10px" width="240" height="210" viewBox="0 0 240 210">
    <path d="M30 210 C20 150 45 120 28 60 C60 110 48 150 58 210 Z" fill="#081C33"/>
    <path d="M75 210 C90 140 60 100 88 30 C95 100 110 140 105 210 Z" fill="#0A2540"/>
    <path d="M130 210 C120 160 145 130 132 80 C160 125 152 165 160 210 Z" fill="#081C33"/>
  </svg>
  <svg class="weed" style="right:-10px" width="200" height="160" viewBox="0 0 200 160">
    <path d="M40 160 C55 100 25 70 50 10 C60 80 75 100 70 160 Z" fill="#0A2540"/>
    <path d="M110 160 C100 120 125 95 110 40 C140 90 128 125 138 160 Z" fill="#081C33"/>
  </svg>

  <div class="bub" style="left:340px;top:80px;width:34px;height:34px"></div>
  <div class="bub" style="left:640px;top:150px;width:24px;height:24px"></div>
  <div class="bub" style="left:90px;top:270px;width:26px;height:26px"></div>
  <div class="bub" style="right:170px;top:330px;width:30px;height:30px"></div>
  <div class="bub" style="left:210px;bottom:200px;width:22px;height:22px"></div>

  <!-- 小水滴螺旋汇入：由远及近排成弧线 -->
  <img class="s" src="tier0.png" style="left:88px;top:520px;width:86px;height:86px;opacity:.9">
  <img class="s" src="tier1.png" style="left:160px;top:390px;width:120px;height:120px;opacity:.95">
  <img class="s" src="tier2.png" style="left:190px;top:236px;width:170px;height:170px">

  <!-- 主角与王冠 -->
  <img class="drop" src="tier4.png">
  <img class="crown" src="sea7.png">

  <!-- 宝箱：右下角带光晕的点睛 -->
  <div class="glow" style="right:29px;bottom:51px;width:200px;height:200px"></div>
  <img class="chest" src="chest.png">
</body></html>`;

(async () => {
  const tmp = path.join(__dirname, 'icons', '_avatar3.html');
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 840, height: 840 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + tmp.replace(/\\/g, '/'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, '..', '头像_小程序840.png') });

  // 144 方形 + 圆形裁切预览
  const src = path.join(__dirname, '..', '头像_小程序840.png');
  const p2 = await browser.newPage({ viewport: { width: 300, height: 300 } });
  await p2.goto('file:///' + src.replace(/\\/g, '/'));
  await p2.evaluate(() => { const img = document.querySelector('img'); return new Promise(r => img.complete ? r() : img.onload = r); });
  const out = await p2.evaluate(() => {
    const img = document.querySelector('img');
    const mk = round => {
      const cv = document.createElement('canvas'); cv.width = 144; cv.height = 144;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      if (round) { ctx.beginPath(); ctx.arc(72, 72, 72, 0, Math.PI * 2); ctx.clip(); }
      ctx.drawImage(img, 0, 0, 840, 840, 0, 0, 144, 144);
      return cv.toDataURL('image/png');
    };
    return { sq: mk(false), round: mk(true) };
  });
  fs.writeFileSync(path.join(__dirname, '..', '头像_小程序144.png'), Buffer.from(out.sq.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(__dirname, '_avatar_round.png'), Buffer.from(out.round.split(',')[1], 'base64'));

  await browser.close();
  fs.unlinkSync(tmp);
  console.log('AVATAR V3 OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
