// 小程序头像生成 v2：满版构图——笑脸水滴撑满画面 + 头戴深渊王座皇冠
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:840px; height:840px; overflow:hidden; position:relative;
    background:radial-gradient(circle at 50% 38%, #1C669C 0%, #11517E 45%, #0E3A5C 75%, #0A1538 100%); }
  .bub { position:absolute; border-radius:50%;
    background:radial-gradient(circle at 32% 30%, rgba(255,255,255,.45), rgba(174,224,244,.06) 68%); }
  /* 主角：笑脸水滴撑满（宽约 88%，底部微微出画更有张力） */
  .drop { position:absolute; left:50%; top:54%; width:740px; height:740px;
    transform:translate(-50%,-50%); filter:drop-shadow(0 16px 40px rgba(0,10,30,.65)); }
  /* 皇冠：扣在水滴头顶左上（球面高光位），随球体微倾 */
  .crown { position:absolute; left:50%; top:14%; width:190px; height:190px;
    transform:translate(-95%,-5%) rotate(-14deg);
    filter:drop-shadow(0 6px 14px rgba(0,10,30,.55)); }
</style></head>
<body>
  <div class="bub" style="left:66px;top:120px;width:58px;height:58px"></div>
  <div class="bub" style="left:150px;top:300px;width:30px;height:30px"></div>
  <div class="bub" style="right:80px;top:170px;width:44px;height:44px"></div>
  <div class="bub" style="right:130px;bottom:150px;width:26px;height:26px"></div>
  <div class="bub" style="left:110px;bottom:110px;width:36px;height:36px"></div>
  <div class="bub" style="right:300px;top:60px;width:22px;height:22px"></div>

  <img class="drop" src="tier3.png">
  <img class="crown" src="sea7.png">
</body></html>`;

(async () => {
  const tmp = path.join(__dirname, 'icons', '_avatar2.html');
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 840, height: 840 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + tmp.replace(/\\/g, '/'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, '..', '头像_小程序840.png') });

  // 144 方形版 + 圆形裁切预览：加载刚生成的 840 成品图重采样
  const src = path.join(__dirname, '..', '头像_小程序840.png');
  const p2 = await browser.newPage({ viewport: { width: 300, height: 300 } });
  await p2.goto('file:///' + src.replace(/\\/g, '/'));
  await p2.evaluate(() => { const img = document.querySelector('img'); return new Promise(r => img.complete ? r() : img.onload = r); });
  const dataURLs = await p2.evaluate(() => {
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
  fs.writeFileSync(path.join(__dirname, '..', '头像_小程序144.png'), Buffer.from(dataURLs.sq.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(__dirname, '_avatar_round.png'), Buffer.from(dataURLs.round.split(',')[1], 'base64'));

  await browser.close();
  fs.unlinkSync(tmp);
  console.log('AVATAR V2 OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
