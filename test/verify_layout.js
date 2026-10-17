// 布局几何验证（v177）：MG.layout 单一几何真源
// 纯 node 计算（vm 加载 config + layout，无浏览器/无 canvas）。
// ★ v177 新语义（覆盖 v175"底部带吸收"方案，用户："底部带固定不变，多出的区域应当留在
//   HUD 三组行位与坠落高度之间的间距"）：
//   HUD(0~164) 钉块顶不动；容器/警戒线/坠落高度/底部带/面板/菜单 = 9:16 基准 + EXTRA 整体下移；
//   底部带高度恒 74。EXTRA = C.H - 747。
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

// ===== ① H=747（EXTRA=0）：全部派生值必须等于 v171 硬编码值（像素级不变）=====
// 显式设基线，与 config 当前交付值解耦（config 改比例后本段仍回归 9:16）
C.H = 747; L.build();
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
eq('body.containerTop', L.body.containerTop, 190);
eq('body.dangerY', L.body.dangerY, 254);
eq('body.floorY', L.body.floorY, 673);
eq('body.spawnY', L.body.spawnY, 209);
eq('body.tutY', L.body.tutY, 480);
eq('band.h', L.band.h, 74);
eq('band.btnCy', L.band.btnCy, 701);
eq('band.decorBase', L.band.decorBase, 691);
eq('band.pebbleYOff', L.band.pebbleYOff, 27);
eq('dune0.abs', L.band.decorBase + L.band.dunes[0].dy, 703);
eq('dune1.abs', L.band.decorBase + L.band.dunes[1].dy, 705);
eq('dune2.abs', L.band.decorBase + L.band.dunes[2].dy, 709);
eq('pebble0.abs', L.band.pebbles[0][1] + L.band.pebbleYOff, 715);
eq('pebble7.abs', L.band.pebbles[7][1] + L.band.pebbleYOff, 723);
eq('starfish.abs', L.band.starfish.y + L.band.pebbleYOff, 727);
eq('shell.abs', L.band.shell.y + L.band.pebbleYOff, 729);
eq('overRect.y', L.overRect().y, 134);
eq('overRect.x', L.overRect().x, 50);
eq('shareRect.y', L.shareRect().y, 160);
eq('confirmRect.y', L.confirmRect().y, 300);
eq('confirmRect.x', L.confirmRect().x, 60);
eq('ngRect.y', L.ngRect().y, 199.5);
eq('panel.dex', L.panel.dex.x + '/' + L.panel.dex.w + '/' + L.panel.dex.h, '20/380/560');
eq('menu.titleY', L.menu.titleY, 218);
eq('menu.subY', L.menu.subY, 252);
eq('menu.bestY', L.menu.bestY, 294);
eq('menu.offlineY', L.menu.offlineY, 316);
eq('menu.startY', L.menu.startY, 396);
eq('menu.footDy', L.menu.footDy, 56);
eq('extra(747)', L.extra, 0);
console.log('① 9:16 像素不变断言: ' + pass + ' pass, ' + fail + ' fail');

