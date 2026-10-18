// 生成《水滴合成深海》游戏说明文档（单文件 HTML，图标 base64 内嵌；图标由 doc_icons.js 预先导出到 test/icons/）
// v317：正文与游戏说明.md 同步——① 特殊滴登场海域调整（符文滴→潮汐池、珊瑚礁→珊瑚浅海、漩涡滴→蔚蓝深海；顺修旧文档两处笔误：雨云滴实为珊瑚浅海、间歇泉滴实为热泉裂谷）；② 更名：礁石→珊瑚礁、宝箱→大宝箱（含熔岩/蒸发/NG词缀等全部用户可见文案）；③ 设置弹窗新增第 4 行「清空存档」：二级确认后删全部存档并重载，游戏恢复初始状态。
// v321：潮汐段落同步——越线量改逐海域显式曲线（overByStage）：sea2 起大滴被推越线、sea4 起全档位浮起越线（v319 的 overLine 单端点被 lo→hi 渐变稀释，仿真实测 sea5 前全档位越不了线；用户："水滴还是无法浮起到警戒线上面，请认真测试一下"）。
// v322：潮汐段落再同步——满潮偏移改纯线性 overMin→overMax（每海域等量 +42px，末海域「深渊王座」最高），取代 v321 逐海域表（sea2 凸节、sea4 后每海仅 10px 走平；用户："涨潮的高度不合理，按理说应当线性增高，最后一个海域达到最高，目前看到第四个海域就最高了"）。仿真实测：午夜深渊起大海/沧海越线、月光环礁起大滴全越、热泉裂谷以深全档位浮起越线。
// v323：潮汐判负提速同步——引信 dangerTime×5→×2（2.2s）且潮汐期间越线即计时不看速度（仿真定位：漂浮滴均速仅 45~53px/s、速度门只堵死 10~13% 采样，真正死因是 5.5s 引信超过涨潮全长 8s，一次涨潮内永远攒不满；用户："涨潮引起的越线好像很难死亡，是判定不对吗？"）。非潮汐速度门与扰动衰减原样保留；每局首次仍有一次 3 秒深流缓冲宽限。
// v324：深海涌泉抬升减半同步——作用区 210→105 + 上托力 1900→1700（高度 ≈ 作用区×(1+净上托/重力)，两个杠杆都必须动：只砍作用区会让底部滴集中撞堆、同档合成反冲把混合堆堆顶反而甩高 234→316px；用户："深海涌泉力太大了，吹起的水滴太高了，可以减少一半的高度"）。实测单滴 252→117px、混合堆 234→107px。正文"轻轻托起底部水滴"描述不变。
// 截图（doc_*.png）为 v99 时期旧 UI，已全部移除，待浏览器通道可用后重拍再嵌回。
const fs = require('fs');
const path = require('path');

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

// 特殊水滴 15 种
const SPS = [
  ['sp_rune','符文滴','潮汐池','合成时为对应技能 +1 充能（技能随其首次出现解锁）'],
  ['sp_cloud','雨云滴','珊瑚浅海','分裂成两颗雾泡，补充低级水滴'],
  ['sp_iron','珊瑚礁','珊瑚浅海','沉重障碍无法合成；两两相消或蒸发移除'],
  ['sp_vortex','漩涡滴','蔚蓝深海','吸附周围水滴再消散，聚拢散滴'],
  ['sp_ice','冰晶滴','蔚蓝深海','冻结周围水滴，冻结滴可当临时平台'],
  ['sp_rainbow','彩虹滴','午夜深渊','碰到的水滴直接跳 2 级，得分双倍'],
  ['sp_gale','疾风滴','午夜深渊','落定刮风吹开周围水滴，腾出空间'],
  ['sp_magnet','磁石滴','月光环礁','更强更久的磁场漩涡，大范围聚滴'],
  ['sp_spring','甘霖滴','月光环礁','下一滴变成场上最多的档位'],
  ['sp_thunder','雷霆滴','海沟之眼','引雷让场上一对同档水滴直接合成'],
  ['sp_pearl','珍珠滴','海沟之眼','祝福最多的档位，该档全体升 1 级'],
  ['sp_magma','熔岩滴','热泉裂谷','烧毁周围珊瑚礁与最低两档水滴，折算得分'],
  ['sp_geyser','间歇泉滴','热泉裂谷','向上喷出垂直水柱，冲开上方水滴腾出空间'],
  ['sp_void','虚空滴','深渊王座','吞噬场上最低档水滴（至多 5 颗），折算高分'],
  ['sp_aurora','极光滴','深渊王座','极光庇护：下一次合成得分 ×3']
];
const spHtml = SPS.map(s => `<tr><td><img class="ic" src="${ico(s[0])}" alt="">${s[1]}</td><td>${s[2]}</td><td>${s[3]}</td></tr>`).join('');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>水滴合成深海 · 游戏说明</title>
<style>${css}</style>
</head>
<body>
<header>
  <h1>水滴合成深海</h1>
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
  <ul>
    <li>点击屏幕任意位置投放顶部虚影所示的水滴；<b>同档水滴相碰即合成下一级</b>，得分并产生连击加成（连击窗口 1.1 秒，倍率最高 ×4）。</li>
    <li><b>开局即无尽模式</b>：周期潮汐、珊瑚礁障碍、15 种特殊水滴随海域逐级解锁，并随对局时长渐进加压（约 14 分钟到满强度），越玩越狂。</li>
    <li><b>警戒线判负</b>：水滴堆积越过上部虚线并保持静止约 1 秒即本局结束；堆体从下方逼近时警戒线会闪烁警示。每局可<b>无限次看广告复活</b>——复活只冲走越线的几滴，其余局面原样保留，是续命翻盘的主力手段。</li>
    <li>顶部任务条不断发布小目标（合成某档水滴 / 达成连击 / 合成出指定档位），难度随任务深度递进，完成即得奖励分并<b>随机充满一个技能</b>；右侧潮汐卡提示下次涨潮倒计时。</li>
    <li>任务条下方的<b>海域进度条</b>实时显示累计得分距下一海域还差多少分（填充色与当前海域同族，右端圆点即下一海域徽章色），满级后显示「已达最深海域」。</li>
    <li><b>高潮时刻</b>：每累计 +500 分，场上最高档的可合成对会自发相聚，省去机械投放。</li>
    <li>局内底部一排六钮：<b>图鉴</b> + 四大技能 + <b>重开</b>；左上角<b>设置钮</b>可分别开关音效 / 音乐 / 震动，也可<b>清空存档</b>——二级确认后删除全部进度，游戏恢复初始状态。</li>
  </ul>
  <h3>合成链（9 级）</h3>
  <div class="chain">${chainHtml}</div>
  <p style="text-align:center;font-size:12.5px;color:var(--sub)">同档相融合成下一档 · 单次得分为合成时所得分数</p>
