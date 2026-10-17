// 布局几何验证（v194）：MG.layout 单一几何真源 + 公告类 ring 锚定 + 漩涡锚点/图鉴面板度量静态核查
// 纯 node 计算（vm 加载 config + layout，无浏览器/无 canvas）。
// ★ v183 新定位语义（覆盖 v175~v182 的 EXTRA 分配方案；用户：
//   "HUD 部分按照顶部定位，其他的按照底部定位，弹性空间不需要设置，有多少是多少！"）：
//   HUD(0~165) 钉块顶，绝对定版不动；其余一切 = 9:18 定版基准值 + dy，随块底整体平移。
// ★★ v184：容器顶不设置（用户："容器到HUD顶部，直接到窗口最大位置即可，相当于不设置容器顶；
//   堆叠空间没必要，堆叠区从堆叠底部开始，高度上限不需要设置"）：containerTop = 0，
//   容器从块顶开始长；dangerY 直接钉绝对基准，"堆叠空间"退为派生量自动守恒，不再是反推参数。
// ★★★ v188/v190：警戒线绝对基准 = 315+dy（v188 单独下移 10，v191 数值取整）；出生点
//   spawnY = 260+dy 独立基准（v190 起与警戒线解耦——"单独移警戒线"语义：警戒线动、
//   出生点不动、间距必变）；出生通道 = dangerY-spawnY = 55；弹出提示锚
//   mirrorCy = dangerY + 出生通道 = 370+dy（出生区相对警戒线的镜像对称位，v190）。
// ★ v191 数值规范（用户："值要求是 0 或者 5 结尾"）：本文件全部期望值为 5 的倍数。
// ★ v194：body.stackCy = (dangerY+floorY)/2 = 540（漩涡风暴锚点，修复旧 0.45 公式随
//   containerTop=0 静默漂移压警戒线）；图鉴/成就面板 560→600（dexY 140→120）内部重排。
//   dy = C.H - 840（9:18 定版基准块高）：H=840 → 0（= 当前交付逐像素一致）。
// 运行：node test/verify_layout.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({ console: console });
ctx.window = ctx; // 浏览器里 window 即全局自身；config/layout 的 window.MG 与裸 MG 由此一致
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'layout.js'), 'utf8'), ctx);
const L = ctx.window.MG.layout, C = ctx.window.MG.config;
const CONFIG_H0 = C.H; // config 交付比例（改比例只改 config 这一处；先记录再被各段覆盖）

let pass = 0, fail = 0;
function eq(name, got, want) {
  if (got === want) { pass++; return; }
  fail++; console.log('FAIL', name, 'got', JSON.stringify(got), 'want', JSON.stringify(want));
}

