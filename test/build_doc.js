// 生成《水滴合成深海》游戏说明文档（单文件 HTML，图标 base64 内嵌；图标由 doc_icons.js 预先导出到 test/icons/）
// v341：游戏说明整体重构（用户："目前不好看、内容不足；要写基础玩法（消除/清除等），不要本地运行这类，只要游戏相关"）
//   ——① 新增「基础玩法」五步卡（投放/合成消除/清除/潮汐浮力/判负复活），补足基础玩法叙述；
//      ② 视觉重构：深海底色 + 卡片化分区 + 步骤卡 + 表格美化，告别纯清单观感；
//      ③ 删除「本地运行 / 在线试玩」等非游戏内容（仅保留页眉一处进入入口）；
//      ④ 修正 深渊潜航「累计 5 万分解锁」描述（v341 已移除该门槛，改经「每日挑战」直接可玩）。
//   其余数值段落（合成链 / 海域 / 特殊滴 / 技能 / 潮汐 / 判负 / 词缀局 / 界面 / 分色）与游戏说明.md 同步。
const fs = require('fs');
const path = require('path');

const ico = n => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'icons', n + '.png')).toString('base64');

const css = `
  :root { --ink:#0E3A5C; --sub:#4A7FA0; --line:#D8E8F2; --card:#F4FAFD; --accent:#2E86B4; --accent2:#0E7C9E; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif; color:var(--ink);
    background:radial-gradient(130% 100% at 50% 0%, #1A5E8F 0%, #0E3A5C 55%, #07273E 100%); }
  .wrap { max-width:900px; margin:0 auto; padding:0 18px 70px; }
  header { text-align:center; padding:60px 16px 46px; color:#fff; }
  header h1 { font-size:46px; letter-spacing:8px; text-shadow:0 2px 18px rgba(0,20,40,.45); }
  header p.tag { margin-top:14px; font-size:16px; opacity:.9; letter-spacing:2px; }
  .play { display:inline-block; margin-top:24px; padding:13px 44px; background:#fff; color:#0E5A8A;
    border-radius:999px; font-size:17px; font-weight:800; text-decoration:none; box-shadow:0 6px 22px rgba(0,30,60,.3); }
  .play:hover { transform:translateY(-2px); }
  section { background:#fff; border-radius:16px; padding:28px 32px; margin-top:24px;
    box-shadow:0 3px 14px rgba(8,39,62,.12); }
  section:hover { box-shadow:0 6px 22px rgba(8,39,62,.18); }
  h2 { font-size:22px; padding-left:14px; border-left:5px solid var(--accent); margin-bottom:16px; color:#10466B; }
  h3 { font-size:16px; margin:16px 0 8px; color:#1B5E86; }
  p, li { font-size:14.5px; line-height:1.9; color:#28516B; }
  p.note { font-size:13.5px; color:#5A7E94; margin-top:12px; background:var(--card); border-radius:10px; padding:11px 14px; }
  ul { padding-left:22px; }
  table { width:100%; border-collapse:collapse; margin:10px 0 4px; font-size:13.5px; }
  th, td { border:1px solid var(--line); padding:8px 11px; text-align:left; line-height:1.65; vertical-align:middle; }
  th { background:var(--card); color:#1B5E86; white-space:nowrap; }
  tr:nth-child(even) td { background:#FBFDFF; }
  td.num, th.num { text-align:right; white-space:nowrap; }
  td img.ic, li img.ic, p img.ic { height:30px; vertical-align:middle; margin-right:6px; }
  .sw { display:inline-block; width:11px; height:11px; border-radius:50%; vertical-align:middle; margin-right:7px; }
  b.hl { color:#C25A3A; }
  /* 基础玩法步骤卡 */
  .steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; margin-top:6px; }
  .step { background:linear-gradient(180deg,#F4FAFD,#EAF5FB); border:1px solid var(--line); border-radius:13px;
    padding:16px 18px; position:relative; }
  .step .no { position:absolute; top:-12px; left:16px; width:30px; height:30px; border-radius:50%;
    background:var(--accent); color:#fff; font-weight:800; font-size:15px; display:flex; align-items:center; justify-content:center;
    box-shadow:0 3px 10px rgba(46,134,180,.45); }
  .step h4 { font-size:15.5px; color:#0E5A8A; margin:6px 0 7px; }
  .step p { font-size:13px; line-height:1.8; color:#38617C; }
  footer { text-align:center; color:#9CC2D6; font-size:12.5px; margin-top:34px; line-height:1.9; }
`;

