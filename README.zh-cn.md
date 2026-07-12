# Supercell Event Script

Tampermonkey 脚本，自动完成 Supercell 赛事直播页面上的互动任务，赚取活动奖励。

支持 Brawl Stars + Clash Royale。

---

## 功能

- **自动 Cheer（加油）** — 自动选表情并持续点击加油按钮
- **自动 Quiz（问答）** — 拦截 WebSocket 消息，依正确答案或最多人选的选项自动作答
- **自动 Match Prediction（胜负预测）** — 收到预测后等待 10 秒，根据投票百分比自动选择
- **自动 Loot Drop（奖励掉落）** — 自动点击 Grab / Push 按钮
- **自动选 MVP** — 检测到 MVP 投票时自动点击
- **实时信息面板** — 在 feed 区显示 WebSocket 连接状态、投票百分比、原始 JSON

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 创建新脚本，粘贴 `index.js` 内容
3. 打开 `https://event.supercell.com/brawlstars/` 或 `https://event.supercell.com/clashroyale/`

## 运作原理

脚本在 `document-start` 注入，覆写 `window.WebSocket` 拦截所有消息，搭配多个 `setInterval` 轮询 DOM 来自动点击各种按钮。

---

其他语言: [繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)
