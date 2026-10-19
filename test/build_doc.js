// 生成《水滴合成深海》游戏说明文档（单文件 HTML，图标 base64 内嵌；图标由 doc_icons.js 预先导出到 test/icons/）
// v317：正文与游戏说明.md 同步——① 特殊滴登场海域调整（符文滴→潮汐池、珊瑚礁→珊瑚浅海、漩涡滴→蔚蓝深海；顺修旧文档两处笔误：雨云滴实为珊瑚浅海、间歇泉滴实为热泉裂谷）；② 更名：礁石→珊瑚礁、宝箱→大宝箱（含熔岩/蒸发/NG词缀等全部用户可见文案）；③ 设置弹窗新增第 4 行「清空存档」：二级确认后删全部存档并重载，游戏恢复初始状态。
// v321：潮汐段落同步——越线量改逐海域显式曲线（overByStage）：sea2 起大滴被推越线、sea4 起全档位浮起越线（v319 的 overLine 单端点被 lo→hi 渐变稀释，仿真实测 sea5 前全档位越不了线；用户："水滴还是无法浮起到警戒线上面，请认真测试一下"）。
// v322：潮汐段落再同步——满潮偏移改纯线性 overMin→overMax（每海域等量 +42px，末海域「深渊王座」最高），取代 v321 逐海域表（sea2 凸节、sea4 后每海仅 10px 走平；用户："涨潮的高度不合理，按理说应当线性增高，最后一个海域达到最高，目前看到第四个海域就最高了"）。仿真实测：午夜深渊起大海/沧海越线、月光环礁起大滴全越、热泉裂谷以深全档位浮起越线。
// v323：潮汐判负提速同步——引信 dangerTime×5→×2（2.2s）且潮汐期间越线即计时不看速度（仿真定位：漂浮滴均速仅 45~53px/s、速度门只堵死 10~13% 采样，真正死因是 5.5s 引信超过涨潮全长 8s，一次涨潮内永远攒不满；用户："涨潮引起的越线好像很难死亡，是判定不对吗？"）。非潮汐速度门与扰动衰减原样保留；每局首次仍有一次 3 秒深流缓冲宽限。
// v324：深海涌泉抬升减半同步——作用区 210→105 + 上托力 1900→1700（高度 ≈ 作用区×(1+净上托/重力)，两个杠杆都必须动：只砍作用区会让底部滴集中撞堆、同档合成反冲把混合堆堆顶反而甩高 234→316px；用户："深海涌泉力太大了，吹起的水滴太高了，可以减少一半的高度"）。实测单滴 252→117px、混合堆 234→107px。正文"轻轻托起底部水滴"描述不变。
// v325：公告弹字时长同步——addPopup 增 life 参数，大字号公告默认 1.0s→2.0s（原渲染 alpha=life/max×1.5，前 1/3 时长后即淡出，公告一闪而过；用户："有些提示信息出现的太短了，比如海神恩泽等，出现时间要稍微长一点！请梳理一下类似的提示并做出优化！"）。微反馈仍 1.0s；甘霖预告/任务更新/大宝箱错过/越线冲走 4 处小字提示显式 1.6s，符文教程 2.0s。
// v326：判负与提示两处同步——① 非潮汐路径同潮汐去掉速度门（仿真定位：12 滴同 x 垂直细柱位置 ±1px 稳定但堆内微颤不止，越线滴均速 162px/s > 速度门 120 ⇒ dangerT 被 100% 堵死，警示恒 0；用户："开始游戏时直接叠罗汉超过警戒线也没有提示？"）。瞬时横穿由出生宽限 0.6s + 引信 1.1s + 出线即清零区分（D/J 案回归：峰速 572px/s 判负为无）。② 越线警示文字移出实体层之前（原随 drawDangerLine 在 bodies 之前画，堆高时被水滴盖住）+ addPopup 防重叠禁入底部道具带（原只向下顺移，底部连发微反馈 cascading 涌进六钮区；用户："有些提示信息会叠在水滴下面导致字体被挡（比如死亡倒计时提示），有些则会出现在底部道具区域，这是不合理的"）。正文警戒线段改写（"保持静止约 1 秒"→"持续约 1 秒，叠罗汉同样判负"+ 警示语 + 深流缓冲）。
// v327：三处同步——① 潮汐：涨潮"持续"随海域线性拉长至 durationMax（原写死 duration，深海首潮永不致死；用户："潮水水位高度似乎还不对"）。水位曲线保持 v322 线性（overMax 35 不变）。② 漩涡拽拉/甩飞的水滴豁免堆高判负 + 「堆高越线」警示文字降闪（2.5~4Hz→1.2~1.8Hz，并提高最低不透明度；用户："漩涡滴带飞的水滴不参与堆高判定！堆高越线文本闪的太快了"）。③ 移除广告全链路：ads 模块 / drawAdOverlay 演示层 / 复活按钮（"看广告复活"）/ 相关文案——先不做广告（用户："移除广告相关的内容，先不做广告！"）。结算页保留结算双倍 / 分享战报 / 重新开始。
// v328：四处同步——① 潮汐水位改"警戒线→底部 1/4~3/4 填充、恒在警戒线下方"（取代 v322 overMin/overMax，原深海满潮越线；用户："潮汐最低是警戒线至底部的 1/4，最高值是 3/4！完全是不超过警戒线的"）。② 复活恢复：结算页"复活继续"直接回到对局、无广告（v327 误删，用户只要去广告）；死亡缓冲改为倒计时 dangerRemain，移除"深流缓冲"专用弹字。③ 全部瞬态特殊滴豁免堆高判负（冰冻滴/漩涡拽拉滴之外）。④ 词缀加重：重压深潜 +80%（grav 1.8）、深渊试炼 重力 +40% 且潮汐 -65%（grav 1.4 + tideInt 0.35）；漩涡风暴卷力 430→2400 真正卷动并美化。另：HUD 顶部"最远海域"随本局实时刷新。
// v329：五处同步——① 死亡缓冲倒计时改为 1Hz 缓闪（原随警示文字 1.2~1.8Hz 太快）。② 提示按语义分色（蓝=信息/青=事件/绿=奖励/琥珀=提醒/暗红=错失），减少刺眼红。③ 大宝箱开启提示跟随宝箱实体同步移动（宝箱落、文本不再反向升）；宝箱只开出已解锁符文技能与已出现特殊滴，未解锁/未出现改发积分。④ 深海涌泉托起修复（力 1700→2000、作用区 105→160，净上托 200→500，温和可见）。⑤ 漩涡风暴视觉重绘为灵动深海漩涡（漏斗+双层反向螺旋流丝+螺旋气泡+呼吸亮核）。
// v331：提示分色 5 类→7 类（用户确认方案，交互示例 test/popup_kinds_demo.html）——gain 金=得分微反馈（+N/连击后缀）、burst 紫=效果生效高光（特殊滴/大招/稀有合成）、world 深青=海域与潮汐推进（演进/渐深/深海事件/挑战开局）、reward 绿=奖励与里程碑（图鉴/成就/任务/宝箱/复活/充能）、todo 琥珀=行动提醒（点宝箱/预告/教程）、miss 暗红=落空与错失、neutral 蓝灰=操作反馈回执；连击后缀改金色；inferKind 按功能重写规则序（miss→todo→neutral→world→burst→gain→reward），已对全部调用点逐一核对。
// v334：深海涌泉回调（用户"托起的太高了，不合理"）——力 2000→1800（净上托 500→300）、作用区 160→125，抬升高度 213→150px（v324 的 119px 看不见 / v329 的 213px 太高，取温和可见档），出口速度 400→274px/s 撞堆更缓。
// v335：漩涡风暴样式定为「荧光浮游」（用户从两批候选 A-K 中选 F，示例 test/storm_designs_demo2.html）——90 颗发光粒子模块级粒子池差速旋转（内快外慢）+ 每颗 5 影彗尾拖影，自然涌现漩涡、零线条感；中央幽光+漩涡眼亮点微脉动。仅替换 drawEventVfx storm 绘制分支，位置/半径 170/时长/淡入淡出/卷力 2400 物理不动。
// v337：说明文档整体重做为「纯信息清单」（用户："只包含游戏信息，不需要解释性无用话语；类似深渊潜航的条目要合并，不要两个在下面用文字描述"）——全部改为表格；删除攻略性「小贴士」、各段版本变更注记与冗长叙述；词缀局合并为一张表 + 「适用」列（深渊潜航 / 每日挑战），不再用正文补述每日挑战专属词缀。
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
  td.num, th.num { text-align:right; white-space:nowrap; }
  td img.ic, li img.ic, p img.ic { height:30px; vertical-align:middle; margin-right:6px; }
  .sw { display:inline-block; width:11px; height:11px; border-radius:50%; vertical-align:middle; margin-right:7px; }
  footer { text-align:center; color:#7FA6BC; font-size:12.5px; margin-top:30px; line-height:1.9; }
  b.hl { color:#C25A3A; }
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
  ['sp_cloud', '雨云滴', '珊瑚浅海', '分裂成两颗雾泡'],
  ['sp_iron', '珊瑚礁', '珊瑚浅海', '障碍，无法合成；两两相消或蒸发移除'],
  ['sp_vortex', '漩涡滴', '蔚蓝深海', '吸附周围水滴再消散'],
  ['sp_ice', '冰晶滴', '蔚蓝深海', '冻结周围水滴，可当临时平台'],
  ['sp_rainbow', '彩虹滴', '午夜深渊', '碰到的水滴跳 2 级，得分双倍'],
  ['sp_gale', '疾风滴', '午夜深渊', '落定刮风吹开周围水滴'],
  ['sp_magnet', '磁石滴', '月光环礁', '大范围强磁场聚滴'],
  ['sp_spring', '甘霖滴', '月光环礁', '下一滴变为场上最多档位'],
  ['sp_thunder', '雷霆滴', '海沟之眼', '引雷让一对同档水滴直接合成'],
  ['sp_pearl', '珍珠滴', '海沟之眼', '祝福最多档位，该档全体 +1 级'],
  ['sp_magma', '熔岩滴', '热泉裂谷', '烧毁周围珊瑚礁与最低两档水滴，折算得分'],
  ['sp_geyser', '间歇泉滴', '热泉裂谷', '向上喷出水柱冲开上方水滴'],
  ['sp_void', '虚空滴', '深渊王座', '吞噬最低档水滴（至多 5 颗），折算高分'],
  ['sp_aurora', '极光滴', '深渊王座', '下一次合成得分 ×3']
];
const spHtml = SPS.map(s => `<tr><td><img class="ic" src="${ico(s[0])}" alt="">${s[1]}</td><td>${s[2]}</td><td>${s[3]}</td></tr>`).join('');

// 技能 4 个
const SKILLS = [
  ['skill_swap', '换滴', '4 充能', '换滴符文首次出现', '把待投水滴换成下一颗'],
  ['skill_ripple', '涟漪', '6 充能', '涟漪符文首次出现', '以水堆重心炸开双重波纹推挤重排'],
  ['skill_evap', '蒸发', '10 充能', '蒸发符文首次出现', '进入选择模式，点掉一枚水滴或珊瑚礁'],
  ['skill_flow', '水流', '6 充能', '水流符文首次出现', '点选两枚水滴交换位置']
];
const skillHtml = SKILLS.map(s => `<tr><td><img class="ic" src="${ico(s[0])}" alt="">${s[1]}</td><td class="num">${s[2]}</td><td>${s[3]}</td><td>${s[4]}</td></tr>`).join('');

// 深海事件与宝箱
const EVENTS = [
  [`<img class="ic" src="${ico('chest')}" alt="">大宝箱`, '潮汐池起出现；限时 14 秒点击开启；开出已解锁技能的充能 / 已出现的特殊滴，未解锁时改发积分'],
  ['深海涌泉', '托起底部水滴'],
  ['海神甘霖', '接下来 3 滴必为场上最多档位'],
  ['漩涡风暴', '「荧光浮游」粒子涡卷起，在堆叠区重排水滴']
];
const eventsHtml = EVENTS.map(e => `<tr><td style="width:140px">${e[0]}</td><td>${e[1]}</td></tr>`).join('');

// 词缀局（深渊潜航 / 每日挑战 合并一张表，「适用」列区分）
const AFFIX = [
  ['重压深潜', '重力 +80%', '深渊潜航 / 每日挑战'],
  ['疾风骤雨', '潮汐间隔 -65%', '深渊潜航 / 每日挑战'],
  ['暗礁密布', '珊瑚礁概率 ×4', '深渊潜航 / 每日挑战'],
  ['寒冰速冻', '35% 落水即冻', '深渊潜航 / 每日挑战'],
  ['深渊试炼', '重力 +40% 且潮汐 -65%', '每日挑战'],
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
    ['在线试玩', '<b>https://game.luosgeo.com</b>'],
    ['本地运行', '双击 <b>index.html</b>，零依赖'],
    ['操作', '点击 / 拖动瞄准，松手投放'],
    ['模式', '开局即无尽'],
    ['投放出现特殊滴', '15%'],
    ['投放自带符文', '15%'],
    ['连击窗口 / 最高倍率', '1.1 秒 / ×4'],
    ['渐进加压', '14 分钟到满强度'],
    ['高潮时刻', '每累计 +500 分，场上最高档可合成对自发相聚']
  ], '170px')}