// 通用：把 [项, 值] 数组渲染成两列表格
const kvTable = (rows, w) => `<table><tr><th style="width:${w || '150px'}">项目</th><th>值</th></tr>` +
  rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';

// 合成链 9 档
const TIERS = [['tier0', '雾泡', 1], ['tier1', '水滴', 3], ['tier2', '露珠', 6], ['tier3', '浪花', 10], ['tier4', '溪流', 15], ['tier5', '湖泊', 21], ['tier6', '江河', 29], ['tier7', '大海', 38], ['tier8', '沧海', 50]];
const tiersHtml = TIERS.map((t, i) => `<tr><td class="num">${i + 1}</td><td><img class="ic" src="${ico(t[0])}" alt="">${t[1]}</td><td class="num">${t[2]}</td></tr>`).join('');

// 海域 8 枚
const SEAS = [['sea0', '潮汐池', '0'], ['sea1', '珊瑚浅海', '3,000'], ['sea2', '蔚蓝深海', '10,000'], ['sea3', '午夜深渊', '25,000'], ['sea4', '月光环礁', '50,000'], ['sea5', '海沟之眼', '100,000'], ['sea6', '热泉裂谷', '180,000'], ['sea7', '深渊王座', '300,000']];
const seasHtml = SEAS.map((s, i) => `<tr><td class="num">${i + 1}</td><td><img class="ic" src="${ico(s[0])}" alt="">${s[1]}</td><td class="num">${s[2]}</td></tr>`).join('');

// 特殊水滴 15 种
const SPS = [
  ['sp_rune', '符文滴', '潮汐池', '合成时为对应技能 +1 充能（技能随其首次出现解锁）'],
  ['sp_cloud', '雨云滴', '珊瑚浅海', '落地随机分裂 2~3 颗水滴（档位随机，不大于当前等级）'],
  ['sp_iron', '礁石', '珊瑚浅海', '沉重障碍，无法合成，落底不浮起；<b>仅涨潮</b>可相消或用蒸发（2 充能）移除'],
  ['sp_vortex', '漩涡滴', '蔚蓝深海', '吸附周围水滴再消散'],
  ['sp_ice', '冰晶滴', '蔚蓝深海', '冻结周围水滴，可当临时平台'],
  ['sp_rainbow', '彩虹滴', '午夜深渊', '碰到的水滴跳 2 级，得分双倍'],
  ['sp_gale', '疾风滴', '午夜深渊', '落定刮风吹开周围水滴'],
  ['sp_magnet', '磁石滴', '月光环礁', '大范围强磁场聚滴'],
  ['sp_spring', '甘霖滴', '月光环礁', '下一滴变为场上最多档位'],
  ['sp_thunder', '雷霆滴', '海沟之眼', '引雷让一对同档水滴直接合成'],
  ['sp_pearl', '珍珠滴', '海沟之眼', '祝福最多档位，该档全体 +1 级'],
  ['sp_magma', '熔岩滴', '热泉裂谷', '烧毁周围礁石与最低两档水滴，折算得分'],
  ['sp_geyser', '间歇泉滴', '热泉裂谷', '向上喷出水柱冲开上方水滴'],
  ['sp_void', '虚空滴', '深渊王座', '吞噬最低档水滴（至多 5 颗），折算高分'],
  ['sp_aurora', '极光滴', '深渊王座', '下一次合成得分 ×3']
];
const spHtml = SPS.map(s => `<tr><td><img class="ic" src="${ico(s[0])}" alt="">${s[1]}</td><td>${s[2]}</td><td>${s[3]}</td></tr>`).join('');

// 消除途径总览（v356：用户"游戏说明应当体现如何消除水滴，否则给人的感觉就是一直在合成"）
const CLEARS = [
  ['合成升级', '2 → 1', '两颗同档相触合并为高一档，常态减压：投放 1 颗 +1，合成一次 −1'],
  ['<b>顶级「沧海」汇入海域</b>', '2 → 0', '两颗最高档「沧海」相触即<b>双双消失</b>，得分 ×4 再 +300，此后全局倍率 +25%/次'],
  ['礁石两两相消', '2 → 0', '礁石无法合成，两枚相触即互相消除，<b>仅涨潮时</b>；奖励 15 分'],
  ['蒸发（技能）', '1 → 0', '点掉一枚水滴（1 次充能）或一块礁石（<b>2 次充能</b>，不给分）'],
  ['熔岩滴', '−n', '烧毁周围礁石与最低两档水滴，折算得分'],
  ['虚空滴', '−n', '吞噬最低档水滴（至多 5 颗），折算高分'],
  ['雷霆滴', '间接 −1', '引雷让一对同档水滴直接合成'],
  ['珍珠滴 / 甘霖滴 / 极光滴', '间接', '升档或加倍，促成更多合成（本身不移除水滴）'],
  ['涟漪 / 水流 / 换滴', '0', '不减少数量，只推挤重排或换序，用来解围、凑对'],
  ['越线判负', '清场', '堆到警戒线以上并持续约 1.1 秒即结算——这是堆满的后果，不是消除手段']
];
const clearHtml = CLEARS.map(c => `<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td></tr>`).join('');