// ===== ② 改比例自动重排：HUD 钉顶不动，其余 = 基准 + EXTRA 整体下移，底部带恒 74 =====
function checkRatio(H, label) {
  pass = 0; fail = 0;
  var X = H - 747; // EXTRA
  C.H = H; L.build();
  eq('extra(' + label + ')', L.extra, X);
  // HUD 钉块顶：三组行位完全不动
  eq('hud 不动(' + label + ')', L.hud.row1Y + '/' + L.hud.scoreY + '/' + L.hud.seaBar.sy + '/' + L.hud.quest.qy + '/' + L.hud.trophyCy, '41/88/100/130/36');
  // 容器/警戒线/坠落高度：+EXTRA 下移（容器高恒 483）
  eq('containerTop(' + label + ')', L.body.containerTop, 190 + X);
  eq('dangerY(' + label + ')', L.body.dangerY, 254 + X);
  eq('floorY(' + label + ')', L.body.floorY, 673 + X);
  eq('spawnY(' + label + ')', L.body.spawnY, 209 + X);
  eq('容器高(' + label + ')', L.body.floorY - L.body.containerTop, 483);
  eq('堆叠空间(' + label + ')', L.body.floorY - L.body.dangerY, 419);
  eq('tutY(' + label + ')', L.body.tutY, 480 + X);
  // ★ 多出的区域垫在 HUD 与坠落高度之间：164 → spawnY
  eq('HUD→坠落间距(' + label + ')', L.body.spawnY - L.hud.hudBottom, 45 + X);
  // 底部带：高度恒 74，内部布局 +EXTRA 平移（不打散）
  eq('band.h(' + label + ')', L.band.h, 74);
  eq('btnCy(' + label + ')', L.band.btnCy, 701 + X);          // = floorY+28
  eq('decorBase(' + label + ')', L.band.decorBase, 691 + X);
  eq('dune0.abs(' + label + ')', L.band.decorBase + L.band.dunes[0].dy, 703 + X);
  eq('dune1.abs(' + label + ')', L.band.decorBase + L.band.dunes[1].dy, 705 + X);
  eq('dune2.abs(' + label + ')', L.band.decorBase + L.band.dunes[2].dy, 709 + X);
  eq('pebble0.abs(' + label + ')', L.band.pebbles[0][1] + L.band.pebbleYOff, 715 + X);
  eq('pebble7.abs(' + label + ')', L.band.pebbles[7][1] + L.band.pebbleYOff, 723 + X);
  eq('starfish.abs(' + label + ')', L.band.starfish.y + L.band.pebbleYOff, 727 + X);
  eq('shell.abs(' + label + ')', L.band.shell.y + L.band.pebbleYOff, 729 + X);
  eq('按钮-容器底恒距(' + label + ')', L.band.btnCy - L.body.floorY, 28);
  // 面板：锚定游戏区焦点 +EXTRA 平移，不漂流
  eq('overRect.y(' + label + ')', L.overRect().y, 134 + X);
  eq('shareRect.y(' + label + ')', L.shareRect().y, 160 + X);
  eq('confirmRect.y(' + label + ')', L.confirmRect().y, 300 + X);
  eq('focusCy(' + label + ')', L.panel.focusCy, 370 + X);
  // NG 弹窗：按块居中（随块高）
  eq('ngRect.y(' + label + ')', L.ngRect().y, (H - 348) / 2);
  eq('blockCy(' + label + ')', L.panel.blockCy, H / 2);
  // 菜单：+EXTRA 平移（与容器相对关系不变）
  eq('menu(' + label + ')', L.menu.titleY + '/' + L.menu.subY + '/' + L.menu.offlineY + '/' + L.menu.startY,
     (218 + X) + '/' + (252 + X) + '/' + (316 + X) + '/' + (396 + X));
  // 回写 config 真源（物理引擎读 C.*）
  eq('C.floorY回写(' + label + ')', C.floorY, 673 + X);
  eq('C.spawnY回写(' + label + ')', C.spawnY, 209 + X);
  eq('C.dangerY回写(' + label + ')', C.dangerY, 254 + X);
  eq('C.containerTop回写(' + label + ')', C.containerTop, 190 + X);
  console.log('② ' + label + ' 自动重排断言: ' + pass + ' pass, ' + fail + ' fail');
  return fail;
}
var f2 = 0;
f2 += checkRatio(840, '9:18');   // 当前交付：EXTRA=+93
f2 += checkRatio(945, '8:18');   // 历史场景回归：EXTRA=+198（曾因方案错误被否，现语义正确）
f2 += checkRatio(800, 'H=800');  // 任意比例抽查：EXTRA=+53

// ===== ③ 交付比例回归：config 当前 H =====
pass = 0; fail = 0;
var initialH = CONFIG_H0;         // config 交付值（各段不得污染，从加载瞬间记录）
eq('config.H(交付比例)', initialH, 840);
C.H = initialH; L.build();        // 以 config 交付值为准重建
eq('交付 band.h', L.band.h, 74);
eq('交付 btnCy', L.band.btnCy, 701 + (initialH - 747));
eq('交付 floorY', L.body.floorY, 673 + (initialH - 747));
eq('交付 spawnY', L.body.spawnY, 209 + (initialH - 747));
eq('交付 HUD→坠落间距', L.body.spawnY - L.hud.hudBottom, 45 + (initialH - 747));
console.log('③ 交付比例回归断言: ' + pass + ' pass, ' + fail + ' fail');

process.exit((fail + f2) ? 1 : 0);