</section>

<section>
  <h2>✨ 四大技能</h2>
  <p>合成带<b>符文</b>的水滴可为对应技能 +1 充能（普通投放约三成概率自带符文），攒满次数点亮即可点击释放；<b>对应符文首次出现即解锁该技能</b>——未解锁时按钮显示「待符文」，点击只会提示还差哪种符文。解锁状态跨局保留。</p>
  <table>
    <tr><th style="width:130px">技能</th><th>充能</th><th>解锁</th><th>效果</th></tr>
    <tr><td><img class="ic" src="${ico('skill_swap')}" alt="">换滴</td><td>4 次</td><td>「换滴符文」出现后</td><td>把当前待投水滴换成下一颗（救急调整阵容）</td></tr>
    <tr><td><img class="ic" src="${ico('skill_ripple')}" alt="">涟漪</td><td>6 次</td><td>「涟漪符文」出现后</td><td>以水堆重心炸开双重波纹，把堆体推挤重排</td></tr>
    <tr><td><img class="ic" src="${ico('skill_evap')}" alt="">蒸发</td><td>10 次</td><td>「蒸发符文」出现后</td><td>进入选择模式，点掉一枚碍事的水滴或珊瑚礁</td></tr>
    <tr><td><img class="ic" src="${ico('skill_flow')}" alt="">水流</td><td>6 次</td><td>「水流符文」出现后</td><td>点选两枚水滴交换位置，精细调整合成组合</td></tr>
  </table>
</section>

<section>
  <h2>🎁 特殊水滴（15 种，随海域逐级解锁）</h2>
  <table>
    <tr><th style="width:140px">特殊滴</th><th style="width:96px">登场海域</th><th>效果</th></tr>
    ${spHtml}
  </table>
  <p style="margin-top:8px"><img class="ic" src="${ico('chest')}" alt=""><b>大宝箱</b>（潮汐池起出现）：对局中偶有大宝箱沉底浮出，限时 14 秒点击开启可得随机奖励；涨潮间隙还有<b>随机深海事件</b>不期而至——<b>深海涌泉</b>（轻轻托起底部水滴）、<b>海神甘霖</b>（接下来 3 滴必为场上最多档位）、<b>漩涡风暴</b>（在堆叠区卷起水滴）。</p>
</section>

<section>
  <h2>🌊 潮汐与海域演进</h2>
  <ul>
    <li><b>潮汐</b>：周期性涨潮，浮力把全场水滴托起重排。首潮倒计时与潮汐间隔相同：浅海 <b>42 秒</b>，随海域推进线性压缩至深海 <b>16 秒</b>；涨潮前 3 秒有预警。</li>
    <li><b>潮水是清场压力</b>：满潮水位随海域推进<b>线性增高</b>——每深入一个海域水面抬升一档，<b>最后一个海域「深渊王座」达到最高</b>。潜入午夜深渊后，最大的几级水滴开始被推过警戒线；热泉裂谷以深，满潮时<b>所有水滴都会浮起越线</b>，浮起越线同样判负（越线持续约 2 秒即结算，不要求静止；每局首次触发有一次 3 秒「深流缓冲」宽限）。把每次涨潮当作清场期限，别等堆成山才慌。</li>
    <li><b>潮汐限定合成</b>：两枚「江河」只能在涨潮时聚成「大海」（彩虹跳级不受限）——想合大海，卡准潮位。</li>
    <li><b>海神恩泽</b>：退潮余波有概率引来祝福，全场普通水滴集体升 1 级——潮退后正是整理阵容、触发连环合成的窗口期。</li>
    <li><b>海域演进</b>：按累计得分（跨局）从 8 大海域一路潜入，背景主题色随之平滑渐变：</li>
  </ul>
  <div class="chain seas">${seasHtml}</div>
