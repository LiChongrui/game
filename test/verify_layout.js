// 布局几何验证（v317）：MG.layout 单一几何真源 + 公告类 ring 锚定 + 漩涡锚点/图鉴面板度量/HUD 卡与底部六钮/第一排圆钮/设置钮与设置弹窗（含第4行清空存档+二级确认面板）/设置图标静态核查
// 纯 node 计算（vm 加载 config + layout，无浏览器/无 canvas）。
// ★ v183 新定位语义（覆盖 v175~v182 的 EXTRA 分配方案；用户：
//   "HUD 部分按照顶部定位，其他的按照底部定位，弹性空间不需要设置，有多少是多少！"）：
//   HUD(0~190, v195 下探占用伸缩区 25) 钉块顶，绝对定版不动；其余一切 = 9:18 定版基准值 + dy，随块底整体平移。
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
// 源文件读取统一走 src()：工作副本为 CRLF（core.autocrlf），git 索引为 LF——
// 断言按 LF 语义书写，读入时归一化换行，避免换行风格变化造成假红
function src(rel) { return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n'); }

// ===== ① 9:18 定版基准（H=840, dy=0）：= 当前交付逐像素一致 =====
// 显式设基准，与 config 当前交付值解耦；含 v178/v181 警戒线+40、v182 容器长高、v188 下移10 成果
C.H = 840; L.build();
eq('dy(定版)', L.dy, 0);
// ---- HUD：钉块顶，绝对定版 ----
eq('hud.row1Y', L.hud.row1Y, 40);
eq('hud.trophyCy', L.hud.trophyCy, 35);
eq('hud.setCx', L.hud.setCx, 25);                       // v197：设置钮 x（占原奖杯位；音量钮已移除）
eq('hud.rowBtnR', L.hud.rowBtnR, 18);                 // v196：第一排圆钮统一半径（v197 起仅设置钮，15→18）
eq('hud.scoreY', L.hud.scoreY, 85);                     // v234b：80→85（设置钮底53~进度条顶98 中点≈75 居中）
eq('hud.seaBar.sy', L.hud.seaBar.sy, 98);               // v223：100→98 上移 2 补偿（高 20→24）
eq('hud.seaBar.sh', L.hud.seaBar.sh, 24);               // v223：高 20→24（上让分数行间隙、下留潮汐前 3px）
eq('hud.seaBar.sx', L.hud.seaBar.sx, 25);
eq('hud.seaBar.sw', L.hud.seaBar.sw, 370);
eq('hud.quest.qy', L.hud.quest.qy, 125);
eq('hud.quest.qh', L.hud.quest.qh, 60);
eq('hud.quest.qx', L.hud.quest.qx, 15);
eq('hud.quest.qw', L.hud.quest.qw, 285);
eq('hud.tidePill.ty', L.hud.tidePill.ty, 135);          // v273 127→142 拉开与进度条(底122)间距；v274 142→135（用户"降到135"）
eq('hud.tidePill.th', L.hud.tidePill.th, 44);           // v208：高 52→44；v213 起卡宽固定（按两位数 '99s' 封顶）
eq('hud.tidePill右锚定', L.hud.tidePill.side + '/' + L.hud.tidePill.margin, 'right/25'); // v208 起重构为右锚定：tx/tw 字段已撤销
eq('body.mirrorCy', L.body.mirrorCy, 370);             // v190 镜像锚 = 315+(315-260)
eq('body.stackCy', L.body.stackCy, 540);               // v194 堆叠空间中点 = (315+765)/2：漩涡风暴锚点
eq('漩涡距警戒线', L.body.stackCy - L.body.dangerY, 225); // 盘顶(540-61)远在警戒线下方，永不再压线
eq('hud.hudBottom', L.hud.hudBottom, 190);           // v195：HUD 底沿 165→190（占用伸缩区 25）
eq('HUD底→出生点残余', L.body.spawnY - L.hud.hudBottom, 70); // 特殊滴虚影标签空间（r≤36 不碰 HUD）
// ---- 容器区：底部锚定链（floorY = H-75）；容器顶不设置 = 0（v184）----
eq('body.containerTop', L.body.containerTop, 0);    // v184：容器顶不设置，容器从块顶开始长
eq('body.dangerY', L.body.dangerY, 315);            // 失败线绝对基准（v188 下移10 + v191 取整）
eq('body.floorY', L.body.floorY, 765);              // 840-75（底部带恒 75）
eq('body.spawnY', L.body.spawnY, 260);              // 出生点独立基准（v190 起与警戒线解耦）
eq('body.spawnGap', L.body.spawnGap, 55);           // 出生通道 = dangerY - spawnY（"单独移"显式体现）
eq('body.tutY', L.body.tutY, 535);                     // v231：575→535 上移 40（堆叠区中部）
eq('容器高(派生)', L.body.floorY - L.body.containerTop, 765);  // 堆叠空间退为派生量，不再设置
// ---- 底部带：恒 75 贴块底，内部钉 floorY 相对位 ----
eq('band.h', L.band.h, 75);
eq('band.btnCy', L.band.btnCy, 795);                 // 765+30（v163 铁律）
// ★ v195 底部六钮：均匀分布 + 两端等距（用户："底部按钮/道具应当均匀分布，且左侧按钮（图鉴）
//   与右侧按钮（重开）距离左右边界的距离应该是一定的"）
eq('band.btnCx', L.band.btnCx.join('/'), '35/105/175/245/315/385');
eq('band.btnR', L.band.btnR, 20);                    // 六钮统一半径（重开 15→20）
eq('六钮等距70', L.band.btnCx[1] - L.band.btnCx[0] + '/' + (L.band.btnCx[5] - L.band.btnCx[4]), '70/70');
eq('左缘距=右缘距', (L.band.btnCx[0] - L.band.btnR) + '/' + (C.W - L.band.btnCx[5] - L.band.btnR), '15/15');
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
eq('confirmRect.y', L.confirmRect().y, 308);            // (840-224)/2：v300 恢复标题行后面板 224 高
eq('confirmRect.x', L.confirmRect().x, 60);
// ★ v197 设置弹窗（用户："游戏内这个地方改成设置按钮，用来弹出设置音效、音乐和震动"）：
//   v317 加第 4 行「清空存档」→ 面板 260→326 块内居中（行几何不变：rowDy50/rowGap66/rowH56）；
//   四行排满 50+3×66+56=304，余 22。v317 另有清档二级确认 setClear（300×180，两钮横排）
eq('setRect.x/y', L.setRect().x + '/' + L.setRect().y, '60/257');     // (420-300)/2；(840-326)/2
eq('setRect.w/h', L.setRect().w + '/' + L.setRect().h, '300/326');
eq('setRowRect(0).y', L.setRowRect(0).y, 307);                        // 257+50（标题区）
eq('setRowRect(2).y', L.setRowRect(2).y, 439);                        // 257+50+2×66
eq('setRowRect(3).y', L.setRowRect(3).y, 505);                        // v317 清空存档行：257+50+3×66
eq('setRowRect(3)底≤面板底', L.setRowRect(3).y + L.setRowRect(3).h <= L.setRect().y + L.setRect().h, true); // 561≤583，余 22
eq('setRowRect.w/h', L.setRowRect(0).w + '/' + L.setRowRect(0).h, '260/56');
eq('setCloseRect.x/y', L.setCloseRect().x + '/' + L.setCloseRect().y, '320/265'); // 60+300-40；257+8（v197 起 ✕ 热区改 -40，门曾按旧 -42 记 318）
// v317 清档二级确认：300×180 块内居中；取消/确认清空横排等宽（120，左右各 24、间距 12）
eq('setClearRect.x/y/w/h', L.setClearRect().x + '/' + L.setClearRect().y + '/' + L.setClearRect().w + '/' + L.setClearRect().h, '60/330/300/180');
eq('setClearBtnRect(0)', L.setClearBtnRect(0).x + '/' + L.setClearBtnRect(0).y + '/' + L.setClearBtnRect(0).w + '/' + L.setClearBtnRect(0).h, '84/438/120/42');
eq('setClearBtnRect(1).x', L.setClearBtnRect(1).x, 216);              // 84+120+12
eq('setClearCloseRect.x/y', L.setClearCloseRect().x + '/' + L.setClearCloseRect().y, '320/338'); // 与 setCloseRect 同款：60+300-40；330+8
eq('ngRect.y', L.ngRect().y, 245);                   // (840-350)/2
eq('panel.focusCy', L.panel.focusCy, 465);
eq('panel.dexY', L.panel.dexY, 120);
eq('panel.dex', L.panel.dex.x + '/' + L.panel.dex.w + '/' + L.panel.dex.h, '20/380/600');
// ---- 菜单（v237 撤海域牌/历史最佳牌/底部玩法一句话 → 磁贴列+吉祥物+离线卡+开始钮；
//      v287 标题下移20、v289 回上10；v288 离线卡 60→80）----
eq('menu.titleY', L.menu.titleY, 130);                  // v303 菜单重设（磁贴列+吉祥物+离线卡+开始钮）；v287 下移20、v289 回上10
eq('menu.subY', L.menu.subY, 148);                      // = titleY + 18（v303 起）
eq('menu.bestY已撤销', L.menu.bestY, undefined);        // v237/v303：历史最佳牌整套移除
eq('menu.footDy已撤销', L.menu.footDy, undefined);      // v237/v303：底部玩法一句话移除
eq('menu.offlineY', L.menu.offlineY, 565);              // v288：卡高 60→80（三行文字不溢底）
eq('menu.startY', L.menu.startY, 690);
console.log('① 9:18 定版基准断言: ' + pass + ' pass, ' + fail + ' fail');

// ===== ② 改比例自动重排：HUD 钉顶不动，其余 = 定版基准 + dy 整体平移，底部带恒 75 =====
function checkRatio(H, label) {
  pass = 0; fail = 0;
  var D = H - 840; // dy（底部平移量）
  C.H = H; L.build();
  eq('dy(' + label + ')', L.dy, D);
  // HUD 钉块顶：三组行位完全不动（v223 进度条 98/24、v234b scoreY 85——比例变化仍不动）
  eq('hud 不动(' + label + ')', L.hud.row1Y + '/' + L.hud.scoreY + '/' + L.hud.seaBar.sy + '/' + L.hud.quest.qy + '/' + L.hud.trophyCy, '40/85/98/125/35');
  // 容器/警戒线/出生点：定版基准 + dy（容器顶=0 不设置，v184）
  eq('containerTop(' + label + ')', L.body.containerTop, 0);
  eq('dangerY(' + label + ')', L.body.dangerY, 315 + D);
  eq('floorY(' + label + ')', L.body.floorY, 765 + D);
  eq('spawnY(' + label + ')', L.body.spawnY, 260 + D);   // v190：独立基准，不随警戒线
  eq('容器高(派生)(' + label + ')', L.body.floorY - L.body.containerTop, 765 + D);
  eq('堆叠空间(派生)(' + label + ')', L.body.floorY - L.body.dangerY, 450);  // 两者同步+dy，差恒定
  // 出生通道 = dangerY - spawnY = 55（v190 解耦后恒定，不随 dy 变）
  eq('出生通道(派生)(' + label + ')', L.body.dangerY - L.body.spawnY, 55);
  eq('tutY(' + label + ')', L.body.tutY, 535 + D);      // v231：575→535（随底部锚定链平移）
  // ★ v190：弹出提示锚 = 出生区相对警戒线的镜像位 = dangerY + 出生通道
  eq('弹出提示锚=镜像位(' + label + ')', L.body.mirrorCy, 370 + D);
  eq('stackCy(' + label + ')', L.body.stackCy, 540 + D);   // v194：堆叠空间中点随底部锚定链平移
  // ★ 弹性残余不再有"容器顶空隙"：容器从块顶(0)开始长，HUD 浮在容器上（v184）
  eq('HUD→坠落间距(' + label + ')', L.body.spawnY - L.hud.hudBottom, 70 + D);
  // 底部带：高度恒 75，内部布局 +dy 平移（不打散）
  eq('band.h(' + label + ')', L.band.h, 75);
  eq('btnCy(' + label + ')', L.band.btnCy, 795 + D);          // = floorY+30
  eq('btnCx(' + label + ')', L.band.btnCx.join('/'), '35/105/175/245/315/385'); // v195：由 W 派生，与比例无关
  eq('btnR(' + label + ')', L.band.btnR, 20);
  eq('rowBtnR(' + label + ')', L.hud.rowBtnR, 18);      // v196：第一排圆钮半径由 W 派生前的常量真源，比例无关
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
  eq('confirmRect.y(' + label + ')', L.confirmRect().y, 308 + D); // v300 恢复标题行：面板 224 高块内居中
  // v197 设置弹窗：块内居中，随 dy 平移（行区/✕ 热区同步）；v317 面板 326、第 4 行清档
  eq('setRect.y(' + label + ')', L.setRect().y, 257 + D);
  eq('setRowRect(0).y(' + label + ')', L.setRowRect(0).y, 307 + D);
  eq('setRowRect(2).y(' + label + ')', L.setRowRect(2).y, 439 + D);
  eq('setRowRect(3).y(' + label + ')', L.setRowRect(3).y, 505 + D); // v317 清空存档行
  eq('setCloseRect.y(' + label + ')', L.setCloseRect().y, 265 + D);
  // v317 清档二级确认：块内居中随 dy 平移，两钮/✕ 同步
  eq('setClearRect.y(' + label + ')', L.setClearRect().y, 330 + D);
  eq('setClearBtnRect(1).x(' + label + ')', L.setClearBtnRect(1).x, 216);
  eq('setClearCloseRect.y(' + label + ')', L.setClearCloseRect().y, 338 + D);
  eq('focusCy(' + label + ')', L.panel.focusCy, 465 + D);
  eq('dexY(' + label + ')', L.panel.dexY, 120 + D);
  // NG 弹窗：底部锚定（定版 245 + dy）
  eq('ngRect.y(' + label + ')', L.ngRect().y, 245 + D);
  // 菜单：定版基准 + dy 平移（v303 重设：磁贴列+吉祥物+离线卡+开始钮；v287/v289 标题微调）
  eq('menu(' + label + ')', L.menu.titleY + '/' + L.menu.subY + '/' + L.menu.offlineY + '/' + L.menu.startY,
     (130 + D) + '/' + (148 + D) + '/' + (565 + D) + '/' + (690 + D));
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
eq('交付 HUD→坠落间距', L.body.spawnY - L.hud.hudBottom, 70);  // v195：hudBottom 190
eq('交付 btnCx', L.band.btnCx.join('/'), '35/105/175/245/315/385');
eq('交付 btnR', L.band.btnR, 20);
eq('交付 rowBtnR', L.hud.rowBtnR, 18);                 // v196：第一排圆钮统一半径
eq('交付 setCx', L.hud.setCx, 25);                     // v197：设置钮 x（占原奖杯位）
eq('交付 setRect', L.setRect().x + '/' + L.setRect().y + '/' + L.setRect().w + '/' + L.setRect().h, '60/257/300/326'); // v317 设置弹窗（+清空存档行）
eq('交付 setClearRect', L.setClearRect().x + '/' + L.setClearRect().y + '/' + L.setClearRect().w + '/' + L.setClearRect().h, '60/330/300/180'); // v317 清档二级确认
console.log('③ 交付比例回归断言: ' + pass + ' pass, ' + fail + ' fail');
f2 += fail; // 修复：③ 段失败此前被 ④ 段重置、不进退出码

// ===== ④ v192 公告类 ring 锚定 + v194 漩涡锚点（systems.js 静态核查 + 映射算术）=====
// v190 只迁移了 addPopup 的文本映射，7 处公告 ring 遗留 9:16 旧稿坐标（y=150 三处
// 落进 HUD 信息条 hudBottom=165、环与文字分离）。v192 起公告类特效一律经
// annY(y) = mirrorCy + (y-209) 派生（与 addPopup 同一映射）。systems.js 依赖
// 物理/音频/存档不在 vm 中加载，故此处做源码静态核查 + 基于 mirrorCy 的映射算术。
pass = 0; fail = 0;
var SRC = src('js/systems.js');
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
// 落点 sanity：150 组不再落在 HUD 信息条内（hudBottom=190）；300 组仍在容器内（floorY=765）
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

// ===== ⑤ 图鉴/成就面板度量（panels.js 静态核查）=====
// DEX_PANEL 几何来自 MG.layout（vm 已验）；此处核查 panels.js 内部行/格/卡度量，
// 防止后续编辑回退成旧紧凑值。所有 rect 函数被 systems.js 命中判定共用，绘制=热区。
// ★ v279 起图鉴页签化重排（收集度行放大下移→内容区 y+126 起；合成链 3×3 均布）、
//   v243 成就改单列滚动（ACH_ROW_H/GAP）、v247/v249 每日任务改全勤横幅+单色行、
//   v289 合成格 118→112/行距 136→126（用户："最后一排水滴块与底部说明间距要增大"）。
//   本段期望值 = v316 交付现值（v303~v316 演进后同步，勿再按 v194 旧值）。
pass = 0; fail = 0;
var PSRC = src('js/panels.js');
eq('海域演进：行高44/行距48', /y: DEX_PANEL\.y \+ 126 \+ g \* 48, w: DEX_PANEL\.w - 28, h: 44/.test(PSRC), true);
eq('特殊滴槽位随行高居中+6', /y: r\.y \+ 6, w: 92, h: 32/.test(PSRC), true);
eq('合成链：108×112/横距122/纵距126', /x: DEX_PANEL\.x \+ 14 \+ \(t % 3\) \* 122, y: DEX_PANEL\.y \+ 124 \+ Math\.floor\(t \/ 3\) \* 126, w: 108, h: 112/.test(PSRC), true);
eq('图鉴说明区贴新面板底+518', /DEX_PANEL\.y \+ 518, DEX_PANEL\.w - 24, 68/.test(PSRC), true);
eq('成就卡：单列行高64/距8', /var ACH_ROW_H = 64, ACH_ROW_GAP = 8;/.test(PSRC), true);
eq('每日任务行：高62/距72', /var base = fy \+ fh \+ 12, rowH = 62, step = 72;/.test(PSRC), true);
eq('榜单行：4名起距70', /ry = DEX_PANEL\.y \+ 262 \+ \(i - 3\) \* 70/.test(PSRC), true);
eq('榜单行：高54', /roundRect\(DEX_PANEL\.x \+ 14, ry, DEX_PANEL\.w - 28, 54, 9\); ctx\.fill\(\);/.test(PSRC), true);
console.log('⑤ v194 图鉴/成就面板度量断言: ' + pass + ' pass, ' + fail + ' fail');
f2 += fail;

// ===== ⑥ v195 底部六钮真源 + HUD 任务/潮汐卡 + v196 第一排圆钮/统计精简 + v197 设置钮与设置弹窗（systems.js/render.js/core.js 静态核查）=====
// 底部六钮：坐标/半径一律引 layout.band 真源（旧 systems.js 写死 45/115/185/255/325/395
// + restart r15：左缘距 25≠右缘距 10、重开偏小）。HUD 卡：任务条 205×35 → 任务卡 285×60
// （靶心图标+标题+星级+金色进度条）；潮汐胶囊 90×35 → 潮汐计时卡（v202 灵动水波、v207
// 协调化、v213 卡宽固定，drawTideTimer）。
// ★ v196 第一排（用户："优化成就殿堂图标样式/大小；音量按钮同样优化；只统计最大得分和最远海"）：
//   drawRowBtn(c, accent) 统一样式（v199 改彩底白图标）替代旧双风格
//   （奖杯金实心球+白线框 / 音量白底小圆+蓝灰细边）；半径引 layout.hud.rowBtnR=18；
//   统计只留"最高/最远海域"，移除 海域×N/每日挑战/NG。
// ★ v197 第一排重排（用户："图标也太丑了，成就按钮先隐藏掉吧。游戏内这个地方改成设置按钮，
//   用来弹出设置音效、音乐和震动，右侧的音量按钮移除掉"；设置弹窗底部不放说明文本）：
//   成就按钮（奖杯×2）与右上角音量钮整套移除 → 左上角原位新增设置钮（setCx 占原奖杯位，
//   引 rowBtnR）；新增设置弹窗 drawSettings（音效/音乐/震动三开关，v317 +清空存档一行）；
//   core.js audio 拆 sfxOn/musicOn/vibOn 三开关（音效复用旧键 mg_mute、音乐 mg_music
//   缺失继承旧 mute 反值、震动 mg_vib 默认开），hap(ms) 集中接 MG.platform.vibrate；
//   setOpen 与 confirmOpen 同门禁屏蔽瞄准/掉落。v200 起重设图标四风格、v279 设置钮改
//   drawCircleBtn、v2xx 弹窗改 drawPanelFx 回调——本段期望值随这些演进同步（v317 校准）。
pass = 0; fail = 0;
var RSRC = src('js/render.js');
var CSRC = src('js/core.js');
var PLATSRC = src('js/platform.js'); // v317 起前移至本节：v198 旧断言曾误测 CSRC（真身在 platform.js）
eq('六钮引真源处数', (SRC.match(/cx: MG\.layout\.band\.btnCx\[\d\], cy: MG\.layout\.band\.btnCy, r: MG\.layout\.band\.btnR/g) || []).length, 6);
eq('无写死钮坐标', /cx: (45|115|185|255|325|395),/.test(SRC), false);
eq('无写死restart右角', /cx: C\.W - 25, cy: MG\.layout\.band\.btnCy/.test(SRC), false);
// 任务卡（render.js drawQuest）
eq('任务卡卡体', /roundRect\(qx, qy, qw, qh, 14\); ctx\.fill\(\);/.test(RSRC), true);
eq('任务卡靶心图标', /ctx\.arc\(icx, icy, 15, 0, Math\.PI \* 2\); ctx\.fill\(\);/.test(RSRC), true);
eq('任务卡进度条', /var bx = qx \+ 50, bw = 170, by = qy \+ 35, bh = 10;/.test(RSRC), true);
eq('have/need骑条', /ctx\.strokeText\(hn, bx \+ bw \/ 2, by \+ 8\);/.test(RSRC), true);
// 潮汐计时器（render.js drawTideTimer；v202 重设计=灵动水波卡、v207 协调化、v213 卡宽固定）
eq('潮汐计时器定义', /function drawTideTimer\(\) \{/.test(RSRC), true);
eq('旧drawTidePill已移除', /function drawTidePill/.test(RSRC), false);
eq('潮汐卡几何引layout右锚定', /var tp = MG\.layout\.hud\.tidePill;[\s\S]*?var tx = \(tp\.side === 'right'\) \? \(C\.W - tp\.margin - cw\) : tp\.margin;/.test(RSRC), true);
eq('潮汐倒计时固定位文本', /var ns = Math\.ceil\(tide\.timer\) \+ 's';/.test(RSRC), true);
// 重开图标随钮放大（r15→20：弧半径 8→9）
eq('重开图标半径9', /ctx\.arc\(rx0, ry0, 9, -Math\.PI \* 0\.35, Math\.PI \* 1\.25\); ctx\.stroke\(\);/.test(RSRC), true);
// ---- v196 第一排圆钮：统一样式 + 半径真源 + 统计精简 ----
eq('一处半径引rowBtnR', (SRC.match(/r: MG\.layout\.hud\.rowBtnR/g) || []).length, 1); // v197 起仅 setBtn（MUTE/双 trophy 已移除）
eq('无写死row钮半径15', /cy: MG\.layout\.hud\.trophyCy, r: 15/.test(SRC), false);
eq('rowBtnR真源定义', /rowBtnR: 18,/.test(src('js/layout.js')), true);
eq('drawRowBtn定义', /function drawRowBtn\(c, accent\) \{/.test(RSRC), true);
eq('旧drawMiniBtn已删除', /function drawMiniBtn/.test(RSRC), false);
// 统计精简：只留"最高 X · 最远 海域名"（移除 海域×N / 每日挑战 X/Y / 「NG」×N）
eq('统计限宽240', /measureText\(top1\)\.width > 240/.test(RSRC), true);
// 正向锁定 HUD 统计行内容（负向断言过宽：结算海报的"汇入海域 ×N"与 NG 面板的
// "当前词缀「…」"是各自面板的合法文案，不是 HUD 统计回归——改按行内容正向断言）
eq('HUD统计只留最高/最远', /var top1 = '最高 ' \+ best \+ ' · 最远 ' \+ C\.seaStages\[farIdx\]\.name;/.test(RSRC), true);
eq('统计无每日挑战', /每日挑战 ' \+ Math\.min/.test(RSRC), false);
eq('统计色固定', /ctx\.fillStyle = chal && !chal\.done/.test(RSRC), false); // 旧条件紫色已移除
eq('统计无每日挑战紫', /'#7B6FD0'/.test(RSRC), false);
eq('drawHUD无chal死代码', /var chal = dchalHud\(\);/.test(RSRC), false);
eq('dchalHud定义已移除', /function dchalHud\(/.test(SRC), false);
// ---- v197 设置钮 + 设置弹窗（systems.js/render.js/core.js）----
eq('setBtn定义引真源', /var setBtn = \{ cx: MG\.layout\.hud\.setCx, cy: MG\.layout\.hud\.trophyCy, r: MG\.layout\.hud\.rowBtnR, pressT: 0 \};/.test(SRC), true);
eq('无残留MUTE定义', /var MUTE = /.test(SRC), false);
eq('无残留trophyBtn定义', /var trophyBtn = /.test(SRC), false);
eq('无残留menuTrophy定义', /var menuTrophy = /.test(SRC), false);
eq('无inMute函数', /function inMute/.test(SRC), false);
eq('无旧静音切换', /audio\.muted = /.test(SRC), false);
eq('无旧 trophy/menuTrophy 命中', /inCircle\(p, trophyBtn\)|cx: menuTrophy\.cx/.test(SRC), false);
eq('setOpen门禁', /if \(setOpen\) \{/.test(SRC), true);
eq('toggleSet定义', /function toggleSet\(i\)/.test(SRC), true);
eq('音效存旧键mg_mute', /saveFlag\('mg_mute', !audio\.sfxOn\)/.test(SRC), true);
eq('音乐存mg_music', /saveFlag\('mg_music', audio\.musicOn\)/.test(SRC), true);
eq('震动存mg_vib', /saveFlag\('mg_vib', audio\.vibOn\)/.test(SRC), true);
eq('restart关闭setOpen', /confirmOpen = false;\n    setOpen = false;/.test(SRC), true);
eq('drawSetBtn定义', /function drawSetBtn\(\) \{/.test(RSRC), true);
// v279：设置钮改 drawCircleBtn（渐变蓝底+白细内环+左上高光弧，"白边+蓝底"，与技能栏
// 图鉴书本钮同一绘制语言）——v197/v199 的 drawRowBtn(setBtn, accent) 调用已不存在
eq('设置钮引drawCircleBtn蓝底', /drawCircleBtn\(setBtn, '#2E7DA8', 1, false, 0\);/.test(RSRC), true);
eq('设置图标四风格开关', /if \(setIconStyle === 'A'\) setIconCog\(ctx, true\);[\s\S]*?else if \(setIconStyle === 'C'\) setIconSliders\(ctx\);[\s\S]*?else setIconDial\(ctx\);/.test(RSRC), true);
// v200：齿轮重设计为八齿路径（平顶齿+斜肩 proper cog，非星芒）；旧"八根 gi 线"已不在
eq('齿轮八齿路径', /var tipR = 12, rootR = 7\.5, teeth = 8, step = Math\.PI \* 2 \/ teeth;/.test(RSRC), true);
eq('drawSettings定义', /function drawSettings\(\) \{/.test(RSRC), true);
// 设置弹窗经 drawPanelFx 开合动画回调（菜单态/局内两处），不再直接 drawSettings()
eq('设置弹窗两处drawPanelFx调用', (RSRC.match(/drawPanelFx\('set', setOpen, [^)]*drawSettings\)/g) || []).length, 2);
eq('旧drawTrophyBtn已删除', /function drawTrophyBtn/.test(RSRC), false);
eq('旧drawMuteBtn已删除', /function drawMuteBtn/.test(RSRC), false);
eq('render无trophyBtn.cy烤入', /trophyBtn\.cy = MG\.layout\.hud\.trophyCy/.test(RSRC), false);
// 设置弹窗：三行开关（v317 起 + 第 4 行清空存档，行循环仍在 systems.js 输入侧扩到 4；
// 渲染侧第 4 行单独绘制，故本循环保持 si<3）+ 无底部说明文本
eq('设置弹窗三行循环', /for \(var si = 0; si < 3; si\+\+\) \{[\s\S]*?setRowRect\(si\)/.test(RSRC), true);
eq('设置弹窗无说明区文本', /ctx\.fillText\([^)]*py \+ 2[4-9]\d/.test(RSRC), false);
// core.js：audio 拆三开关 + hap 震动（旧单键 muted 拆除）
eq('三开关定义', /sfxOn: /.test(CSRC) && /musicOn: /.test(CSRC) && /vibOn: /.test(CSRC), true);
eq('旧muted字段已移除', /muted: loadFlag/.test(CSRC), false);
eq('无audio.muted残留', /audio\.muted/.test(CSRC), false);
eq('musicOn继承旧mute反值', /v == null \? !loadFlag\('mg_mute'\)/.test(CSRC), true);
eq('vibOn默认开', /v == null \? true/.test(CSRC), true);
eq('hap定义', /function hap\(ms\)/.test(CSRC), true);
eq('hap接震动调用≥8', (CSRC.match(/hap\(\d+\)/g) || []).length >= 8, true);
eq('fit无trophy/MUTE烤入', /trophyBtn\.cy = MG\.layout\.hud\.trophyCy/.test(CSRC), false);
// ---- v198 震动语义纠正（用户："震动不是震动窗口，是手机设备的震动反馈！！！"）----
// hap 只走 MG.platform.vibrate（navigator.vibrate / 微信 wx 桥）= 设备马达；
// 画面摇晃（addShake → render translate 微抖）是独立视觉特效，与震动开关无关
eq('hap只走platform.vibrate', /function hap\(ms\) \{ if \(audio\.vibOn\) MG\.platform\.vibrate\(ms \|\| 20\); \}/.test(CSRC), true);
// platform.js：navigator.vibrate 是真身（v198 起；旧断言误测 CSRC——core.js 只有注释提及）
eq('platform.vibrate走navigator', /if \(navigator && navigator\.vibrate\)/.test(PLATSRC), true);
// v287：震动行说明去"（马达）"措辞（用户：不用突出是马达震动）——desc 只留"震动反馈"
eq('震动行说明去马达措辞', /var descs = \['水滴合成与技能音效', '深海氛围背景音乐', '震动反馈'\];/.test(RSRC), true);
eq('震动旧歧义说明已改', /合成与事件震动反馈/.test(RSRC), false);
// 微信垫片：navigator.vibrate 桥 wx.vibrateShort/vibrateLong（ms→强度），是设备震动非画面抖动
var WSHIM = src('wechat/wx-shim.js');
// v313：真机反馈加档（用户实测 'light' 几乎无感）——短震统一 medium/heavy、长震走
// vibrateLong；type 不被支持时 fail 回退无参短震
eq('垫片vibrate长震桥vibrateLong', /if \(ms >= 40\) \{[\s\S]*?wx\.vibrateLong\(\{ fail:/.test(WSHIM), true);
eq('垫片短震按ms映射强度', /type: ms >= 20 \? 'heavy' : 'medium'/.test(WSHIM), true);
eq('垫片不支持时回退无参短震', (WSHIM.match(/fail: function \(\) \{ try \{ wx\.vibrateShort\(\); \} catch/g) || []).length, 1);
eq('垫片长震fail回退heavy短震', /wx\.vibrateLong\(\{ fail: function \(\) \{ try \{ wx\.vibrateShort\(\{ type: 'heavy' \}\); \} catch \(e2\) \{\} \}/.test(WSHIM), true);
// ---- v199 设置图标重设计（用户："设置的图标太难看了，也不协调"；三样例筛选后选 B）----
// B = 彩底白齿轮：drawRowBtn 从"白0.85底+彩环"改"accent实底+白细内环"，与底部道具钮
// （drawCircleBtn 彩底白图标）同一绘制语言。
// ★ v200 齿轮再重设计：v199B 的"圈齿一体加粗线"放大后齿顶 17.3/18 几乎抵边、发挤发虚 →
//   改八齿路径（平顶齿+斜肩 proper cog，非星芒）tipR=12/rootR=7.5 固定半径留 6px 边距，
//   四种风格（A 实心齿轮/B 线描/C 滑块/D 表盘）经 setIconStyle 开关供筛选，现用 A。
// ★ v279：设置钮改 drawCircleBtn 后 drawRowBtn 已无调用方（死代码保留待用，暂不删）
eq('drawRowBtn实底', /ctx\.fillStyle = accent;\n    ctx\.beginPath\(\); ctx\.arc\(0, 0, c\.r, 0, Math\.PI \* 2\); ctx\.fill\(\);/.test(RSRC), true);
eq('drawRowBtn白细内环', /ctx\.strokeStyle = 'rgba\(255,255,255,0\.35\)'; ctx\.lineWidth = 1\.5;/.test(RSRC), true);
eq('旧白0.85底已移除', /ctx\.fillStyle = 'rgba\(255,255,255,0\.85\)';/.test(RSRC), false);
eq('旧彩环2px已移除', /ctx\.strokeStyle = accent; ctx\.lineWidth = 2;/.test(RSRC), false);
// v200 齿轮（setIconCog）：白色填充/描边 + 蓝心孔（A 实心格）；线描格白线宽 2.5
eq('齿轮实心白填充+蓝心孔', /ctx\.fillStyle = '#FFFFFF'; ctx\.fill\(\);\n      ctx\.fillStyle = '#2E7DA8'; ctx\.beginPath\(\); ctx\.arc\(0, 0, 4\.2, 0, Math\.PI \* 2\); ctx\.fill\(\);/.test(RSRC), true);
eq('齿轮线描格白粗线', /ctx\.strokeStyle = '#FFFFFF'; ctx\.lineWidth = 2\.5; ctx\.lineJoin = 'round'; ctx\.stroke\(\);/.test(RSRC), true);
eq('旧细短线齿已移除', /ctx\.moveTo\(0, -10\); ctx\.lineTo\(0, -6\.5\);/.test(RSRC), false);
eq('旧齿圈r6.5已移除', /ctx\.arc\(0, 0, 6\.5, 0, Math\.PI \* 2\); ctx\.stroke\(\);/.test(RSRC), false);
eq('齿轮旧蓝灰色已移除', /ctx\.strokeStyle = '#3E6E90';\n    ctx\.lineWidth = 1\.6;/.test(RSRC), false);
console.log('⑥ v195六钮真源+HUD卡度量+v196第一排+v197设置+v199/v200/v279设置图标与弹窗断言: ' + pass + ' pass, ' + fail + ' fail');
f2 += fail;

// ---- v317 设置弹窗第 4 行「清空存档」（用户："设置增加一个独立的功能：清空存档。用来重置游戏至初始状态。"）----
// 二级确认面板 panel.setClear（块内居中，取消/确认清空两横钮）；确认 = 删全部 mg_* 存档键 +
// MG.platform.reload()（wx 走 wx.restartMiniProgram）——运行时状态均为加载时初始化的模块级
// 变量，只删存储会让内存与存档不一致，必须整页重载才回到初始状态
pass = 0; fail = 0;
var LSRC2 = src('js/layout.js'); // PLATSRC 已在 ⑥ 节前定义（v317 前移，避免重复声明）
eq('setClearOpen定义', /var setClearOpen = false;/.test(SRC), true);
eq('SAVE_KEYS 15键', /var SAVE_KEYS = \['mg_rune', 'mg_peak', 'mg_seen', 'mg_best', 'mg_life', 'mg_dex', 'mg_ver',\s*'mg_mute', 'mg_music', 'mg_vib', 'mg_tut', 'mg_ng', 'mg_daily', 'mg_dchal', 'mg_friends'\];/.test(SRC), true);
eq('clearSaveData定义', /function clearSaveData\(\) \{/.test(SRC), true);
eq('清档删全部键后重载', /for \(var i = 0; i < SAVE_KEYS\.length; i\+\+\) MG\.platform\.remove\(SAVE_KEYS\[i\]\);[\s\S]*?MG\.platform\.reload\(\);/.test(SRC), true);
eq('设置行循环扩到4行', /for \(var si = 0; si < 4; si\+\+\) \{[\s\S]*?setRowRect\(si\)/.test(SRC), true);
eq('第4行开二级确认', /if \(si === 3\) \{ setClearOpen = true;/.test(SRC), true);
eq('清档确认优先于setOpen分支', /if \(setClearOpen\) \{[\s\S]*?setClearCloseRect\(\)[\s\S]*?setClearBtnRect\(0\)[\s\S]*?setClearBtnRect\(1\)/.test(SRC), true);
eq('restart关闭setClearOpen', /setOpen = false; setClearOpen = false;/.test(SRC), true);
eq('drawSetClear定义', /function drawSetClear\(\) \{/.test(RSRC), true);
eq('setIconTrash定义', /function setIconTrash\(ctx\) \{/.test(RSRC), true);
eq('清档面板两处渲染', (RSRC.match(/drawPanelFx\('setclr'/g) || []).length, 2);
eq('清空存档行文案', /ctx\.fillText\('清空存档', clr\.x \+ 18, clr\.y \+ 24\);/.test(RSRC), true);
eq('清空存档行说明', /ctx\.fillText\('重置全部进度，游戏恢复初始状态', clr\.x \+ 18, clr\.y \+ 42\);/.test(RSRC), true);
eq('确认清空按钮', /'确认清空'/.test(RSRC), true);
eq('清档无法撤销警示', /此操作无法撤销/.test(RSRC), true);
eq('平台remove定义', /remove: function \(k\) \{/.test(PLATSRC), true);
eq('平台reload定义', /reload: function \(\) \{/.test(PLATSRC), true);
eq('wx清档走restartMiniProgram', /wx\.restartMiniProgram/.test(PLATSRC), true);
eq('setClear面板真源', /setClear: \{ w: 300, h: 180, btnH: 42, btnGap: 12, btnTop: 108 \}/.test(LSRC2), true);
eq('setClearRect定义', /setClearRect: function \(\) \{/.test(LSRC2), true);
eq('setClearBtnRect定义', /setClearBtnRect: function \(i\) \{/.test(LSRC2), true);
eq('setClearCloseRect定义', /setClearCloseRect: function \(\) \{/.test(LSRC2), true);
console.log('⑦ v317 清空存档断言: ' + pass + ' pass, ' + fail + ' fail');
f2 += fail;
process.exit(f2 ? 1 : 0);
