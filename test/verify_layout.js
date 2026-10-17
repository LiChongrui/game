// 布局几何验证（v175）：MG.layout 单一几何真源
// 纯 node 计算（vm 加载 config + layout，无浏览器/无 canvas）：
//   ① H=747：全部派生值必须等于 v171 硬编码值 → 重构像素级不变
//   ② H=945：只改 C.H 一处 → 按钮/沙丘/卵石/海星/扇贝钉 floorY 相对位不动，
//      HUD/容器/菜单/面板全部不漂流，底部带自动 74→272
//   ③ 其他比例抽查 + 回 747 复原
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

// ===== ① H=747：全部派生值必须等于 v171 硬编码值（像素级不变）=====
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
console.log('① 9:16 像素不变断言: ' + pass + ' pass, ' + fail + ' fail');

// ===== ② 改比例 H=945：只改 C.H 一处，验证自动重排 =====
pass = 0; fail = 0;
C.H = 945; L.build();
eq('band.h(945)', L.band.h, 272);
eq('band.btnCy(945)', L.band.btnCy, 701);              // 按钮钉 floorY+28 不动
eq('dune0.abs(945)', L.band.decorBase + L.band.dunes[0].dy, 703); // 沙丘相对位不动
eq('dune1.abs(945)', L.band.decorBase + L.band.dunes[1].dy, 705);
eq('dune2.abs(945)', L.band.decorBase + L.band.dunes[2].dy, 709);
eq('pebble0.abs(945)', L.band.pebbles[0][1] + L.band.pebbleYOff, 715);
eq('starfish.abs(945)', L.band.starfish.y + L.band.pebbleYOff, 727);
eq('shell.abs(945)', L.band.shell.y + L.band.pebbleYOff, 729);
eq('hud(945) 不动', L.hud.row1Y + '/' + L.hud.scoreY + '/' + L.hud.quest.qy, '41/88/130');
eq('body(945) 不动', L.body.floorY + '/' + L.body.spawnY + '/' + L.body.containerTop + '/' + L.body.dangerY, '673/209/190/254');
eq('overRect.y(945)', L.overRect().y, 134);            // 面板锚定焦点不漂流
eq('shareRect.y(945)', L.shareRect().y, 160);
eq('confirmRect.y(945)', L.confirmRect().y, 300);
eq('menu(945) 不动', L.menu.startY + '/' + L.menu.titleY + '/' + L.menu.offlineY, '396/218/316');
eq('ngRect.y(945)', L.ngRect().y, 298.5);              // 全屏模态按块居中（随块高）
eq('panel.blockCy(945)', L.panel.blockCy, 472.5);
console.log('② 8:18 自动重排断言: ' + pass + ' pass, ' + fail + ' fail');

// ===== ③ 其他比例抽查 =====
pass = 0; fail = 0;
C.H = 800; L.build();
eq('H=800 band.h', L.band.h, 127);
eq('H=800 btnCy', L.band.btnCy, 701);
eq('H=800 overRect.y', L.overRect().y, 134);

// ---- 交付比例回归：config 当前 H（9:18=840）----
var initialH = CONFIG_H0;         // config 交付值（各段不得污染，从加载瞬间记录）
eq('config.H(交付比例)', initialH, 840);
C.H = initialH; L.build();       // 以 config 交付值为准重建
eq('H=840 band.h', L.band.h, initialH - 673);          // 167：多出高度整段给底部带
eq('H=840 btnCy', L.band.btnCy, 701);                  // 按钮钉 floorY+28 不动
eq('H=840 decorBase', L.band.decorBase, 691);          // 装饰基准不动
eq('H=840 dune0.abs', L.band.decorBase + L.band.dunes[0].dy, 703);
eq('H=840 dune1.abs', L.band.decorBase + L.band.dunes[1].dy, 705);
eq('H=840 dune2.abs', L.band.decorBase + L.band.dunes[2].dy, 709);
eq('H=840 pebble0.abs', L.band.pebbles[0][1] + L.band.pebbleYOff, 715);
eq('H=840 pebble7.abs', L.band.pebbles[7][1] + L.band.pebbleYOff, 723);
eq('H=840 starfish.abs', L.band.starfish.y + L.band.pebbleYOff, 727);
eq('H=840 shell.abs', L.band.shell.y + L.band.pebbleYOff, 729);
eq('H=840 hud 不动', L.hud.row1Y + '/' + L.hud.scoreY + '/' + L.hud.quest.qy, '41/88/130');
eq('H=840 body 不动', L.body.floorY + '/' + L.body.spawnY + '/' + L.body.containerTop + '/' + L.body.dangerY, '673/209/190/254');
eq('H=840 overRect.y', L.overRect().y, 134);           // 面板锚定焦点不漂流
eq('H=840 shareRect.y', L.shareRect().y, 160);
eq('H=840 confirmRect.y', L.confirmRect().y, 300);
eq('H=840 menu 不动', L.menu.startY + '/' + L.menu.titleY + '/' + L.menu.offlineY, '396/218/316');
eq('H=840 ngRect.y', L.ngRect().y, (initialH - 348) / 2);  // NG 弹窗按块居中（246）
eq('H=840 blockCy', L.panel.blockCy, initialH / 2);        // 420
console.log('③ 多比例抽查: ' + pass + ' pass, ' + fail + ' fail');

process.exit(fail ? 1 : 0);
