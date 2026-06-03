# Claude Code 红绿灯

> [English](./README.md) | 简体中文

一个常驻桌面、悬浮在所有窗口最上层的"红绿灯"，实时显示你的 Claude Code 会话当前在做什么。

| 颜色 | 状态 | 含义 |
|------|------|------|
| 🟡 黄 | working | Claude 正在运行 |
| 🔴 红 | needs-you | 需要你授权或输入 |
| 🟢 绿 | idle | 本回合结束，或没有进行中的会话 |

## 工作原理

一个插件，两个协作部分：

- **钩子**（`plugin/hooks/`）—— Claude Code 的生命周期钩子把当前状态写入
  `~/.claude/traffic-light/status.json`；并在会话启动时，若红绿灯没在运行就拉起它。
- **悬浮窗**（`plugin/overlay/`）—— 一个 Electron 小程序，监听上面那个文件并据此变色。
  `/setup` 会把它复制到 `~/.claude/traffic-light/app/` 并在那里安装 Electron。

两者只通过那个固定的状态文件通信，因此彼此解耦、各自独立运行。

## 安装 —— 三条命令，全程不碰终端

在 Claude Code 里依次执行：

```text
/plugin marketplace add windssea/claudecode-light
/plugin install claude-traffic-light@windssea-tools
/claude-traffic-light:setup
```

1. `marketplace add` 注册这个 GitHub 仓库（仓库里有 `.claude-plugin/marketplace.json`）。
2. `install` 从 `./plugin` 子目录拉取 `claude-traffic-light` 插件。
3. `/setup`（只跑一次）把 Electron 装到 `~/.claude/traffic-light/app`、启动红绿灯；
   之后**每次启动 Claude Code 都会自动拉起**，并且若已在运行**不会重复启动**
   （PID 检测 + Electron 单实例锁双重保险）。

装完后若钩子没立即生效，重启一次 Claude Code。

红绿灯出现在屏幕右上角，悬浮在其它窗口之上，可拖动。要关闭就从系统托盘菜单
（那个灰色小圆点图标）点 Quit；下次开 Claude 会话时它会自己回来。

## 重新安装 / 更新

`/setup` 可以随时重复执行。如果悬浮窗正在运行，它的进程会锁住应用目录，导致复制步骤报 `EPERM` 错误。需要先关掉它：

**Windows**
```bash
powershell -NoProfile -Command "Stop-Process -Name electron -Force -ErrorAction SilentlyContinue"
```

**macOS**
```bash
pkill -f "traffic-light/app"
```

然后重新执行安装：

```text
/claude-traffic-light:setup
```

这会重新复制插件文件（包括任何 CSS/JS 改动）、按需重装 Electron、并重新拉起悬浮窗。

> **注意：** `/setup` 从插件缓存（`~/.claude/plugins/cache/windssea-tools/claude-traffic-light/`）复制，而不是从你的本地克隆。
> 如果你在 `plugin/overlay/renderer.css` 做了修改，需要同时修改
> `~/.claude/traffic-light/app/overlay/renderer.css` 并重启悬浮窗，
> 或者更新插件缓存后重新跑 `/setup`。

## 跨平台

代码是纯 Node + Electron，路径都用 `os.homedir()` 解析，**Windows 和 macOS 都能跑**：

- **Windows**：已完整实测（启动、变色、置顶、拖动、托盘、自启动、单实例、崩溃恢复）。
- **macOS**：已做针对性优化——隐藏 Dock 图标（只留托盘）、悬浮在全屏 App 之上。
  逻辑跨平台一致，但建议你在 Mac 上首次验证一遍（见下方"在 Mac 上验证"）。

> `/setup` 在任一平台都需要先 `npm install` 下载 Electron（约 200MB），这是 Electron
> 应用绕不开的一步。

## 配置

`/setup` 之后，编辑实时配置文件
`~/.claude/traffic-light/app/overlay/config.json`，然后重启红绿灯（托盘 → Quit，
再开一个 Claude 会话，或重新跑 `/setup`）。可配置项：

- `size`：直径（像素）
- `margin`：距屏幕边缘的间距
- `position`：`top-right` | `top-left` | `bottom-right` | `bottom-left`
- `stalenessMinutes`：黄灯多久没更新就判定为"可能卡死"（变暗提示）
- `colors`：四个状态各自的颜色

（源副本在 `plugin/overlay/config.json`。）

当 `working`（黄）状态超过 `stalenessMinutes` 没有更新——例如会话被强杀、没有正常
触发 `Stop`/`SessionEnd`——红绿灯会**变暗到 40% 透明度**提示你它可能已经过期。

## 不开会话也能预览

```bash
node scripts/drive-states.js
```
每 2 秒把状态文件轮换一遍，方便你看红绿灯依次变色。Ctrl+C 停止。

## 从源码开发

```bash
git clone https://github.com/windssea/claudecode-light.git
cd claudecode-light/plugin/overlay && npm install && npm start   # 直接跑悬浮窗
```

在仓库根目录跑 `npm test` 执行单元测试（路径解析、状态/颜色/过期逻辑、状态序列化、
钩子 CLI、PID/存活检测）。

## 在 Mac 上验证

1. 装好插件并跑 `/claude-traffic-light:setup`（首次会下载 Electron）。
2. 确认右上角出现红绿灯、悬浮在其它窗口之上、Dock 里**没有**多余图标（只在菜单栏/托盘）。
3. 跑 `node scripts/drive-states.js`，看它在 🟡→🔴→🟢 之间循环变色。
4. 进一个全屏 App，确认红绿灯仍在最上层可见。
5. 在 Claude 里实测：发提示 → 🟡，需要授权 → 🔴，回答结束 → 🟢，结束会话 → 🟢。

## 许可证

[MIT](./LICENSE)
