// 生成《滴水成海》游戏说明文档（单文件 HTML，截图/图标 base64 内嵌；图标由 doc_icons.js 预先导出到 test/icons/）
const fs = require('fs');
const path = require('path');

const img = n => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'doc_' + n + '.png')).toString('base64');
const ico = n => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'icons', n + '.png')).toString('base64');

const css = `
  :root { --ink:#0E3A5C; --sub:#4A7FA0; --line:#D8E8F2; --card:#F4FAFD; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif; color:var(--ink); background:linear-gradient(180deg,#0E3A5C 0%,#11517E 340px,#EAF5FB 340px); }
  .wrap { max-width:860px; margin:0 auto; padding:0 20px 60px; }
  header { text-align:center; padding:52px 0 42px; color:#fff; }
  header h1 { font-size:44px; letter-spacing:6px; }
  header p.tag { margin-top:12px; font-size:16px; opacity:.85; letter-spacing:2px; }
  .play { display:inline-block; margin-top:22px; padding:12px 42px; background:#fff; color:#0E5A8A; border-radius:999px; font-size:17px; font-weight:700; text-decoration:none; box-shadow:0 4px 18px rgba(0,20,40,.25); }
  .play:hover { transform:translateY(-1px); }
  section { background:#fff; border-radius:14px; padding:26px 30px; margin-top:22px; box-shadow:0 2px 10px rgba(14,58,92,.07); }
  h2 { font-size:21px; padding-left:12px; border-left:4px solid #2E86B4; margin-bottom:14px; }
  h3 { font-size:16px; margin:16px 0 8px; color:#1B5E86; }
  p, li { font-size:14.5px; line-height:1.85; color:#28516B; }
  ul { padding-left:22px; }
  .shots { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; margin:16px 0 4px; }
  figure { width:236px; text-align:center; }
  figure img { width:100%; border-radius:12px; border:1px solid var(--line); box-shadow:0 3px 12px rgba(14,58,92,.12); }
  figcaption { font-size:12.5px; color:var(--sub); margin-top:6px; }
  table { width:100%; border-collapse:collapse; margin:10px 0 4px; font-size:13.5px; }
  th, td { border:1px solid var(--line); padding:7px 10px; text-align:left; line-height:1.6; vertical-align:middle; }
  th { background:var(--card); color:#1B5E86; white-space:nowrap; }
  tr:nth-child(even) td { background:#FBFDFF; }
  td img.ic, li img.ic, p img.ic { height:30px; vertical-align:middle; margin-right:6px; }
  .chain { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin:14px 0 6px; }
  .chain .it { width:82px; text-align:center; background:var(--card); border:1px solid var(--line); border-radius:10px; padding:8px 2px 7px; }
  .chain .it img { width:56px; height:56px; }
  .chain .it .nm { font-size:13px; font-weight:700; color:#155A8A; margin-top:2px; }
  .chain .it .sc { font-size:11.5px; color:var(--sub); }
  .chain.seas .it { width:88px; }
  .chain.seas .it img { width:44px; height:44px; margin-top:5px; }
  .tips li { margin:6px 0; }
  .kbd { background:var(--card); border:1px solid var(--line); border-radius:5px; padding:1px 7px; font-size:12.5px; color:#1B5E86; }
  footer { text-align:center; color:#7FA6BC; font-size:12.5px; margin-top:30px; line-height:1.9; }
  b.hl { color:#C25A3A; }
`;

// 合成链 9 档图标格
const TIERS = [['tier0','雾泡',1],['tier1','水滴',3],['tier2','露珠',6],['tier3','浪花',10],['tier4','溪流',15],['tier5','湖泊',21],['tier6','江河',29],['tier7','大海',38],['tier8','沧海',50]];
const chainHtml = TIERS.map(t => `<div class="it"><img src="${ico(t[0])}" alt="${t[1]}"><div class="nm">${t[1]}</div><div class="sc">${t[2]} 分</div></div>`).join('');