// ===== ① 9:18 定版基准（H=840, dy=0）：= 当前交付逐像素一致 =====
// 显式设基准，与 config 当前交付值解耦；含 v178/v181 警戒线+40、v182 容器长高、v188 下移10 成果
C.H = 840; L.build();
eq('dy(定版)', L.dy, 0);
// ---- HUD：钉块顶，绝对定版 ----
eq('hud.row1Y', L.hud.row1Y, 40);
eq('hud.trophyCy', L.hud.trophyCy, 35);
eq('hud.scoreY', L.hud.scoreY, 90);
eq('hud.seaBar.sy', L.hud.seaBar.sy, 100);
eq('hud.seaBar.sh', L.hud.seaBar.sh, 20);
eq('hud.seaBar.sx', L.hud.seaBar.sx, 25);
eq('hud.seaBar.sw', L.hud.seaBar.sw, 370);
eq('hud.quest.qy', L.hud.quest.qy, 130);
eq('hud.quest.qh', L.hud.quest.qh, 35);
eq('hud.quest.qx', L.hud.quest.qx, 10);
eq('hud.quest.qw', L.hud.quest.qw, 205);
eq('hud.tidePill.ty', L.hud.tidePill.ty, 130);
eq('hud.tidePill.th', L.hud.tidePill.th, 35);
eq('hud.tidePill.tx', L.hud.tidePill.tx, 300);
eq('hud.tidePill.tw', L.hud.tidePill.tw, 90);
eq('body.mirrorCy', L.body.mirrorCy, 370);             // v190 镜像锚 = 315+(315-260)
eq('body.stackCy', L.body.stackCy, 540);               // v194 堆叠空间中点 = (315+765)/2：漩涡风暴锚点
eq('漩涡距警戒线', L.body.stackCy - L.body.dangerY, 225); // 盘顶(540-61)远在警戒线下方，永不再压线
eq('hud.hudBottom', L.hud.hudBottom, 165);
// ---- 容器区：底部锚定链（floorY = H-75）；容器顶不设置 = 0（v184）----
eq('body.containerTop', L.body.containerTop, 0);    // v184：容器顶不设置，容器从块顶开始长
eq('body.dangerY', L.body.dangerY, 315);            // 失败线绝对基准（v188 下移10 + v191 取整）
eq('body.floorY', L.body.floorY, 765);              // 840-75（底部带恒 75）
eq('body.spawnY', L.body.spawnY, 260);              // 出生点独立基准（v190 起与警戒线解耦）
eq('body.spawnGap', L.body.spawnGap, 55);           // 出生通道 = dangerY - spawnY（"单独移"显式体现）
eq('body.tutY', L.body.tutY, 575);
eq('容器高(派生)', L.body.floorY - L.body.containerTop, 765);  // 堆叠空间退为派生量，不再设置
// ---- 底部带：恒 75 贴块底，内部钉 floorY 相对位 ----
eq('band.h', L.band.h, 75);
eq('band.btnCy', L.band.btnCy, 795);                 // 765+30（v163 铁律）
eq('band.decorBase', L.band.decorBase, 785);         // 765+20
eq('band.pebbleYOff', L.band.pebbleYOff, 120);
eq('dune0.abs', L.band.decorBase + L.band.dunes[0].dy, 795);
eq('dune1.abs', L.band.decorBase + L.band.dunes[1].dy, 800);
eq('dune2.abs', L.band.decorBase + L.band.dunes[2].dy, 805);
eq('pebble0.abs', L.band.pebbles[0][1] + L.band.pebbleYOff, 805);
eq('pebble7.abs', L.band.pebbles[7][1] + L.band.pebbleYOff, 815);
eq('starfish.abs', L.band.starfish.y + L.band.pebbleYOff, 820);
eq('shell.abs', L.band.shell.y + L.band.pebbleYOff, 820);
eq('按钮-容器底恒距', L.band.btnCy - L.body.floorY, 30);
// ---- 面板/菜单：底部锚定 ----
eq('overRect.y', L.overRect().y, 230);               // focusCy465 - 235
eq('overRect.x', L.overRect().x, 50);
eq('shareRect.y', L.shareRect().y, 255);             // 465 - 210
eq('confirmRect.y', L.confirmRect().y, 395);
eq('confirmRect.x', L.confirmRect().x, 60);
eq('ngRect.y', L.ngRect().y, 245);                   // (840-350)/2
eq('panel.focusCy', L.panel.focusCy, 465);
eq('panel.dexY', L.panel.dexY, 120);
eq('panel.dex', L.panel.dex.x + '/' + L.panel.dex.w + '/' + L.panel.dex.h, '20/380/600');
eq('menu.titleY', L.menu.titleY, 310);
eq('menu.subY', L.menu.subY, 345);
eq('menu.bestY', L.menu.bestY, 385);
eq('menu.offlineY', L.menu.offlineY, 410);
eq('menu.startY', L.menu.startY, 490);
eq('menu.footDy', L.menu.footDy, 55);
console.log('① 9:18 定版基准断言: ' + pass + ' pass, ' + fail + ' fail');