// 技能 4 个
const SKILLS = [
  ['skill_swap', '换滴', '1 充能', '换滴符文首次出现', '把待投水滴换成下一颗'],
  ['skill_ripple', '涟漪', '1 充能', '涟漪符文首次出现', '以水堆重心炸开双重波纹推挤重排'],
  ['skill_evap', '蒸发', '1 充能', '蒸发符文首次出现', '进入选择模式，点掉一枚水滴或礁石'],
  ['skill_flow', '水流', '1 充能', '水流符文首次出现', '点选两枚水滴交换位置']
];
const skillHtml = SKILLS.map(s => `<tr><td><img class="ic" src="${ico(s[0])}" alt="">${s[1]}</td><td class="num">${s[2]}</td><td>${s[3]}</td><td>${s[4]}</td></tr>`).join('');

// 深海事件与宝箱
const EVENTS = [
  [`<img class="ic" src="${ico('chest')}" alt="">大宝箱`, '潮汐池起出现；限时 14 秒点击开启；开出已解锁技能的充能 / 已出现的特殊滴，未解锁时改发积分'],
  ['深海涌泉', '托起底部水滴（涌泉水柱向上延展，视觉与抬升一致）'],
  ['海神甘霖', '接下来 3 滴必为场上最多档位'],
  ['漩涡风暴', '「荧光浮游」粒子涡卷起，在堆叠区重排水滴']
];
const eventsHtml = EVENTS.map(e => `<tr><td style="width:140px">${e[0]}</td><td>${e[1]}</td></tr>`).join('');

// 词缀局（深渊潜航 / 每日挑战 合并一张表，「适用」列区分）
const AFFIX = [
  ['重压深潜', '重力 +80%', '深渊潜航 / 每日挑战'],
  ['疾风骤雨', '潮汐间隔 -65%', '深渊潜航 / 每日挑战'],
  ['暗礁密布', '礁石概率 ×4', '深渊潜航 / 每日挑战'],
  ['寒冰速冻', '35% 落水即冻', '深渊潜航 / 每日挑战'],
  ['深渊试炼', '重力 +40% · 潮汐更频且潮期涌动加剧、无宽限', '每日挑战'],
  ['冰礁交错', '暗礁 ×5 且 45% 落水即冻', '每日挑战']
];
const affixHtml = AFFIX.map(a => `<tr><td style="width:110px">${a[0]}</td><td>${a[1]}</td><td style="width:170px">${a[2]}</td></tr>`).join('');

// 提示语分色 7 类
const PCOL = [
  ['#D4A017', '得分', '+N、连击后缀'],
  ['#8E5AC8', '生效高光', '特殊滴、大招、稀有合成'],
  ['#0E7C9E', '海域推进', '演进、渐深、深海事件、挑战开局'],
  ['#1E9E6A', '奖励', '图鉴、成就、任务、宝箱、复活、充能'],
  ['#C9821A', '提醒', '点宝箱、预告、教程'],
  ['#9E4B47', '错失', '落空、错失'],
  ['#6B8AA5', '回执', '操作反馈']
];
const pcolHtml = PCOL.map(c => `<tr><td style="width:110px"><span class="sw" style="background:${c[0]}"></span>${c[1]}</td><td>${c[2]}</td></tr>`).join('');

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
  <h2>基本</h2>
  ${kvTable([
    ['操作', '点击 / 拖动瞄准，松手投放'],
    ['模式', '开局即无尽'],
    ['投放出现特殊滴', '潮汐池 15% → 深渊王座 34%（海域越深越频繁）'],
    ['投放自带符文', '5%'],
    ['连击窗口 / 最高倍率', '1.1 秒 / ×4'],
    ['渐进加压', '14 分钟到满强度'],
    ['高潮时刻', '每累计 +1500 分，场上最高档可合成对自发相聚']
  ], '170px')}
</section>

