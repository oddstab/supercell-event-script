# Supercell Event Script

Tampermonkey userscript for auto-interacting with Supercell esports event pages (Brawl Stars + Clash Royale).

---

## 繁體中文

自動完成 Supercell 賽事直播頁面上的互動任務，賺取活動獎勵。

### 功能

- **自動 Cheer（加油）** — 自動選表情並持續點擊加油按鈕
- **自動 Quiz（問答）** — 攔截 WebSocket 訊息，依正確答案或最多人選的選項自動作答
- **自動 Match Prediction（勝負預測）** — 收到預測後等待 10 秒，根據投票百分比自動選擇
- **自動 Loot Drop（獎勵掉落）** — 自動點擊 Grab / Push 按鈕
- **自動選 MVP** — 偵測到 MVP 投票時自動點擊
- **即時資訊面板** — 在 feed 區顯示 WebSocket 連線狀態、投票百分比、原始 JSON

### 安裝

1. 安裝 [Tampermonkey](https://www.tampermonkey.net/)
2. 建立新腳本，貼上 `index.js` 內容
3. 開啟 `https://event.supercell.com/brawlstars/` 或 `https://event.supercell.com/clashroyale/`

### 運作原理

腳本在 `document-start` 注入，覆寫 `window.WebSocket` 攔截所有訊息，搭配多個 `setInterval` 輪詢 DOM 來自動點擊各種按鈕。

---

## English

Automates interactions on Supercell esports event pages to earn event rewards.

### Features

- **Auto Cheer** — Selects a pin emoji and continuously clicks the cheer button
- **Auto Quiz** — Intercepts WebSocket messages, answers with the correct answer or most popular choice
- **Auto Match Prediction** — Waits 10 seconds after prediction appears, votes based on highest percentage
- **Auto Loot Drop** — Clicks Grab / Push buttons automatically
- **Auto MVP** — Votes for MVP when detected
- **Live Info Panel** — Displays WebSocket status, vote percentages, and raw JSON in the feed area

### Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Create a new script and paste the contents of `index.js`
3. Visit `https://event.supercell.com/brawlstars/` or `https://event.supercell.com/clashroyale/`

### How It Works

Injected at `document-start`, the script overrides `window.WebSocket` to intercept all messages, combined with `setInterval` polling to auto-click various UI buttons.

---

## 日本語

Supercell eスポーツイベントページでのインタラクションを自動化し、イベント報酬を獲得します。

### 機能

- **自動チアー** — ピン絵文字を選択し、チアーボタンを連続クリック
- **自動クイズ** — WebSocketメッセージを傍受し、正解または最多得票の選択肢で自動回答
- **自動マッチ予測** — 予測表示後10秒待機し、投票率に基づいて自動投票
- **自動ルートドロップ** — Grab / Push ボタンを自動クリック
- **自動MVP** — MVP投票を検出して自動クリック
- **リアルタイム情報パネル** — WebSocket接続状態、投票率、生JSONをフィード領域に表示

### インストール

1. [Tampermonkey](https://www.tampermonkey.net/) をインストール
2. 新規スクリプトを作成し、`index.js` の内容を貼り付け
3. `https://event.supercell.com/brawlstars/` または `https://event.supercell.com/clashroyale/` にアクセス

### 仕組み

`document-start` で注入し、`window.WebSocket` をオーバーライドして全メッセージを傍受。`setInterval` によるDOMポーリングと組み合わせ、各種UIボタンを自動クリックします。