// ===== ② 改比例自动重排：HUD 钉顶不动，其余 = 定版基准 + dy 整体平移，底部带恒 75 =====
function checkRatio(H, label) {
  pass = 0; fail = 0;
  var D = H - 840; // dy（底部平移量）
  C.H = H; L.build();
  eq('dy(' + label + ')', L.dy, D);
  // HUD 钉块顶：三组行位完全不动
  eq('hud 不动(' + label + ')', L.hud.row1Y + '/' + L.hud.scoreY + '/' + L.hud.seaBar.sy + '/' + L.hud.quest.qy + '/' + L.hud.trophyCy, '40/90/100/130/35');
  // 容器/警戒线/出生点：定版基准 + dy（容器顶=0 不设置，v184）
  eq('containerTop(' + label + ')', L.body.containerTop, 0);
  eq('dangerY(' + label + ')', L.body.dangerY, 315 + D);
  eq('floorY(' + label + ')', L.body.floorY, 765 + D);
  eq('spawnY(' + label + ')', L.body.spawnY, 260 + D);   // v190：独立基准，不随警戒线
  eq('容器高(派生)(' + label + ')', L.body.floorY - L.body.containerTop, 765 + D);
  eq('堆叠空间(派生)(' + label + ')', L.body.floorY - L.body.dangerY, 450);  // 两者同步+dy，差恒定
  // 出生通道 = dangerY - spawnY = 55（v190 解耦后恒定，不随 dy 变）
  eq('出生通道(派生)(' + label + ')', L.body.dangerY - L.body.spawnY, 55);
  eq('tutY(' + label + ')', L.body.tutY, 575 + D);
  // ★ v190：弹出提示锚 = 出生区相对警戒线的镜像位 = dangerY + 出生通道
  eq('弹出提示锚=镜像位(' + label + ')', L.body.mirrorCy, 370 + D);
  eq('stackCy(' + label + ')', L.body.stackCy, 540 + D);   // v194：堆叠空间中点随底部锚定链平移
  // ★ 弹性残余不再有"容器顶空隙"：容器从块顶(0)开始长，HUD 浮在容器上（v184）
  eq('HUD→坠落间距(' + label + ')', L.body.spawnY - L.hud.hudBottom, 95 + D);
  // 底部带：高度恒 75，内部布局 +dy 平移（不打散）
  eq('band.h(' + label + ')', L.band.h, 75);
  eq('btnCy(' + label + ')', L.band.btnCy, 795 + D);          // = floorY+30
  eq('decorBase(' + label + ')', L.band.decorBase, 785 + D);
  eq('dune0.abs(' + label + ')', L.band.decorBase + L.band.dunes[0].dy, 795 + D);
  eq('dune1.abs(' + label + ')', L.band.decorBase + L.band.dunes[1].dy, 800 + D);
  eq('dune2.abs(' + label + ')', L.band.decorBase + L.band.dunes[2].dy, 805 + D);
  eq('pebble0.abs(' + label + ')', L.band.pebbles[0][1] + L.band.pebbleYOff, 805 + D);
  eq('pebble7.abs(' + label + ')', L.band.pebbles[7][1] + L.band.pebbleYOff, 815 + D);
  eq('starfish.abs(' + label + ')', L.band.starfish.y + L.band.pebbleYOff, 820 + D);
  eq('shell.abs(' + label + ')', L.band.shell.y + L.band.pebbleYOff, 820 + D);
  eq('按钮-容器底恒距(' + label + ')', L.band.btnCy - L.body.floorY, 30);
  // 面板/菜单：定版基准 + dy 平移，不漂流
  eq('overRect.y(' + label + ')', L.overRect().y, 230 + D);
  eq('shareRect.y(' + label + ')', L.shareRect().y, 255 + D);
  eq('confirmRect.y(' + label + ')', L.confirmRect().y, 395 + D);
  eq('focusCy(' + label + ')', L.panel.focusCy, 465 + D);
  eq('dexY(' + label + ')', L.panel.dexY, 120 + D);
  // NG 弹窗：底部锚定（定版 245 + dy）
  eq('ngRect.y(' + label + ')', L.ngRect().y, 245 + D);
  // 菜单：定版基准 + dy 平移（与容器相对关系不变）
  eq('menu(' + label + ')', L.menu.titleY + '/' + L.menu.subY + '/' + L.menu.offlineY + '/' + L.menu.startY,
     (310 + D) + '/' + (345 + D) + '/' + (410 + D) + '/' + (490 + D));
  // 回写 config 真源（物理引擎读 C.*）
  eq('C.floorY回写(' + label + ')', C.floorY, 765 + D);
  eq('C.spawnY回写(' + label + ')', C.spawnY, 260 + D);
  eq('C.dangerY回写(' + label + ')', C.dangerY, 315 + D);
  eq('C.containerTop回写(' + label + ')', C.containerTop, 0);
  console.log('② ' + label + ' 自动重排断言: ' + pass + ' pass, ' + fail + ' fail');
  return fail;
}
var f2 = 0;
f2 += checkRatio(840, '9:18定版');  // 当前交付：dy=0
f2 += checkRatio(880, 'H=880');     // 更高块高：dy=+40，其余全部上移 40、HUD 不动
f2 += checkRatio(945, '8:18场景');  // 历史场景：dy=+105
f2 += checkRatio(747, 'H=747');     // 9:16 数值回归：dy=-93（容器顶=0，不再有 HUD 侵入问题）

