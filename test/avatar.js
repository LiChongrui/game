// 小程序头像生成：840×840 方形（平台自动裁圆），笑脸水滴主体 + 深海渐变
const { chromium } = require('playwright-core');
const path = require('path');

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:840px; height:840px; overflow:hidden; position:relative;
    background:radial-gradient(circle at 50% 42%, #1C669C 0%, #11517E 40%, #0E3A5C 68%, #0A1538 100%); }
  /* 气泡 */
  .bub { position:absolute; border-radius:50%;
    background:radial-gradient(circle at 32% 30%, rgba(255,255,255,.4), rgba(174,224,244,.06) 68%); }
  .ring { position:absolute; border-radius:50%; border:3px solid rgba(174,224,244,.22); }
  /* 主角：笑脸水滴 */
  .drop { position:absolute; left:50%; top:47%; width:480px; height:480px;
    transform:translate(-50%,-50%); filter:drop-shadow(0 18px 44px rgba(0,10,30,.6)); }
  /* 王座小皇冠：点题深渊王座 */
  .crown { position:absolute; right:104px; top:96px; width:130px; height:130px; opacity:.95;
    filter:drop-shadow(0 8px 18px rgba(0,10,30,.55)); }
</style></head>
<body>
  <div class="bub" style="left:120px;top:170px;width:52px;height:52px"></div>
  <div class="bub" style="left:210px;top:330px;width:28px;height:28px"></div>
  <div class="bub" style="right:180px;top:360px;width:40px;height:40px"></div>
  <div class="bub" style="right:120px;bottom:200px;width:24px;height:24px"></div>
  <div class="bub" style="left:150px;bottom:140px;width:34px;height:34px"></div>
  <div class="ring" style="left:96px;top:96px;width:70px;height:70px"></div>
  <div class="ring" style="right:210px;top:120px;width:36px;height:36px"></div>

  <img class="drop" src="tier3.png">
  <img class="crown" src="sea7.png">
</body></html>`;

(async () => {
  const fs = require('fs');
  const tmp = path.join(__dirname, 'icons', '_avatar.html');
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 840, height: 840 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + tmp.replace(/\\/g, '/'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, '..', '头像_小程序840.png') });

  // 附赠 144px 实际显示尺寸预览（方形 + 圆形裁切各一张，检查小图可读性）
  const prev = await browser.newPage({ viewport: { width: 340, height: 200 } });
  await prev.goto('file:///' + tmp.replace(/\\/g, '/'));
  await prev.waitForTimeout(400);
  await prev.evaluate(() => {
    document.body.style.width = '144px'; document.body.style.height = '144px';
    document.querySelectorAll('.bub,.ring,.crown,.wave').forEach(e => e.remove());
    document.body.style.cssText += 'position:fixed;left:0;top:0;transform:scale(0.1714);transform-origin:0 0;';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:#f0f0f0;z-index:-1';
    document.body.appendChild(wrap);
  });
  await prev.close();
  await browser.close();
  fs.unlinkSync(tmp);
  console.log('AVATAR OK');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