// 海域 8 枚图标格
const SEAS = [['sea0','潮汐池',0],['sea1','珊瑚浅海','3 千'],['sea2','蔚蓝深海','1 万'],['sea3','午夜深渊','2.5 万'],['sea4','月光环礁','5 万'],['sea5','海沟之眼','10 万'],['sea6','热泉裂谷','18 万'],['sea7','深渊王座','30 万']];
const seasHtml = SEAS.map(s => `<div class="it"><img src="${ico(s[0])}" alt="${s[1]}"><div class="nm">${s[1]}</div><div class="sc">${s[2]} 分</div></div>`).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>滴水成海 · 游戏说明</title>
<style>${css}</style>
</head>
<body>
<header>
  <h1>滴水成海</h1>
  <p class="tag">同种水滴相融合成 · 从一缕雾泡汇入深渊王座</p>
  <a class="play" href="https://game.luosgeo.com" target="_blank">▶ 在线试玩：game.luosgeo.com</a>
</header>
<div class="wrap">

<section>
  <h2>🚀 快速开始</h2>
  <ul>
    <li><b>在线玩</b>：手机或电脑浏览器打开 <b>https://game.luosgeo.com</b>，加载即玩。</li>
    <li><b>本地玩</b>：无需安装任何依赖，直接双击 <span class="kbd">index.html</span> 即可。</li>
    <li>支持触屏与鼠标：点击 / 拖动瞄准，松手投放。</li>
  </ul>
</section>

<section>
  <h2>🎮 基础玩法</h2>
  <div class="shots">
    <figure><img src="${img('menu')}" alt="开始界面"><figcaption>开始界面</figcaption></figure>
    <figure><img src="${img('play')}" alt="对局画面"><figcaption>对局中：任务 · 投放 · 合成</figcaption></figure>
  </div>
  <ul>
    <li>点击屏幕任意位置投放顶部虚影所示的水滴；<b>同档水滴相碰即合成下一级</b>，得分并产生连击加成。</li>
    <li><b>开局即无尽模式</b>：周期潮汐、礁石障碍、15 种特殊水滴随海域逐级解锁，且渐进加压越玩越狂。</li>
    <li><b>警戒线判负</b>：水滴堆积越过上部虚线并保持静止约 1 秒即本局结束；每局可看广告复活 2 次。</li>
    <li>顶部任务条会不断发布小目标（如「合成 3 个水滴」），完成即得奖励分，高分任务还会直接充满技能；右侧潮汐胶囊提示下次涨潮倒计时。</li>
    <li>任务条下方的<b>海域进度条</b>实时显示累计得分距下一海域还差多少分（填充色与当前海域同族，右端圆点即下一海域徽章色），满级后显示「已达最深海域」。</li>
  </ul>
  <h3>合成链（9 级）</h3>
  <div class="chain">${chainHtml}</div>
  <p style="text-align:center;font-size:12.5px;color:var(--sub)">同档相融合成下一档 · 单次得分为合成时所得分数</p>
</section>

<section>
  <h2>✨ 四大技能</h2>
  <p>合成带<b>符文</b>的水滴可为对应技能 +1 充能，攒满次数点亮即可点击释放；技能按累计得分逐个解锁。</p>
  <table>
    <tr><th style="width:130px">技能</th><th>充能</th><th>解锁</th><th>效果</th></tr>
    <tr><td><img class="ic" src="${ico('skill_swap')}" alt="">换滴</td><td>4 次</td><td>开局即有</td><td>把当前待投水滴换成下一颗（救急调整阵容）</td></tr>
    <tr><td><img class="ic" src="${ico('skill_ripple')}" alt="">涟漪</td><td>6 次</td><td>累计 1,500 分</td><td>以水堆重心炸开双重波纹，把堆体推挤重排</td></tr>
    <tr><td><img class="ic" src="${ico('skill_evap')}" alt="">蒸发</td><td>10 次</td><td>累计 6,000 分</td><td>进入选择模式，点掉一枚碍事的水滴或礁石</td></tr>
    <tr><td><img class="ic" src="${ico('skill_flow')}" alt="">水流</td><td>6 次</td><td>累计 15,000 分</td><td>点选两枚水滴交换位置，精细调整合成组合</td></tr>
  </table>