// ===== ③ 交付比例回归：config 当前 H =====
pass = 0; fail = 0;
var initialH = CONFIG_H0;         // config 交付值（各段不得污染，从加载瞬间记录）
var ID = initialH - 840;          // 交付 dy
eq('config.H(交付比例)', initialH, 840);
C.H = initialH; L.build();        // 以 config 交付值为准重建
eq('交付 dy', L.dy, 0);
eq('交付 band.h', L.band.h, 75);
eq('交付 btnCy', L.band.btnCy, 795);
eq('交付 floorY', L.body.floorY, 765);
eq('交付 containerTop', L.body.containerTop, 0);   // v184：容器顶不设置
eq('交付 dangerY', L.body.dangerY, 315);
eq('交付 spawnY', L.body.spawnY, 260);
eq('交付 mirrorCy', L.body.mirrorCy, 370);          // v190 镜像锚 = 315+(315-260)
eq('交付 stackCy', L.body.stackCy, 540);            // v194 漩涡锚点 = (315+765)/2
eq('交付 堆叠空间(派生)', L.body.floorY - L.body.dangerY, 450);
eq('交付 HUD→坠落间距', L.body.spawnY - L.hud.hudBottom, 95);
console.log('③ 交付比例回归断言: ' + pass + ' pass, ' + fail + ' fail');
f2 += fail; // 修复：③ 段失败此前被 ④ 段重置、不进退出码

