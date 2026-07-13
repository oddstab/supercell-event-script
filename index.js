// ==UserScript==
// @name         Supercell 比賽腳本 (Brawl Stars + Clash Royale)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  自動按讚, 自動選MVP, 自動選答案 — 支援荒野亂鬥 & 皇室戰爭
// @author       You
// @match        https://event.supercell.com/brawlstars/*
// @match        https://event.supercell.com/clashroyale/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=supercell.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ===== 設定 =====
  const currentUrl = window.location.href;
  const GAME = currentUrl.includes('/clashroyale/') ? 'clashroyale' : 'brawlstars';
  const LANG_MATCH = currentUrl.match(/\/(en|zh-tc|zh-cn|ja|ko|fr|de|es|pt|it)\//);
  const PAGE_LANG = LANG_MATCH ? LANG_MATCH[1] : 'en';
  const LOCALE_URL = `https://event.supercell.com/${GAME}/assets/events/cards/zh-tc.json`;
  const LOCALE_URL_PAGE = `https://event.supercell.com/${GAME}/assets/events/cards/${PAGE_LANG}.json`;
  const GRAB_TEXT = '抓住它!';

  console.log(`==========================start [${GAME}]==========================`);
  console.error = () => {};
  console.clear();

  let quizAnswers = [];
  let matchAnswers = [];
  let localeData = {};
  let localeDataPage = {};
  let lastFeedChildCount = 0;

  // ===== CR Panel 全域樣式（只注入一次）=====
  (function injectWSPanelStyles() {
    const style = document.createElement('style');
    style.id = 'ws-panel-styles';
    style.textContent = `
      #ws-panel .ws-card { max-width:327px;width:100%;margin:8px auto 0;border-radius:2px;overflow:hidden;font-family:"Supercell Headline",sans-serif; }
      #ws-panel .ws-card-bg { background-color:rgba(25,26,36,0.92);border-radius:2px;width:100%;display:flex;flex-direction:column; }
      #ws-panel .ws-scorebar { background:#000;color:#fff;display:flex;height:24px;justify-content:center;align-items:center;width:100%;font-size:11px;font-weight:900;text-transform:uppercase;gap:8px; }
      #ws-panel .ws-scorebar-type { background:#4e6ded;padding:2px 8px;border-radius:2px;font-size:10px; }
      #ws-panel .ws-content { padding:24px 16px; }
      #ws-panel .ws-btn-grid { display:flex;flex-wrap:wrap;justify-content:center;margin:-8px 0 0 -8px;padding-bottom:16px; }
      #ws-panel .ws-btn { display:flex;align-items:center;justify-content:center;position:relative;background:#fff;color:#000;border:none;border-radius:2px;height:48px;padding:0 24px;margin:8px 0 0 8px;width:calc(50% - 8px);font-family:"Supercell Headline",sans-serif;font-size:13px;font-weight:900;text-transform:uppercase;overflow:hidden;cursor:default;filter:drop-shadow(0 0 8px rgba(255,255,255,0.5)); }
      #ws-panel .ws-btn.ws-correct { background:#78ff96; }
      #ws-panel .ws-btn.ws-best { background:#ffd700; }
      #ws-panel .ws-prog-wrap { position:absolute;left:0;top:0;bottom:0;right:0;overflow:hidden;border-radius:inherit; }
      #ws-panel .ws-prog { position:absolute;left:-6px;top:0;height:100%;width:0;transform:skew(-10deg); }
      #ws-panel .ws-prog::after { content:"";position:absolute;top:0;left:0;width:100%;height:100%;background:#000;opacity:0.2; }
      #ws-panel .ws-btn.ws-correct .ws-prog::after { background:#006600;opacity:0.15; }
      #ws-panel .ws-btn.ws-best .ws-prog::after { background:#665500;opacity:0.15; }
      #ws-panel .ws-btn-label { position:relative;z-index:1;font-size:12px;line-height:1; }
      #ws-panel .ws-btn-pct { position:absolute;top:4px;right:6px;font-family:"Supercell Text",sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;z-index:1;opacity:0.8; }
      #ws-panel .ws-title { font-family:"Supercell Headline",sans-serif;font-size:18px;font-weight:900;text-transform:uppercase;color:#fff;text-align:center;line-height:1.1;padding:0 8px; }
      #ws-panel .ws-status { text-align:center;font-size:11px;font-weight:900;text-transform:uppercase;margin-top:8px;padding:4px 8px;border-radius:2px; }
      #ws-panel .ws-status-correct { background:rgba(120,255,150,0.2);color:#78ff96; }
      #ws-panel .ws-status-best { background:rgba(255,215,0,0.2);color:#ffd700; }
      #ws-panel .ws-payload { margin:8px 16px 0;padding:8px;background:rgba(0,0,0,0.4);border-radius:2px;font-family:"Supercell Text",sans-serif;font-size:10px;color:#ccc;white-space:pre-wrap;word-break:break-all;max-height:150px;overflow-y:auto; }
      #ws-panel .ws-copy-btn { display:block;margin:6px 16px 16px;padding:6px 12px;background:#4e6ded;color:#fff;border:none;border-radius:2px;font-family:"Supercell Headline",sans-serif;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;filter:drop-shadow(0 0 4px rgba(78,110,237,0.5)); }
      #ws-panel .ws-copy-btn:hover { background:#6b85f0; }
      #ws-panel .ws-waiting { color:#aaa;font-size:12px;font-weight:900;text-transform:uppercase;text-align:center; }
      #ws-panel .ws-waiting-dot { animation:ws-blink 1.4s infinite; }
      @keyframes ws-blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }
    `;
    const inject = () => {
      if (document.head) document.head.appendChild(style);
      else requestAnimationFrame(inject);
    };
    inject();
  })();

  // ===== 音效提醒 =====
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0, 0.3], [1100, 0.15, 0.45]].forEach(([freq, start, end]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + end);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + end);
      });
    } catch (e) {}
  }

  // ===== 監聽 feed content 變化 =====
  function watchFeedContent() {
    const feedContent = document.querySelector('.feed.right.cr .feed-content')
      || document.querySelector('.feed-content')
      || document.querySelector('.feed__content');
    if (!feedContent) return;

    if (lastFeedChildCount === 0) lastFeedChildCount = feedContent.children.length;

    const observer = new MutationObserver(() => {
      const realChildren = Array.from(feedContent.children).filter(c => c.id !== 'ws-panel' && c.id !== 'ws-countdown');
      const newCount = realChildren.length;
      if (newCount > lastFeedChildCount) {
        const latest = realChildren[realChildren.length - 1];
        const isPostGame = latest?.classList?.contains('card-post-game')
          || latest?.querySelector?.('.card-post-game')
          || latest?.textContent?.includes('RESULT GAME')
          || latest?.textContent?.includes('MATCH RESULT');
        if (!isPostGame) playNotificationSound();
      }
      lastFeedChildCount = newCount;
    });
    observer.observe(feedContent, { childList: true });
  }

  // 等 feed 出現後啟動
  const feedWatchInterval = setInterval(() => {
    const feedContent = document.querySelector('.feed.right.cr .feed-content')
      || document.querySelector('.feed-content')
      || document.querySelector('.feed__content');
    if (feedContent) {
      clearInterval(feedWatchInterval);
      watchFeedContent();
      if (GAME === 'clashroyale') showWaitingPanel(feedContent);
    }
  }, 500);

  function showWaitingPanel(feedContent) {
    let panel = document.querySelector('#ws-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ws-panel';
      feedContent.appendChild(panel);
    }
    panel.innerHTML = `
      <div class="ws-card">
        <div class="ws-card-bg" style="align-items:center;padding:24px 16px;">
          <div class="ws-waiting">⏳ 等待 WebSocket 訊息<span class="ws-waiting-dot">.</span><span class="ws-waiting-dot" style="animation-delay:0.2s">.</span><span class="ws-waiting-dot" style="animation-delay:0.4s">.</span></div>
        </div>
      </div>
    `;
  }

  // ===== 載入 locale 資料 =====
  async function fetchLocale() {
    try {
      localeData = await (await fetch(LOCALE_URL)).json();
    } catch (e) {}
    if (LOCALE_URL_PAGE !== LOCALE_URL) {
      try {
        localeDataPage = await (await fetch(LOCALE_URL_PAGE)).json();
      } catch (e) {}
    } else {
      localeDataPage = localeData;
    }
  }
  fetchLocale();
  setInterval(fetchLocale, 5000);

  // ===== 抓住它 / Grab =====
  setInterval(() => {
    for (const text of [GRAB_TEXT, "Grab", "GRAB", "Push!"]) {
      findAndClickButtonWithText(document.body, text);
    }
    (document.querySelector('.lootDropCard__buttonContainer__button:not([disabled])')
      || document.querySelector('.card-loot button:not([disabled])'))?.click();
  }, 500);

  // ===== 按讚 / Cheer =====
  if (GAME === 'brawlstars') {
    let bsPinSelected = false;
    setInterval(() => {
      if (bsPinSelected) {
        document.querySelector('.cheerButtonContainer__cheerButton')?.click();
        return;
      }
      const pinBtns = document.querySelectorAll('.cheerPinModal__btn-container .cheer-pin-button');
      if (pinBtns.length) {
        pinBtns[Math.floor(Math.random() * pinBtns.length)].click();
        bsPinSelected = true;
      } else {
        document.querySelector('.cheerButtonContainer__switchButton')?.click();
      }
    }, 500);
  } else {
    setInterval(() => {
      const activePin = document.querySelector('.cheer-pin-container.activePin .cheer-pin-button');
      if (activePin) { activePin.click(); return; }
      const pinBtns = document.querySelectorAll('.cheer-pin-button');
      if (pinBtns.length > 1) {
        pinBtns[Math.floor(Math.random() * pinBtns.length)].click();
      } else {
        const cheerBtns = document.querySelectorAll('.cheer-btn');
        if (cheerBtns.length) cheerBtns[cheerBtns.length - 1].click();
      }
    }, 500);
  }

  // ===== 選MVP =====
  setInterval(() => {
    document.querySelectorAll('h3').forEach(h3 => {
      if (h3.textContent.includes('的MVP')) {
        h3.parentElement.querySelector('button')?.click();
      }
    });
  }, 500);

  // ===== 自動投票 prediction（延遲 10 秒）=====
  let matchVoteEndTime = 0;
  let matchVoteCompleted = false;
  let lastMatchTypeId = '';

  function startMatchVoteCountdown(typeId) {
    if (typeId === lastMatchTypeId && matchVoteCompleted) return;
    if (typeId !== lastMatchTypeId) {
      lastMatchTypeId = typeId;
      matchVoteCompleted = false;
    }
    if (matchVoteEndTime > Date.now()) return;

    matchVoteEndTime = Date.now() + 10000;
    const countdownInterval = setInterval(() => {
      const remaining = Math.ceil((matchVoteEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        const latestMatch = matchAnswers[matchAnswers.length - 1];
        if (latestMatch?.payload) tryVoteMatchPrediction(latestMatch.payload);
        matchVoteCompleted = true;
        updateMatchCountdownDisplay(0);
      } else {
        updateMatchCountdownDisplay(remaining);
      }
    }, 500);
  }

  function updateMatchCountdownDisplay(remaining) {
    let display = document.querySelector('#ws-countdown');
    if (!display) {
      const feedContent = document.querySelector('.feed.right.cr .feed-content')
        || document.querySelector('.feed-content')
        || document.querySelector('.feed__content');
      if (!feedContent) return;
      display = document.createElement('div');
      display.id = 'ws-countdown';
      display.style.cssText = 'max-width:327px;width:100%;margin:8px auto 0;padding:10px 16px;background:rgba(0,0,0,0.7);border-radius:2px;font-family:"Supercell Headline",sans-serif;font-size:11px;font-weight:900;color:#ffd700;text-align:center;text-transform:uppercase;';
      feedContent.appendChild(display);
    }
    if (remaining <= 0) { display.style.display = 'none'; return; }
    display.style.display = 'block';

    const latestMatch = matchAnswers[matchAnswers.length - 1];
    let choiceText = '...';
    if (latestMatch?.payload) {
      const { answers, alternatives } = latestMatch.payload;
      if (answers && Object.keys(answers).length) {
        const winnerKey = getHighestPercentageKey(answers);
        const totalVotes = Object.values(answers).reduce((s, v) => s + v, 0) || 1;
        const pct = Math.round((answers[winnerKey] / totalVotes) * 100);
        if (Array.isArray(alternatives)) {
          choiceText = `選項 ${parseInt(winnerKey) + 1} (${pct}%)`;
        } else if (alternatives?.[winnerKey]) {
          const locKey = alternatives[winnerKey].value;
          choiceText = (locKey && localeData[locKey]) ? `${localeData[locKey]} (${pct}%)` : `${winnerKey} (${pct}%)`;
        }
      }
    }
    display.innerHTML = `⏱ ${remaining}s 後將選: <span style="color:#78ff96;">${choiceText}</span>`;
  }

  // ===== WebSocket 攔截 =====
  const OriginalWebSocket = window.WebSocket;

  function clickQuizByKey(altKey, alternatives) {
    const localeKey = alternatives?.[altKey]?.value;
    if (!localeKey) return false;
    const pageText = localeDataPage[localeKey] || localeData[localeKey];
    if (pageText && findAndClickButtonWithText(document.body, pageText)) return true;
    const num = altKey.match(/(\d+)$/);
    if (!num) return false;
    const idx = parseInt(num[1]) - 1;
    const btn = document.querySelectorAll('.buttons-quiz:not([disabled])')[idx];
    if (!btn) return false;
    btn.click();
    return true;
  }

  function MyWebSocket(url, protocols) {
    const ws = new OriginalWebSocket(url, protocols);
    ws.send = function (data) { OriginalWebSocket.prototype.send.call(this, data); };

    ws.addEventListener('message', function (event) {
      const jsonData = JSON.parse(event.data);
      const msg = jsonData[0];

      // 連線指示
      if (GAME === 'brawlstars') {
        const panel = document.querySelector("#maybe-answer");
        if (panel?.querySelector('.ws-waiting-dot')) {
          panel.innerHTML = `<div style="color:#2e7d32;font-size:12px;font-weight:900;text-transform:uppercase;text-align:center;">✅ WS 已連線 — 等待互動訊息</div>`;
        }
      }

      if (msg.messageType === 'global_state') return;

      let correctAnswer = {};
      const altKey = msg.payload.correctAnswer?.alternative;
      if (altKey != null) {
        const localeKey = msg.payload.alternatives[altKey].value;
        correctAnswer = { [altKey]: `答案是 ${localeData[localeKey]}` };
        clickQuizByKey(altKey, msg.payload.alternatives);
      }

      // 更新顯示面板
      if (GAME === 'brawlstars') {
        const maybeAnswer = document.querySelector("#maybe-answer");
        if (maybeAnswer) {
          const { payload } = msg;
          const answers = payload.answers ?? {};
          const answerEntries = Object.entries(answers);
          const payloadJson = JSON.stringify(payload, null, 2);

          let answersHtml = '';
          if (answerEntries.length > 0) {
            const totalVotes = Object.values(answers).reduce((s, v) => s + v, 0) || 1;
            const maybe = getHighestPercentageKey(answers);
            const hasCorrect = Object.keys(correctAnswer).length > 0;
            const titleText = hasCorrect ? '✅ 正確答案已揭曉' : '📊 即時投票';

            answersHtml = `<div style="text-align:center;font-size:14px;font-weight:900;text-transform:uppercase;margin-bottom:12px;color:${hasCorrect ? '#2e7d32' : '#e65100'};">${titleText}</div>`
              + answerEntries.map(([key, val]) => {
                const pct = Math.round((val / totalVotes) * 100);
                const isCorrect = correctAnswer[key];
                const isMaybe = key === maybe && !hasCorrect;
                const bg = isCorrect ? 'rgba(76,175,80,0.15)' : isMaybe ? 'rgba(255,152,0,0.15)' : 'rgba(0,0,0,0.04)';
                const border = isCorrect ? '#4caf50' : isMaybe ? '#ff9800' : '#ddd';
                const label = isCorrect ? ' ✅' : isMaybe ? ' ⬅ 最多人選' : '';
                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin:4px 0;border-radius:2px;background:${bg};border:2px solid ${border};font-size:13px;font-weight:900;text-transform:uppercase;">
                  <span>${key}</span><span>${pct}%${label}</span>
                </div>`;
              }).join('');
          }

          maybeAnswer.innerHTML = `
            ${answersHtml}
            <pre style="margin:8px 0 0;padding:8px;background:#f5f5f5;border:2px solid #000;font-size:10px;color:#333;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto;">${payloadJson}</pre>
            <div style="text-align:center;margin-top:6px;font-size:10px;color:#666;text-transform:uppercase;font-weight:900;">${msg.messageType}</div>
          `;
        }
      } else {
        updateCRPanel(msg, correctAnswer);
      }

      // 搶先投票
      if (!msg.payload.correctAnswer && msg.messageType === 'quiz') {
        const answers = msg.payload.answers;
        if (answers && Object.keys(answers).length) {
          clickQuizByKey(getHighestPercentageKey(answers), msg.payload.alternatives);
        }
      }

      if (msg.messageType === 'quiz') quizAnswers.push(msg);
      if (msg.messageType === 'match_prediction') {
        matchAnswers.push(msg);
        if (!msg.payload.completed) startMatchVoteCountdown(msg.payload.typeId || '');
      }
    });

    return ws;
  }
  window.WebSocket = MyWebSocket;

  // ===== 即時投票 match prediction =====
  function tryVoteMatchPrediction(payload) {
    const answers = payload.answers;
    if (!answers || Object.keys(answers).length === 0) return;
    const winnerKey = getHighestPercentageKey(answers);
    if (winnerKey == null) return;
    const alternatives = payload.alternatives;
    if (!alternatives) return;

    if (Array.isArray(alternatives)) {
      const idx = parseInt(winnerKey);
      const predBtns = document.querySelectorAll('.card-prediction button:not([disabled])');
      const start = predBtns.length - alternatives.length;
      if (start >= 0 && predBtns[start + idx]) predBtns[start + idx].click();
      return;
    }

    if (!alternatives[winnerKey]) return;
    const localeKey = alternatives[winnerKey].value;
    const teamText = localeData[localeKey];

    let clicked = teamText ? findAndClickButtonWithText(document.body, teamText) : false;
    if (!clicked) {
      const altKeys = Object.keys(alternatives);
      const idx = altKeys.indexOf(winnerKey);
      if (idx >= 0) {
        const predBtn = document.querySelector(`.predictionButton--interactable[data-index="${idx}"]`);
        if (predBtn) { predBtn.click(); clicked = true; }
        else {
          const predBtns = document.querySelectorAll('.card-prediction button:not([disabled])');
          const start = predBtns.length - altKeys.length;
          if (start >= 0 && predBtns[start + idx]) { predBtns[start + idx].click(); clicked = true; }
        }
      }
    }
  }

  // ===== CR 顯示面板 =====
  function updateCRPanel(msg, correctAnswer) {
    let feedContent = document.querySelector('.feed.right.cr .feed-content')
      || document.querySelector('.feed-content')
      || document.querySelector('.feed__content');
    if (!feedContent) return;

    let panel = document.querySelector('#ws-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ws-panel';
      feedContent.appendChild(panel);
    }
    if (panel.parentElement !== feedContent) feedContent.appendChild(panel);

    const { payload } = msg;
    const msgType = msg.messageType;
    const answers = payload.answers ?? {};
    const alternatives = payload.alternatives ?? {};
    const totalVotes = Object.values(answers).reduce((s, v) => s + v, 0) || 1;
    const bestKey = getHighestPercentageKey(answers);
    const correctKey = payload.correctAnswer?.alternative;

    const title = (payload.titleKey && localeData[payload.titleKey])
      ? localeData[payload.titleKey]
      : (payload.question && localeData[payload.question])
        ? localeData[payload.question]
        : msgType === 'quiz' ? 'Quiz'
          : msgType === 'match_prediction' ? (localeData['mp0001_title'] || 'Match Prediction')
            : msgType;

    const buttonsHtml = Object.keys(alternatives).map(key => {
      const pct = Math.round(((answers[key] || 0) / totalVotes) * 100);
      const label = Array.isArray(alternatives)
        ? `選項 ${parseInt(key) + 1}`
        : (alternatives[key]?.value && localeData[alternatives[key].value]) || key;
      const stateClass = (correctKey && key === correctKey) ? 'ws-correct'
        : (!correctKey && key === bestKey) ? 'ws-best' : '';
      return `<button class="ws-btn ${stateClass}" type="button" disabled>
        <div class="ws-prog-wrap"><div class="ws-prog" style="width:${pct}%;"></div></div>
        <span class="ws-btn-label">${label}</span>
        <span class="ws-btn-pct">${pct}%</span>
      </button>`;
    }).join('');

    let statusHtml = '';
    if (correctKey) {
      const correctText = Array.isArray(alternatives)
        ? `選項 ${parseInt(correctKey) + 1}`
        : (alternatives[correctKey]?.value && localeData[alternatives[correctKey].value]) || correctKey;
      statusHtml = `<div class="ws-status ws-status-correct">✓ 正確答案: ${correctText}</div>`;
    } else if (bestKey) {
      statusHtml = `<div class="ws-status ws-status-best">⏳ 最多人選: ${bestKey} (${Math.round((answers[bestKey] / totalVotes) * 100)}%)</div>`;
    }

    const payloadJson = JSON.stringify(payload, null, 2);
    panel.innerHTML = `
      <div class="ws-card"><div class="ws-card-bg">
        <div class="ws-scorebar">
          <span class="ws-scorebar-type">${msgType}</span><span>WS LIVE</span>
        </div>
        <div class="ws-content">
          <div class="ws-btn-grid">${buttonsHtml}</div>
          <div class="ws-title">${title}</div>
          ${statusHtml}
        </div>
        <pre class="ws-payload">${payloadJson}</pre>
        <button class="ws-copy-btn" id="ws-copy-btn">📋 COPY JSON</button>
      </div></div>
    `;

    panel.querySelector('#ws-copy-btn')?.addEventListener('click', function () {
      navigator.clipboard.writeText(payloadJson).then(() => {
        this.textContent = '✓ COPIED!';
        setTimeout(() => { this.textContent = '📋 COPY JSON'; }, 1500);
      });
    });

    feedContent.scrollTop = feedContent.scrollHeight;
  }

  // ===== 工具函式 =====
  function getHighestPercentageKey(answers) {
    // ponytail: 分母相同，最大 value 就是最高百分比
    return Object.entries(answers).reduce((best, [k, v]) =>
      v > (best[1] ?? -1) ? [k, v] : best, [null, -1]
    )[0];
  }

  function findAndClickButtonWithText(root, text) {
    if (!root) return false;
    const trimmed = text.trim();
    // ponytail: querySelectorAll 比遞迴走 DOM 快，升級路線是 TreeWalker
    for (const btn of root.querySelectorAll('button, [class*="RectangleButton"]')) {
      if (btn.textContent.trim() === trimmed) { btn.click(); return true; }
    }
    return false;
  }

  // ===== 插入 BS 顯示面板 =====
  const panelInitInterval = setInterval(() => {
    const feedContent = document.querySelector('.feed__content');
    if (!feedContent) return;
    clearInterval(panelInitInterval);

    feedContent.style.overflow = '';
    feedContent.style.height = 'auto';

    const div = document.createElement('div');
    div.id = 'maybe-answer';
    div.style.cssText = 'width:100%;margin:8px 0 0;border:2px solid #000;font-family:"Supercell Headline",sans-serif;background:#fff;padding:16px;color:#000;';
    div.innerHTML = `
      <style>
        #maybe-answer .ws-waiting-dot { animation: ws-blink 1.4s infinite; }
        @keyframes ws-blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }
      </style>
      <div style="color:#666;font-size:12px;font-weight:900;text-transform:uppercase;text-align:center;">⏳ 等待 WebSocket 訊息<span class="ws-waiting-dot">.</span><span class="ws-waiting-dot" style="animation-delay:0.2s">.</span><span class="ws-waiting-dot" style="animation-delay:0.4s">.</span></div>
    `;
    feedContent.appendChild(div);
  }, 100);
})();