</section>

<section>
  <h2>🎁 特殊水滴（15 种，随海域逐级解锁）</h2>
  <table>
    <tr><th style="width:140px">特殊滴</th><th style="width:96px">登场海域</th><th>效果</th></tr>
    <tr><td><img class="ic" src="${ico('sp_vortex')}" alt="">漩涡滴</td><td>潮汐池</td><td>吸附周围水滴再消散，聚拢散滴</td></tr>
    <tr><td><img class="ic" src="${ico('sp_cloud')}" alt="">雨云滴</td><td>潮汐池</td><td>分裂成两颗雾泡，补充低级水滴</td></tr>
    <tr><td><img class="ic" src="${ico('sp_iron')}" alt="">礁石</td><td>珊瑚浅海</td><td>沉重障碍无法合成；两两相消或蒸发移除</td></tr>
    <tr><td><img class="ic" src="${ico('sp_ice')}" alt="">冰晶滴</td><td>蔚蓝深海</td><td>冻结周围水滴，冻结滴可当临时平台</td></tr>
    <tr><td><img class="ic" src="${ico('sp_rune')}" alt="">符文滴</td><td>蔚蓝深海</td><td>合成时为对应技能 +1 充能</td></tr>
    <tr><td><img class="ic" src="${ico('sp_rainbow')}" alt="">彩虹滴</td><td>午夜深渊</td><td>碰到的水滴直接跳 2 级，得分双倍</td></tr>
    <tr><td><img class="ic" src="${ico('sp_gale')}" alt="">疾风滴</td><td>午夜深渊</td><td>落定刮风吹开周围水滴，腾出空间</td></tr>
    <tr><td><img class="ic" src="${ico('sp_magnet')}" alt="">磁石滴</td><td>月光环礁</td><td>更强更久的磁场漩涡，大范围聚滴</td></tr>
    <tr><td><img class="ic" src="${ico('sp_spring')}" alt="">甘霖滴</td><td>月光环礁</td><td>下一滴变成场上最多的档位</td></tr>
    <tr><td><img class="ic" src="${ico('sp_thunder')}" alt="">雷霆滴</td><td>海沟之眼</td><td>引雷让场上一对同档水滴直接合成</td></tr>
    <tr><td><img class="ic" src="${ico('sp_pearl')}" alt="">珍珠滴</td><td>海沟之眼</td><td>祝福最多的档位，该档全体升 1 级</td></tr>
    <tr><td><img class="ic" src="${ico('sp_magma')}" alt="">熔岩滴</td><td>热泉裂谷</td><td>烧毁周围礁石与最低两档水滴，折算得分</td></tr>
    <tr><td><img class="ic" src="${ico('sp_geyser')}" alt="">间歇泉滴</td><td>深渊王座</td><td>向上喷出垂直水柱，冲开上方水滴腾出空间</td></tr>
    <tr><td><img class="ic" src="${ico('sp_void')}" alt="">虚空滴</td><td>深渊王座</td><td>吞噬场上最低档水滴（至多 5 颗），折算高分</td></tr>
    <tr><td><img class="ic" src="${ico('sp_aurora')}" alt="">极光滴</td><td>深渊王座</td><td>极光庇护：下一次合成得分 ×3</td></tr>
  </table>
  <p style="margin-top:8px"><img class="ic" src="${ico('chest')}" alt=""><b>深海宝箱</b>：对局中偶有宝箱浮出，限时 14 秒点击开启可得随机奖励；涨潮间隙还有<b>随机深海事件</b>（漩涡风暴 / 涌泉）不期而至。</p>
