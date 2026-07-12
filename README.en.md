# Supercell Event Script

Tampermonkey userscript for auto-interacting with Supercell esports event pages to earn event rewards.

Supports Brawl Stars + Clash Royale.

---

## Features

- **Auto Cheer** — Selects a pin emoji and continuously clicks the cheer button
- **Auto Quiz** — Intercepts WebSocket messages, answers with the correct answer or most popular choice
- **Auto Match Prediction** — Waits 10 seconds after prediction appears, votes based on highest percentage
- **Auto Loot Drop** — Clicks Grab / Push buttons automatically
- **Auto MVP** — Votes for MVP when detected
- **Live Info Panel** — Displays WebSocket status, vote percentages, and raw JSON in the feed area

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/)
2. Create a new script and paste the contents of `index.js`
3. Visit `https://event.supercell.com/brawlstars/` or `https://event.supercell.com/clashroyale/`

## How It Works

Injected at `document-start`, the script overrides `window.WebSocket` to intercept all messages, combined with `setInterval` polling to auto-click various UI buttons.

---

Other languages: [繁體中文](README.md) | [日本語](README.ja.md)
