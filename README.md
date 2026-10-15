# 水滴成海 · Merge Ocean

原创合成小游戏（Web 版 + 微信小游戏版）——同种水滴相融合成，从雾泡一路汇入沧海。

**在线试玩：<https://game.luosgeo.com>**

## 玩法

- 点击/拖动投放水滴，同种水滴相遇即合成下一级（雾泡 → 水滴 → 露珠 → … → 沧海）。
- **第 1 关**：累计 500 分即进入无尽模式；**无尽模式**：礁石障碍、潮汐涨落、雨云/漩涡/冰晶等特殊水滴全部解锁。
- 三大技能（换滴 / 涟漪 / 蒸发）：合成带**符文**的水滴充能，任务完成直接充满。
- 水位越过警戒线判负，可看广告复活（每局 2 次）。
- 海域图鉴按累计得分逐级解锁，汇入海域提升全局得分加成。

## 运行

纯静态页面，零依赖、零构建：

```bash
# 任选一种方式起个静态服务器
python -m http.server 8080
# 或 npx serve .
```

打开 <http://localhost:8080> 即可游玩；也可直接双击 `index.html`。

## 目录结构

```
├── index.html        # 入口页面
├── js/
│   ├── config.js     # 全部数值锚点（合成链/技能/礁石/潮汐/关卡，一行可调）
│   ├── physics.js    # 自研圆形物理（子步进积分 + 冲量解算）
│   └── main.js       # 游戏主逻辑（渲染/合成/技能/图鉴/潮汐/音效/广告位）
├── wechat/           # 微信小游戏版（adapter 垫片复用同一套 js/，音效为离线合成 WAV）
└── tools/            # 辅助脚本（音效离线合成 gen-audio.js、wx 环境启动自检 test-boot.js）
```

## 发布（GitHub Pages）

1. 仓库根目录已含 `CNAME`（内容为 `game.luosgeo.com`）。
2. GitHub 仓库 **Settings → Pages**：Source 选 `main` 分支 / `(root)`，Custom domain 填 `game.luosgeo.com`。
3. 在 `luosgeo.com` 的 DNS 解析处添加记录：

   | 类型 | 主机记录 | 记录值 |
   | ---- | -------- | ------ |
   | CNAME | game | `<你的GitHub用户名>.github.io` |

4. 生效后在 Pages 设置里勾选 **Enforce HTTPS**。

## 许可

MIT License，见 [LICENSE](LICENSE)。
