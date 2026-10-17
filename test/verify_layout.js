// 布局几何验证（v183）：MG.layout 单一几何真源
// 纯 node 计算（vm 加载 config + layout，无浏览器/无 canvas）。
// ★ v183 新定位语义（覆盖 v175~v182 的 EXTRA 分配方案；用户：
//   "HUD 部分按照顶部定位，其他的按照底部定位，弹性空间不需要设置，有多少是多少！"）：
//   HUD(0~164) 钉块顶，绝对定版不动；其余一切 = 9:18 定版基准值 + dy，随块底整体平移；
//   HUD 底与容器顶之间的空隙 = 79+dy，自然伸缩、不显式分配。
// ★★ v184：容器顶不设置（用户："容器到HUD顶部，直接到窗口最大位置即可，相当于不设置容器顶；
//   堆叠空间没必要，堆叠区从堆叠底部开始，高度上限不需要设置"）：containerTop = 0，
//   容器从块顶开始长；dangerY 直接钉绝对基准 387+dy（含 v178/v181 两次+40），
//   "堆叠空间"退为派生量 floorY-dangerY=379 自动守恒，不再是反推参数。
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
// 显式设基准，与 config 当前交付值解耦；含 v178/v181 警戒线+40 与 v182 容器长高+40 成果
C.H = 840; L.build();
eq('dy(定版)', L.dy, 0);
// ---- HUD：钉块顶，绝对定版 ----
eq('hud.row1Y', L.hud.row1Y, 41);
eq('hud.trophyCy', L.hud.trophyCy, 36);
eq('hud.scoreY', L.hud.scoreY, 88);
eq('hud.seaBar.sy', L.hud.seaBar.sy, 100);
eq('hud.seaBar.sh', L.hud.seaBar.sh, 20);
eq('hud.seaBar.sx', L.hud.seaBar.sx, 24);
eq('hud.seaBar.sw', L.hud.seaBar.sw, 372);
eq('hud.quest.qy', L.hud.quest.qy, 130);
eq('hud.quest.qh', L.hud.quest.qh, 34);
eq('hud.tidePill.ty', L.hud.tidePill.ty, 130);
eq('hud.tidePill.tx', L.hud.tidePill.tx, 298);
eq('hud.tideBannerY', L.hud.tideBannerY, 250);
eq('hud.hudBottom', L.hud.hudBottom, 164);
// ---- 容器区：底部锚定链（floorY = H-74）；容器顶不设置 = 0（v184）----
eq('body.containerTop', L.body.containerTop, 0);    // v184：容器顶不设置，容器从块顶开始长
eq('body.dangerY', L.body.dangerY, 387);            // 失败线绝对基准（含 v178/v181 两次+40）
eq('body.floorY', L.body.floorY, 766);              // 840-74（底部带恒 74）
eq('body.spawnY', L.body.spawnY, 342);              // 387-45（公式派生）
eq('body.tutY', L.body.tutY, 573);
eq('容器高(派生)', L.body.floorY - L.body.containerTop, 766);  // 堆叠空间退为派生量，不再设置
// ---- 底部带：恒 74 贴块底，内部钉 floorY 相对位 ----
eq('band.h', L.band.h, 74);
eq('band.btnCy', L.band.btnCy, 794);                 // 766+28（v163 铁律）
eq('band.decorBase', L.band.decorBase, 784);         // 766+18
eq('band.pebbleYOff', L.band.pebbleYOff, 120);
eq('dune0.abs', L.band.decorBase + L.band.dunes[0].dy, 796);
eq('dune1.abs', L.band.decorBase + L.band.dunes[1].dy, 798);
eq('dune2.abs', L.band.decorBase + L.band.dunes[2].dy, 802);
eq('pebble0.abs', L.band.pebbles[0][1] + L.band.pebbleYOff, 808);
eq('pebble7.abs', L.band.pebbles[7][1] + L.band.pebbleYOff, 816);
eq('starfish.abs', L.band.starfish.y + L.band.pebbleYOff, 820);
eq('shell.abs', L.band.shell.y + L.band.pebbleYOff, 822);
eq('按钮-容器底恒距', L.band.btnCy - L.body.floorY, 28);
// ---- 面板/菜单：底部锚定 ----
eq('overRect.y', L.overRect().y, 227);               // focusCy463 - 236
eq('overRect.x', L.overRect().x, 50);
eq('shareRect.y', L.shareRect().y, 253);             // 463 - 210
eq('confirmRect.y', L.confirmRect().y, 393);
eq('confirmRect.x', L.confirmRect().x, 60);
eq('ngRect.y', L.ngRect().y, 246);                   // (840-348)/2
eq('panel.focusCy', L.panel.focusCy, 463);
eq('panel.dexY', L.panel.dexY, 140);
eq('panel.dex', L.panel.dex.x + '/' + L.panel.dex.w + '/' + L.panel.dex.h, '20/380/560');
eq('menu.titleY', L.menu.titleY, 311);
eq('menu.subY', L.menu.subY, 345);
eq('menu.bestY', L.menu.bestY, 387);
eq('menu.offlineY', L.menu.offlineY, 409);
eq('menu.startY', L.menu.startY, 489);
eq('menu.footDy', L.menu.footDy, 56);
console.log('① 9:18 定版基准断言: ' + pass + ' pass, ' + fail + ' fail');