<section>
  <h2>基础玩法</h2>
  <div class="steps">
    <div class="step"><span class="no">1</span><h4>🎯 投放瞄准</h4><p>点击或拖动选择落点，松手投放。水滴下方有一段固定长度的瞄准辅助线，帮你对齐投放位置。</p></div>
    <div class="step"><span class="no">2</span><h4>💧 合成消除</h4><p>两颗<b>相同档位</b>的水滴相触即合并为高一档：场上 <b>2 颗变 1 颗</b>（净减 1），得分并解锁更高形态。合成到最高档「沧海」后，两颗「沧海」再相触就<b>双双消失</b>（净减 2，见《消除途径总览》）。</p></div>
    <div class="step"><span class="no">3</span><h4>🧹 清除障碍</h4><p>用「蒸发」点掉一枚水滴或礁石；礁石两两相撞会相消；部分特殊滴（熔岩 / 虚空 / 雷霆等）也能清除水滴。</p></div>
    <div class="step"><span class="no">4</span><h4>🌊 潮汐浮力</h4><p>水域周期性涨潮，水滴受浮力上浮、自动重排（浮力随浸没比衰减，浸得越深托得越高）。满潮水位恒在警戒线以下，但被托起的水滴会冲出水面、可能越过警戒线——潮汐造成的越线同样计时判负，不豁免。</p></div>
    <div class="step"><span class="no">5</span><h4>⚠️ 判负复活</h4><p>堆高越过顶部警戒线并持续约 1.1 秒（涨潮期间 ×2）即结算；每局首次越线有 3 秒缓冲，可「复活继续」清走堆顶回到对局。</p></div>
  </div>
</section>

<section>
  <h2>合成链（9 级）</h2>
  <table>
    <tr><th class="num" style="width:60px">档</th><th>名称</th><th class="num" style="width:110px">单次得分</th></tr>
    ${tiersHtml}
  </table>
  <p class="note"><b>最高档「沧海」不再升档</b>：两颗「沧海」相触即<b>双双消失</b>（汇入海域），得分 ×4 再 +300，并且此后全局得分倍率每次 +25%（可叠加）。</p>
</section>

<section>
  <h2>消除途径总览（水滴是怎么减少的）</h2>
  <p>只投放不消除，场上当然会堆满；这局的所有「减压阀」都在下面这张表里：</p>
  <table>
    <tr><th style="width:150px">途径</th><th style="width:90px">场上数量</th><th>说明</th></tr>
    ${clearHtml}
  </table>
  <p class="note"><b>为什么不会一直堆满</b>：投放 +1、合成 −1、顶级合成 −2，只要持续凑对合成，场上数量就不会单调增长。真正堆满通常是因为高档水滴散落各处凑不成对——这时用「水流」换位、「涟漪」推挤重排凑对，或「蒸发」点掉最碍事的那一颗。</p>
</section>

<section>
  <h2>海域（8 个，按累计得分推进）</h2>
  <table>
    <tr><th class="num" style="width:60px">#</th><th>海域</th><th class="num" style="width:110px">累计分</th></tr>
    ${seasHtml}
  </table>
</section>

<section>
  <h2>特殊水滴（15 种，随海域解锁）</h2>
  <table>
    <tr><th style="width:140px">特殊滴</th><th style="width:96px">登场海域</th><th>效果</th></tr>
    ${spHtml}
  </table>
  <p class="note">海域越靠后，特殊滴出现概率越大；且「该海域所属」的特殊滴权重更高（解锁海域越深，权重越大）。</p>
</section>

<section>
  <h2>礁石（会生长的障碍）</h2>
  ${kvTable([
    ['出现概率', '8% → 16%（14 分钟渐进加压），场上上限 5 块'],
    ['半径', '34（固定，不再生长）'],
    ['清除① 相消', '两块礁石相触即互相消除，<b>仅涨潮时</b>（退潮时相触也不消）；奖励 15 分'],
    ['清除② 蒸发', '耗 <b>2 次充能</b>、不给分，且<b>仅涨潮时</b>可用（水滴随时可蒸发，不受此限）'],
    ['清除③ 熔岩', '熔岩滴范围内一并烧掉（特殊滴被动清除，不限潮汐）'],
    ['在场惩罚', '每块在场礁石让<b>全局得分倍率 −6%</b>，最多 −30%（数量变化时弹字提示当前税率）']
  ], '150px')}
  <p class="note">清除有两条路，<b>都只在涨潮时可用</b>：等另一块礁石掉下来相触相消（15 分，但礁石只有 8% 概率出现、不是随叫随到），或用蒸发（2 次充能、不给分）。退潮时礁石是纯障碍，只能等潮或用熔岩滴烧；拖着不管则每块持续抽走 6% 全局收益。</p>
