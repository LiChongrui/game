// 单独跑一次：清档进局截图（看条内当前海域文字），并验证后期长海域名不溢出
const { chromium } = require('playwright-core');
const path = require('path');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await b.newPage({ viewport: { width: 420, height: 780 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1400);
  await page.evaluate(() => { restart(); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(__dirname, 'v159_bar_text.png') });
  // 后期：把累计分顶到较深海域，检查条内文字缩字号后不超出徽章之间
  const w = await page.evaluate(() => {
    var c2 = document.getElementById('game').getContext('2d');
    var samples = [['潮汐池','珊瑚浅海',2650],['深渊王座','热泉裂谷',120000],['海沟之眼','深渊王座',300000]];
    var out = [];
    for (var i = 0; i < samples.length; i++) {
      var s = samples[i];
      var label = s[0] + ' → 距「' + s[1] + '」还差 ' + s[2] + ' 分';
      var lf = 13; c2.font = 'bold 13px system-ui, sans-serif';
      while (lf > 10 && c2.measureText(label).width > (420 - 48) - 84) { lf--; c2.font = 'bold ' + lf + 'px system-ui, sans-serif'; }
      out.push({ label: label, font: lf, w: Math.round(c2.measureText(label).width), max: (420 - 48) - 84 });
    }
    return out;
  });
  console.log(JSON.stringify(w, null, 1));
  console.log(errs.length ? 'ERR ' + errs.join('|') : 'NO ERR');
  await b.close();
})();