</section>

<section>
  <h2>🌊 潮汐与海域演进</h2>
  <div class="shots">
    <figure><img src="${img('tide')}" alt="深渊王座满潮"><figcaption>深渊王座 · 满潮（潮位随海域上涨）</figcaption></figure>
  </div>
  <ul>
    <li><b>潮汐</b>：周期性涨潮（首潮前有 18 秒缓冲），浮力把全场水滴托起重排；潮水永不漫过警戒线，但会抬高堆体——潮退后是整理阵容的窗口期。涨潮前 3 秒有预警。</li>
    <li><b>海域演进</b>：按累计得分（跨局）从 8 大海域一路潜入，背景主题色随之平滑渐变：</li>
  </ul>
  <div class="chain seas">${seasHtml}</div>
</section>

<section>
  <h2>📖 图鉴 · 成就 · 每日 · 榜单</h2>
  <div class="shots">
    <figure><img src="${img('dex')}" alt="图鉴·海域演进"><figcaption>图鉴：合成链 / 海域演进双分节</figcaption></figure>
  </div>
  <ul>
    <li><b>图鉴</b>（左下书本钮）：合成链 9 档 + 海域演进 8 行，点选条目查看说明；未抵达的海域以 ??? 保持悬念。</li>
    <li><b>成就</b>（左上奖杯钮）：12 项成就分三档难度，完成得<b>永续加成</b>（如开局充能、连击窗口+0.3s）与称号；附每日三任务与好友榜单。</li>
  </ul>
</section>

<section>
  <h2>🏁 结算与「深渊潜航」二周目</h2>
  <div class="shots">
    <figure><img src="${img('over')}" alt="结算页"><figcaption>结算页：复活 / 双倍 / 分享 / 潜航 / 重开</figcaption></figure>
  </div>
  <ul>
    <li>结算页可<b>复活继续</b>、看广告<b>双倍结算</b>、<b>分享战报</b>（自动生成战绩文案）。</li>
    <li>累计 5 万分解锁 <img class="ic" src="${ico('ng')}" alt="深渊潜航" style="height:34px">（紫色按钮）：选择一条海况词缀重开一局，难度更高、得分倍率更高：</li>
  </ul>
  <table>
    <tr><th>词缀</th><th>海况</th><th>得分倍率</th></tr>
    <tr><td>重压之海</td><td>重力 +25%</td><td>×1.5</td></tr>
    <tr><td>疾风骤雨</td><td>潮汐间隔 -40%</td><td>×1.6</td></tr>
    <tr><td>暗礁密布</td><td>礁石概率 ×2</td><td>×1.5</td></tr>
    <tr><td>冰封之海</td><td>15% 水滴落水即冻</td><td>×1.4</td></tr>
  </table>
</section>

<section>
  <h2>💡 小贴士</h2>
  <ul class="tips">
    <li>大水滴沉底、小水滴留两侧：<b>让同档水滴自然相邻</b>比强行堆叠更容易触发连锁合成。</li>
    <li>连击（1.1 秒窗口）叠加得分倍率，最高 ×4——<b>连续快合成</b>是高分关键。</li>
    <li>潮汐涨起时别慌，浮起的水滴正是<b>重排阵容、触发连环合成</b>的好机会。</li>
    <li>漩涡 / 疾风 / 间歇泉都能救急腾空间；蒸发留着专拆礁石和卡位大滴。</li>
    <li>礁石落在一起会<b>两两相消</b>，别急着蒸发它们。</li>
  </ul>
</section>

<footer>
  滴水成海 · Merge Ocean — v99 · 更新于 2026-10-16<br>
  在线试玩 <b>https://game.luosgeo.com</b> · 纯静态零依赖，也可本地打开 index.html 游玩
</footer>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', '游戏说明.html'), html);
console.log('DOC OK', (html.length / 1024).toFixed(0) + 'KB');
