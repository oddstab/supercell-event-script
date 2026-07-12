# Supercell Event Script

Tampermonkey userscript，自動完成 Supercell 賽事直播頁面上的互動任務，賺取活動獎勵。

支援 Brawl Stars + Clash Royale。

---

## 功能

- **自動 Cheer（加油）** — 自動選表情並持續點擊加油按鈕
- **自動 Quiz（問答）** — 攔截 WebSocket 訊息，依正確答案或最多人選的選項自動作答
- **自動 Match Prediction（勝負預測）** — 收到預測後等待 10 秒，根據投票百分比自動選擇
- **自動 Loot Drop（獎勵掉落）** — 自動點擊 Grab / Push 按鈕
- **自動選 MVP** — 偵測到 MVP 投票時自動點擊
- **即時資訊面板** — 在 feed 區顯示 WebSocket 連線狀態、投票百分比、原始 JSON

## 安裝

1. 安裝 [Tampermonkey](https://www.tampermonkey.net/)
2. 建立新腳本，貼上 `index.js` 內容
3. 開啟 `https://event.supercell.com/brawlstars/` 或 `https://event.supercell.com/clashroyale/`

## 運作原理

腳本在 `document-start` 注入，覆寫 `window.WebSocket` 攔截所有訊息，搭配多個 `setInterval` 輪詢 DOM 來自動點擊各種按鈕。

---

其他語言 / Other languages: [English](README.en.md) | [日本語](README.ja.md)