// ===== ② 改比例自动重排：HUD 钉顶不动，其余 = 定版基准 + dy 整体平移，底部带恒 74 =====
function checkRatio(H, label) {
  pass = 0; fail = 0;
  var D = H - 840; // dy（底部平移量）
  C.H = H; L.build();
  eq('dy(' + label + ')', L.dy, D);
  // HUD 钉块顶：三组行位完全不动
  eq('hud 不动(' + label + ')', L.hud.row1Y + '/' + L.hud.scoreY + '/' + L.hud.seaBar.sy + '/' + L.hud.quest.qy + '/' + L.hud.trophyCy, '41/88/100/130/36');
  // 容器/警戒线/坠落高度：定版基准 + dy（容器顶=0 不设置，v184）
  eq('containerTop(' + label + ')', L.body.containerTop, 0);
  eq('dangerY(' + label + ')', L.body.dangerY, 387 + D);
  eq('floorY(' + label + ')', L.body.floorY, 766 + D);
  eq('spawnY(' + label + ')', L.body.spawnY, 342 + D);
  eq('容器高(派生)(' + label + ')', L.body.floorY - L.body.containerTop, 766 + D);
  eq('堆叠空间(派生)(' + label + ')', L.body.floorY - L.body.dangerY, 379);
  eq('tutY(' + label + ')', L.body.tutY, 573 + D);
  // ★ 弹性残余不再有"容器顶空隙"：容器从块顶(0)开始长，HUD 浮在容器上（v184）
  eq('HUD→坠落间距(' + label + ')', L.body.spawnY - L.hud.hudBottom, 178 + D);
  // 底部带：高度恒 74，内部布局 +dy 平移（不打散）
  eq('band.h(' + label + ')', L.band.h, 74);
  eq('btnCy(' + label + ')', L.band.btnCy, 794 + D);          // = floorY+28
  eq('decorBase(' + label + ')', L.band.decorBase, 784 + D);
  eq('dune0.abs(' + label + ')', L.band.decorBase + L.band.dunes[0].dy, 796 + D);
  eq('dune1.abs(' + label + ')', L.band.decorBase + L.band.dunes[1].dy, 798 + D);
  eq('dune2.abs(' + label + ')', L.band.decorBase + L.band.dunes[2].dy, 802 + D);
  eq('pebble0.abs(' + label + ')', L.band.pebbles[0][1] + L.band.pebbleYOff, 808 + D);
  eq('pebble7.abs(' + label + ')', L.band.pebbles[7][1] + L.band.pebbleYOff, 816 + D);
  eq('starfish.abs(' + label + ')', L.band.starfish.y + L.band.pebbleYOff, 820 + D);
  eq('shell.abs(' + label + ')', L.band.shell.y + L.band.pebbleYOff, 822 + D);
  eq('按钮-容器底恒距(' + label + ')', L.band.btnCy - L.body.floorY, 28);
  // 面板/菜单：定版基准 + dy 平移，不漂流
  eq('overRect.y(' + label + ')', L.overRect().y, 227 + D);
  eq('shareRect.y(' + label + ')', L.shareRect().y, 253 + D);
  eq('confirmRect.y(' + label + ')', L.confirmRect().y, 393 + D);
  eq('focusCy(' + label + ')', L.panel.focusCy, 463 + D);
  eq('dexY(' + label + ')', L.panel.dexY, 140 + D);
  // NG 弹窗：底部锚定（定版 246 + dy）
  eq('ngRect.y(' + label + ')', L.ngRect().y, 246 + D);
  // 菜单：定版基准 + dy 平移（与容器相对关系不变）
  eq('menu(' + label + ')', L.menu.titleY + '/' + L.menu.subY + '/' + L.menu.offlineY + '/' + L.menu.startY,
     (311 + D) + '/' + (345 + D) + '/' + (409 + D) + '/' + (489 + D));
  // 回写 config 真源（物理引擎读 C.*）
  eq('C.floorY回写(' + label + ')', C.floorY, 766 + D);
  eq('C.spawnY回写(' + label + ')', C.spawnY, 342 + D);
  eq('C.dangerY回写(' + label + ')', C.dangerY, 387 + D);
  eq('C.containerTop回写(' + label + ')', C.containerTop, 0);
  // 公告带锚 = dangerY - dangerShift(40)（剥离两次+20，弹字钉调整前警戒线，不随其漂移）
  eq('公告带锚(' + label + ')', C.dangerY - L.dangerShift, 347 + D);
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
eq('交付 band.h', L.band.h, 74);
eq('交付 btnCy', L.band.btnCy, 794);
eq('交付 floorY', L.body.floorY, 766);
eq('交付 containerTop', L.body.containerTop, 0);   // v184：容器顶不设置
eq('交付 dangerY', L.body.dangerY, 387);
eq('交付 spawnY', L.body.spawnY, 342);
eq('交付 containerTop', L.body.containerTop, 0);   // v184：容器顶不设置
eq('交付 堆叠空间(派生)', L.body.floorY - L.body.dangerY, 379);
eq('交付 HUD→坠落间距', L.body.spawnY - L.hud.hudBottom, 178);
console.log('③ 交付比例回归断言: ' + pass + ' pass, ' + fail + ' fail');

process.exit((fail + f2) ? 1 : 0);