</section>

<section>
  <h2>技能（4 个）</h2>
  <table>
    <tr><th style="width:130px">技能</th><th class="num">每次消耗</th><th style="width:160px">解锁</th><th>效果</th></tr>
    ${skillHtml}
  </table>
  <p class="note">充能来自符文滴：<b>每合成一颗符文滴 = 1 次充能</b>（消耗也是 1 次，可连放），单技能最多储备 5 次，用完再充。</p>
</section>

<section>
  <h2>深海事件与宝箱</h2>
  <table>
    <tr><th style="width:140px">名称</th><th>内容</th></tr>
    ${eventsHtml}
  </table>
</section>

<section>
  <h2>潮汐</h2>
  ${kvTable([
    ['涨潮间隔', '浅海 42 秒 → 深海 16 秒（线性压缩）'],
    ['涨潮预警', '前 3 秒'],
    ['满潮水位', '警戒线至底部的 1/4（浅海）→ 3/4（深渊王座），恒低于警戒线'],
    ['潮汐限定合成', '无（江河合成不再受潮汐限制）'],
    ['潮汐限定消除', '礁石相消 / 蒸发礁石（均仅涨潮时；水滴与熔岩不受限）'],
    ['海神恩泽', '退潮余波概率触发，全场普通水滴 +1 级']
  ], '170px')}
</section>

<section>
  <h2>判负与结算</h2>
  ${kvTable([
    ['越线引信', '1.1 秒（潮汐期间 ×2）'],
    ['每局首次越线', '3 秒，只走一轮，到点结算'],
    ['豁免堆高判定', '冰冻滴、全部瞬态特殊滴'],
    ['复活', '直接回到对局，清走堆顶水滴至安全区'],
    ['结算页', '复活继续 / 结算双倍 / 分享战报 / 重新开始']
  ], '170px')}
</section>

<section>
  <h2>词缀局（深渊潜航 / 每日挑战）</h2>
  <table>
    <tr><th style="width:110px">词缀</th><th>海况</th><th style="width:170px">适用</th></tr>
    ${affixHtml}
  </table>
  <p class="note">深渊潜航与每日挑战共用同一套海况词缀管线：经菜单「每日挑战」进入，<b>不设累计分解锁门槛，直接可玩</b>；每日挑战每天轮换开放一条全服同规则词缀，达成目标分即完成。</p>
  <p class="note">挑战芯片与结算页的<b>完成度百分比</b>＝当前累计分在「到达最深海域所需分组」中的位置：8 个海域分组把全程均分，每跨过一个海域占一档，<b>档内再按分数连续插值</b>（不再只在跨档瞬间跳变）；抵达最深海域＝100%，即任务完成。</p>
</section>

<section>
  <h2>图鉴 · 成就殿堂 · 离线收益</h2>
  ${kvTable([
    ['图鉴', '合成链 9 档 + 海域 8 行'],
    ['成就', '11 项，★ / ★★ / ★★★ 三档；完成得永续加成（开局充能、连击窗口 +0.3 秒）与称号'],
    ['每日任务', '5 个 / 天；全部完成涨连续天数；完成得奖励分 + 随机技能充能'],
    ['每日挑战', '达成目标得奖励分与技能充能；连续完成天数越多奖励越高'],
    ['榜单', '好友深海榜'],
    ['离线收益', '离开 &gt; 3 分钟结算；每分钟 30 分 + 生涯最佳 × 0.0004；8 小时封顶']
  ], '170px')}
</section>

<section>
  <h2>界面</h2>
  ${kvTable([
    ['顶部任务条', '发布小目标，完成得奖励分并随机充满一个技能'],
    ['海域进度条', '累计得分距下一海域差值；满级显示「已达最深海域」'],
    ['潮汐卡', '下次涨潮倒计时'],
    ['底部六钮', '图鉴 · 换滴 · 涟漪 · 蒸发 · 水流 · 重开'],
    ['设置钮', '音效 / 音乐 / 震动开关；清空存档']
  ], '170px')}
</section>

<section>
  <h2>提示语分色</h2>
  <table>
    <tr><th style="width:110px">类别</th><th>示例</th></tr>
    ${pcolHtml}
  </table>
</section>

<footer>
  水滴合成深海 · Merge Ocean — v341 · 2026-10-19<br>
  在线试玩 <b>https://game.luosgeo.com</b>
</footer>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', '游戏说明.html'), html);
console.log('DOC OK', (html.length / 1024).toFixed(0) + 'KB');