// ===== ④ v192 公告类 ring 锚定 + v194 漩涡锚点（systems.js 静态核查 + 映射算术）=====
// v190 只迁移了 addPopup 的文本映射，7 处公告 ring 遗留 9:16 旧稿坐标（y=150 三处
// 落进 HUD 信息条 hudBottom=165、环与文字分离）。v192 起公告类特效一律经
// annY(y) = mirrorCy + (y-209) 派生（与 addPopup 同一映射）。systems.js 依赖
// 物理/音频/存档不在 vm 中加载，故此处做源码静态核查 + 基于 mirrorCy 的映射算术。
pass = 0; fail = 0;
var SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'systems.js'), 'utf8');
C.H = initialH; L.build(); // 以交付比例重建
function annYv(y) { return L.body.mirrorCy + (y - 209); }
eq('annY定义', /function annY\(y\) \{ return MG\.layout\.body\.mirrorCy \+ \(y - 209\); \}/.test(SRC), true);
eq('addPopup复用annY', /if \(x === C\.W \/ 2 && y >= 180 && y <= 320\) y = annY\(y\);/.test(SRC), true);
// 7 处公告 ring 全部改为 annY(设计稿y)：150×3（任务完成/成就/图鉴）、205（每日挑战）、
// 232（今日全勤）、285（海域演进）、300（离线收益）
eq('annY(150)处数', (SRC.match(/y: annY\(150\),/g) || []).length, 3);
eq('annY(205)处数', (SRC.match(/y: annY\(205\),/g) || []).length, 1);
eq('annY(232)处数', (SRC.match(/y: annY\(232\),/g) || []).length, 1);
eq('annY(285)处数', (SRC.match(/y: annY\(285\),/g) || []).length, 1);
eq('annY(300)处数', (SRC.match(/y: annY\(300\),/g) || []).length, 1);
// 居中公告 ring 不得再出现写死数字 y
eq('残留写死y的公告ring', /type: 'ring', x: C\.W \/ 2, y: \d/.test(SRC), false);
// 映射算术（dy=0 交付值）：设计稿 y → 弹字带实际 y
eq('annY(150)=311', annYv(150), 311);
eq('annY(205)=366', annYv(205), 366);
eq('annY(232)=393', annYv(232), 393);
eq('annY(285)=446', annYv(285), 446);
eq('annY(300)=461', annYv(300), 461);
// 落点 sanity：150 组不再落在 HUD 信息条内（hudBottom=165）；300 组仍在容器内（floorY=765）
eq('annY(150)出HUD', annYv(150) > L.hud.hudBottom, true);
eq('annY(300)在容器内', annYv(300) < L.body.floorY, true);
// v193 防回归：居中公告弹字的设计稿 y 必须 ≥180（addPopup 映射区间 180~320，
// <180 不进映射、滞留 HUD 信息条——v192 的 7 处 ring 与 v193 的"越线冲走"158 同类）
var badY = [], ym, yre = /addPopup\(C\.W \/ 2, (\d+)/g;
while ((ym = yre.exec(SRC))) { if (Number(ym[1]) < 180) badY.push(Number(ym[1])); }
eq('居中弹字无HUD滞留(<180)', badY.join(','), '');
// v194 漩涡风暴锚点（systems.js）：必须引 layout.body.stackCy，旧 0.45 公式已移除
// （旧公式语义"从容器顶往下 45%"，v184 容器顶改 0 后静默漂移到 344、盘顶压警戒线 31px）
eq('漩涡锚stackCy', /seaEvent\.y = MG\.layout\.body\.stackCy;/.test(SRC), true);
eq('漩涡旧公式已移除', /seaEvent\.y = C\.containerTop/.test(SRC), false);
console.log('④ v192 公告ring锚定断言: ' + pass + ' pass, ' + fail + ' fail');
f2 += fail;

// ===== ⑤ v194 图鉴/成就面板度量（panels.js 静态核查：面板 560→600 后内部重排）=====
// DEX_PANEL 几何来自 MG.layout（vm 已验）；此处核查 panels.js 内部行/格/卡度量，
// 防止后续编辑回退成旧紧凑值。所有 rect 函数被 systems.js 命中判定共用，绘制=热区。
pass = 0; fail = 0;
var PSRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'panels.js'), 'utf8');
eq('海域演进：行高46/行距54', /y: DEX_PANEL\.y \+ 80 \+ g \* 54, w: DEX_PANEL\.w - 28, h: 46/.test(PSRC), true);
eq('特殊滴槽位随行高居中+7', /y: r\.y \+ 7, w: 92, h: 32/.test(PSRC), true);
eq('合成链：112×136/横距120/纵距144', /x: DEX_PANEL\.x \+ 14 \+ \(t % 3\) \* 120, y: DEX_PANEL\.y \+ 76 \+ Math\.floor\(t \/ 3\) \* 144, w: 112, h: 136/.test(PSRC), true);
eq('图鉴说明区贴新面板底+518', /DEX_PANEL\.y \+ 518, DEX_PANEL\.w - 24, 68/.test(PSRC), true);
eq('成就卡：172×76/行距84', /var cw = 172, ch = 76, gap = 8;/.test(PSRC), true);
eq('每日卡：距138', /DEX_PANEL\.y \+ 184 \+ i \* 138/.test(PSRC), true);
eq('每日卡：高108', /DEX_PANEL\.w - 28, 108, 10/.test(PSRC), true);
eq('榜单行：距72', /DEX_PANEL\.y \+ 86 \+ i \* 72/.test(PSRC), true);
eq('榜单行：高58', /DEX_PANEL\.w - 28, 58, 9/.test(PSRC), true);
console.log('⑤ v194 图鉴/成就面板度量断言: ' + pass + ' pass, ' + fail + ' fail');
f2 += fail;

process.exit(f2 ? 1 : 0);
