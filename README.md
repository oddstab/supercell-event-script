# Supercell 比賽腳本 — 專案分析文件

一個 Tampermonkey/Greasemonkey **使用者腳本（userscript）**，用於在 Supercell 官方賽事直播頁面（荒野亂鬥 Brawl Stars + 皇室戰爭 Clash Royale）上自動完成各種互動任務，以賺取活動獎勵。

---

## 目錄

- [專案概覽](#專案概覽)
- [檔案結構](#檔案結構)
- [Userscript Metadata](#userscript-metadata)
- [核心功能](#核心功能)
- [系統架構](#系統架構)
- [WebSocket 訊息格式](#websocket-訊息格式)
- [兩款遊戲的差異處理](#兩款遊戲的差異處理)
- [`index.js` 與 `index copy.js` 的差異](#indexjs-與-index-copyjs-的差異)
- [已知問題與風險](#已知問題與風險)
- [改進建議](#改進建議)

---

## 專案概覽

| 項目 | 說明 |
|------|------|
| 類型 | 瀏覽器使用者腳本（Userscript） |
| 執行環境 | Tampermonkey / Greasemonkey |
| 語言 | 原生 JavaScript（IIFE，無框架、無建置流程） |
| 目標站台 | `https://event.supercell.com/brawlstars/*`、`https://event.supercell.com/clashroyale/*` |
| 注入時機 | `document-start`（在頁面腳本執行前注入，以便攔截 `WebSocket`） |
| 版本 | 2.0 |

腳本的核心價值在於 **攔截頁面的 WebSocket 連線**，即時讀取賽事互動（quiz 問答、match prediction 勝負預測）的資料，並自動做出最佳化的點擊行為，同時在頁面側欄渲染一個自製的即時資訊面板。

---

## 檔案結構

```
brawlstars_event/
├── index.js          # 主腳本（v2.0，目前使用中）— 935 行
└── index copy.js     # 舊版備份 — 兩款遊戲共用統一面板的版本
```

> 兩個檔案都是完整、可獨立運作的 userscript。`index.js` 是較新的版本，分離了 CR 專屬面板（`updateCRPanel`）並加入了倒數投票機制；`index copy.js` 是較早的統一面板版本，另外保留了 Rate slider 自動拖曳功能。

---

## Userscript Metadata

```javascript
// ==UserScript==
// @name         Supercell 比賽腳本 (Brawl Stars + Clash Royale)
// @version      2.0
// @description  自動按讚, 自動選MVP, 自動選答案 — 支援荒野亂鬥 & 皇室戰爭
// @match        https://event.supercell.com/brawlstars/*
// @match        https://event.supercell.com/clashroyale/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
```

關鍵設定說明：

- **`@run-at document-start`**：必須在頁面任何腳本執行前注入，這樣才能在頁面建立 WebSocket 連線之前覆寫 `window.WebSocket`。
- **`@grant none`**：不使用任何 Tampermonkey 特權 API，純粹在頁面 context 中執行原生 JS。

---

## 核心功能

### 1. 遊戲與語言偵測
啟動時依 URL 判斷目前是哪款遊戲與頁面語言：

```javascript
const GAME = currentUrl.includes('/clashroyale/') ? 'clashroyale' : 'brawlstars';
const LANG_MATCH = currentUrl.match(/\/(en|zh-tc|zh-cn|ja|ko|fr|de|es|pt|it)\//);
const PAGE_LANG = LANG_MATCH ? LANG_MATCH[1] : 'en';
```

並載入兩份 locale JSON：
- `zh-tc.json`（中文資料，用於內部判讀與面板顯示）
- `${PAGE_LANG}.json`（頁面實際語言，用於比對按鈕上的文字）

locale 每 5 秒重新抓取一次。

### 2. 自動「抓住它 / Grab」（隨機獎勵）
每 0.5 秒嘗試點擊獎勵掉落按鈕，相容多語系與兩款遊戲：

```javascript
setInterval(() => {
  findAndClickButtonWithText(document.body, GRAB_TEXT); // 「抓住它!」
  findAndClickButtonWithText(document.body, "Grab");
  findAndClickButtonWithText(document.body, "GRAB");
  const lootCard = document.querySelector('.card-loot button:not([disabled])');
  if (lootCard) lootCard.click();
}, 500);
```

### 3. 自動按讚 / Cheer
- **Brawl Stars**：直接點 `.cheer-btn-container__cheer-btn`。
- **Clash Royale**：流程較複雜——先開啟表情面板 → 隨機選一個表情 → 之後持續點擊 `activePin` 的按鈕。

### 4. 自動選 MVP
掃描所有 `<h3>`，若文字含「的MVP」，點擊其父層的按鈕。

### 5. 自動回答 Quiz（問答）
透過 WebSocket 攔截處理，分兩種情境：
- **已知正解**（`payload.correctAnswer`）：用 locale 文字比對按鈕並點擊，比對失敗則 fallback 用答案編號點第 N 顆按鈕。
- **尚未公佈正解**：採「最多人選」策略搶先投票（`getHighestPercentageKey`）。

### 6. 自動預測勝負（Match Prediction）
- 偵測「誰會贏得這場比賽」（`mp0001` / 特定 entityId）。
- **延遲 10 秒投票**：收到 prediction 後啟動倒數，等大多數人投完再依「最多人選」的選項投票，藉此提高命中率。
- 面板會即時顯示倒數秒數與目前領先選項。

### 7. 即時資訊面板
在賽事側欄 feed 區塊注入自製面板（`#ws-panel`），仿 Supercell 官方 UI 風格：
- 顯示題目、各選項票數百分比進度條、正解 / 最多人選標記。
- 提供「COPY JSON」按鈕複製原始 payload。
- `index copy.js` 版本另有歷史紀錄（最多 30 筆，可點擊回看）與 SIMPLE / FULL JSON 切換。

### 8. 音效提醒
`playNotificationSound()` 使用 Web Audio API 產生兩段上升音（880Hz → 1100Hz）。當 feed 出現新內容（且非比賽結果卡 post_game_card）時播放，透過 `MutationObserver` 監聽 `.feed-content` 的子元素數量變化觸發。

---

## 系統架構

整體採 **IIFE + 多個 `setInterval` 輪詢 + WebSocket 攔截** 的混合模式。

```
┌─────────────────────────────────────────────────────────┐
│                    IIFE (document-start)                  │
├─────────────────────────────────────────────────────────┤
│  初始化: GAME / PAGE_LANG 偵測, fetchLocale()             │
├──────────────────────┬──────────────────────────────────┤
│  輪詢層 (setInterval) │  事件層                            │
│  ─────────────────── │  ──────────────────────────────   │
│  • 抓住它 / Grab      │  • window.WebSocket 覆寫           │
│  • Cheer 按讚         │    └ message → 解析 quiz /         │
│  • 選 MVP            │       match_prediction →           │
│  • BS prediction      │       自動點擊 + updatePanel       │
│  • 自動重連 (停用)    │  • MutationObserver (feed 新內容)  │
│  • locale 重抓        │    └ playNotificationSound()       │
└──────────────────────┴──────────────────────────────────┘
                  │
                  ▼
          DOM 操作工具
          • findAndClickButtonWithText() — 遞迴搜尋按鈕
          • getHighestPercentageKey()    — 找最高票選項
          • updateCRPanel / updatePanel  — 渲染面板
```

### WebSocket 攔截機制（核心）

```javascript
const OriginalWebSocket = window.WebSocket;
function MyWebSocket(url, protocols) {
  const ws = new OriginalWebSocket(url, protocols);
  ws.addEventListener('message', function (event) {
    const jsonData = JSON.parse(event.data);
    // 解析 messageType: quiz / match_prediction / global_state
    // 依內容自動點擊正確答案並更新面板
  });
  return ws;
}
window.WebSocket = MyWebSocket;
```

由於在 `document-start` 注入，能在頁面建立連線前替換建構函式，達成透明攔截。

---

## WebSocket 訊息格式

訊息為陣列，取 `jsonData[0]`，主要欄位：

| 欄位 | 說明 |
|------|------|
| `messageType` | `quiz` / `match_prediction` / `global_state`（後者被忽略） |
| `payload.answers` | 各選項票數，例如 `{ "answer_1": 120, "answer_2": 80 }`（BS）或 `{ "0": 120, "1": 80 }`（CR） |
| `payload.alternatives` | 選項定義；BS 為物件（含 `value` locale key），CR 為陣列 |
| `payload.correctAnswer.alternative` | 正解的選項 key（公佈後才有） |
| `payload.titleKey` / `payload.question` | 題目的 locale key |
| `payload.typeId` | 該題的識別碼 |
| `payload.completed` | prediction 是否已結束 |
| `payload.endTime` | 結束時間戳（`index copy.js` 用來判斷剩餘時間） |

---

## 兩款遊戲的差異處理

| 面向 | Brawl Stars | Clash Royale |
|------|-------------|--------------|
| Cheer 按讚 | 單一按鈕直接點 | 需先開面板→選表情→持續點 activePin |
| `alternatives` 格式 | 物件（key: `answer_1`...，含 locale `value`） | 陣列（index `0`,`1`...） |
| `answers` key | `answer_1` 等字串 | 數字字串 `"0"`,`"1"` |
| 答案匹配 | 用 locale 文字比對按鈕 | 用 index 點第 N 顆 `.card-prediction` / `.buttons-quiz` 按鈕 |
| 資訊面板 | `#maybe-answer`（簡單 `<pre>`） | `updateCRPanel`（完整樣式面板） |
| prediction 投票 | interval fallback + WS 即時 | WS 即時（`tryVoteMatchPrediction`） |

---

## `index.js` 與 `index copy.js` 的差異

| 功能 | `index.js`（v2.0 現行） | `index copy.js`（舊版） |
|------|------------------------|------------------------|
| 雙語 locale（頁面語言比對） | ✅ 有 | ❌ 只載入 zh-tc |
| 音效提醒 + feed MutationObserver | ✅ 有 | ❌ 無 |
| Match prediction 投票策略 | 收到後固定倒數 **10 秒** 再投 | 依 `endTime`，**剩餘 < 10 秒** 才投 |
| 面板實作 | BS 用 `#maybe-answer`、CR 用 `updateCRPanel` | BS/CR **統一** `updatePanel` |
| WS 歷史紀錄面板 | ❌ 無 | ✅ 有（30 筆可回看） |
| SIMPLE / FULL JSON 切換 | ❌（CR 面板固定顯示 payload） | ✅ 有 |
| 自動拉 Rate slider（評分拉滿） | ❌ 無 | ✅ 有（PointerEvent 模擬拖曳） |
| 全域樣式注入 | 內嵌在面板 `<style>` | `injectGlobalStyles()` 注入 head（`!important`） |

> 結論：`index.js` 在「自動答題準確度」與「使用體驗（音效、雙語）」上較完善；`index copy.js` 則保留了 Rate slider 自動評分與歷史紀錄等 `index.js` 已移除的功能。若要合併，可考慮把 Rate slider 與歷史紀錄移植回 `index.js`。

---

## 已知問題與風險

### 1. `index.js` 的 `matchVoteCountdown` 未定義（潛在 ReferenceError）
在 BS 的 interval fallback 中（約 377 行）：

```javascript
if (matchVoteCountdown > 0) return; // 還在倒數中，不投
```

但整份檔案**從未宣告 `matchVoteCountdown`**，實際使用的變數是 `matchVoteEndTime`。在嚴格模式（`'use strict'`）下存取未宣告變數會丟出 `ReferenceError`，使這段 fallback 被外層 `try/catch` 靜默吞掉而**完全失效**。建議改為：

```javascript
if (matchVoteEndTime > Date.now()) return;
```

### 2. 大量 `setInterval` 輪詢
數個每 0.5～1 秒的計時器持續掃描整個 DOM（`findAndClickButtonWithText` 是遞迴全樹搜尋），長時間執行可能造成 CPU 負擔。可改為事件驅動或縮小搜尋根節點。

### 3. `console.error` 被全域覆寫為空函式
`console.error = () => {};` 會讓所有錯誤訊息（含第三方）被吞掉，debug 困難。

### 4. 依賴脆弱的 CSS 選擇器 / 文字比對
大量硬編碼 class（`.cheer-btn`、`.card-prediction`...）與中文文字（「的MVP」、「抓住它!」），Supercell 一旦改版即失效。

### 5. 使用條款風險
自動化操作賽事互動以取得獎勵，很可能違反 Supercell 活動條款，帳號有被處置的風險。此為使用者需自行承擔的合規問題。

---

## 改進建議

1. **修正 `matchVoteCountdown` bug**（改用 `matchVoteEndTime`），恢復 BS fallback 投票。
2. **合併兩個檔案**：以 `index.js` 為基底，移植 `index copy.js` 的 Rate slider、WS 歷史紀錄、SIMPLE/FULL 切換。
3. **抽出設定常數**（輪詢間隔、倒數秒數、選擇器）到頂部設定區，方便調整與維護。
4. **保留 `console.error`**，改用具名 prefix 的 logger，可由開關控制輸出。
5. **以 `MutationObserver` 取代部分輪詢**，降低 CPU 使用。
6. **集中管理選擇器**為一份 map，改版時只需改一處。