</section>

<section>
  <h2>📖 图鉴 · 成就殿堂 · 离线收益</h2>
  <ul>
    <li><b>图鉴</b>（局内左下书本钮）：合成链 9 档 + 海域演进 8 行，点选条目查看说明；海域行按「当前海域 / 已抵达 / 下一海域 · 累计X分 / ???」标注状态（以本局得分与生涯最高中抵达较深者为准，刷新重开不回退），未抵达的更深海域以 ??? 保持悬念。</li>
    <li><b>成就殿堂</b>（主页四枚磁贴直达，内含四个视图）：
      <ul>
        <li><b>成就</b>：11 项成就分 ★ / ★★ / ★★★ 三档难度，完成得<b>永续加成</b>（如开局充能、连击窗口 +0.3s）与称号；</li>
        <li><b>每日任务</b>：每天 5 个，难度随连续完成天数递进（以星级标记），全部完成可涨连续天数；</li>
        <li><b>每日挑战</b>：每天轮换一条海况词缀、全服同规则；目标分 = 生涯最佳 × 35%，达成即完成，得奖励分与技能充能，连续完成天数越多奖励越高；挑战局内顶部会显示目标与进度；</li>
        <li><b>榜单</b>：好友深海榜，比比谁潜得更深。</li>
      </ul>
    </li>
    <li><b>离线收益</b>：离开超过 3 分钟即按离开时长结算积分（每分钟保底 30 分 + 生涯最佳系数，8 小时封顶），下次开局自动入账，主页弹出离线卡告知。</li>
  </ul>
</section>

<section>
  <h2>🏁 结算与词缀局（深渊潜航 / 每日挑战）</h2>
  <ul>
    <li>结算页四项：<b>复活继续</b>（看广告，无限次）/ <b>结算双倍</b>（直接翻倍）/ <b>分享战报</b>（自动生成战绩文案）/ <b>重新开始</b>（弹窗确认：返回主页 / 重新开始 / 返回游戏）。</li>
    <li><b>词缀局</b>：累计 5 万分解锁「<b>深渊潜航</b>」，或每天从主页磁贴进入「<b>每日挑战</b>」——都是带海况词缀的高危无尽局，词缀相同、每日挑战每天轮换开放其中一条：</li>
  </ul>
  <table>
    <tr><th>词缀</th><th>海况</th></tr>
    <tr><td>重压深潜</td><td>重力 +60%</td></tr>
    <tr><td>疾风骤雨</td><td>潮汐间隔 -65%</td></tr>
    <tr><td>暗礁密布</td><td>珊瑚礁概率 ×4</td></tr>
    <tr><td>寒冰速冻</td><td>水滴 35% 落水即冻</td></tr>
  </table>
  <p style="margin-top:8px">每日挑战另有两条更凶的专属词缀：<b>深渊试炼</b>（重力 +80% 且潮汐 -65%）、<b>冰礁交错</b>（暗礁 ×5 且 45% 落水即冻）。</p>
</section>

<section>
  <h2>💡 小贴士</h2>
  <ul class="tips">
    <li>大水滴沉底、小水滴留两侧：<b>让同档水滴自然相邻</b>比强行堆叠更容易触发连锁合成。</li>
    <li>连击（1.1 秒窗口）叠加得分倍率，最高 ×4——<b>连续快合成</b>是高分关键。</li>
    <li>潮水会驮着堆体逼近甚至漫过警戒线：<b>把涨潮当清场期限</b>，提前给高级滴腾合并空间。</li>
    <li>漩涡 / 疾风 / 间歇泉都能救急腾空间；蒸发留着专拆珊瑚礁和卡位大滴。</li>
    <li>珊瑚礁落在一起会<b>两两相消</b>，别急着蒸发它们。</li>
    <li>「江河」留着涨潮时合「大海」，平时硬合合不上。</li>
  </ul>
</section>

<footer>
  水滴合成深海 · Merge Ocean — v324 · 更新于 2026-10-18<br>
  在线试玩 <b>https://game.luosgeo.com</b> · 纯静态零依赖，也可本地打开 index.html 游玩
</footer>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', '游戏说明.html'), html);
console.log('DOC OK', (html.length / 1024).toFixed(0) + 'KB');