</section>

<section>
  <h2>合成链（9 级）</h2>
  <table>
    <tr><th class="num" style="width:60px">档</th><th>名称</th><th class="num" style="width:110px">单次得分</th></tr>
    ${tiersHtml}
  </table>
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
</section>

<section>
  <h2>技能（4 个）</h2>
  <table>
    <tr><th style="width:130px">技能</th><th class="num">每次消耗</th><th style="width:160px">解锁</th><th>效果</th></tr>
    ${skillHtml}
  </table>
  <p class="note">充能可超额储备：单次使用只扣对应消耗，最多叠到 3 倍消耗（按钮显示可用次数 ×N），用完再充。</p>
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
    ['潮汐限定合成', '江河 + 江河 → 大海（仅涨潮时；彩虹跳级不受限）'],
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
  <h2>词缀局</h2>
  <table>
    <tr><th style="width:110px">词缀</th><th>海况</th><th style="width:170px">适用</th></tr>
    ${affixHtml}
  </table>
  <table style="margin-top:14px">
    <tr><th style="width:110px">局型</th><th>开启</th></tr>
    <tr><td>深渊潜航</td><td>累计 5 万分解锁</td></tr>
    <tr><td>每日挑战</td><td>每天开放一条（全服同规则）；目标分 = 生涯最佳 × 35%（保底 3,000）</td></tr>
  </table>
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
  水滴合成深海 · Merge Ocean — v336 · 2026-10-19<br>
  在线试玩 <b>https://game.luosgeo.com</b> · 纯静态零依赖，也可本地打开 index.html 游玩
</footer>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', '游戏说明.html'), html);
console.log('DOC OK', (html.length / 1024).toFixed(0) + 'KB');
