# Supercell Event Script

Supercell eスポーツイベントページでのインタラクションを自動化し、イベント報酬を獲得するTampermonkeyユーザースクリプト。

Brawl Stars + Clash Royale 対応。

---

## 機能

- **自動チアー** — ピン絵文字を選択し、チアーボタンを連続クリック
- **自動クイズ** — WebSocketメッセージを傍受し、正解または最多得票の選択肢で自動回答
- **自動マッチ予測** — 予測表示後10秒待機し、投票率に基づいて自動投票
- **自動ルートドロップ** — Grab / Push ボタンを自動クリック
- **自動MVP** — MVP投票を検出して自動クリック
- **リアルタイム情報パネル** — WebSocket接続状態、投票率、生JSONをフィード領域に表示

## インストール

1. [Tampermonkey](https://www.tampermonkey.net/) をインストール
2. 新規スクリプトを作成し、`index.js` の内容を貼り付け
3. `https://event.supercell.com/brawlstars/` または `https://event.supercell.com/clashroyale/` にアクセス

## 仕組み

`document-start` で注入し、`window.WebSocket` をオーバーライドして全メッセージを傍受。`setInterval` によるDOMポーリングと組み合わせ、各種UIボタンを自動クリックします。

---

他の言語: [繁體中文](README.md) | [English](README.en.md)
