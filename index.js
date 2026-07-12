// ==UserScript==
// @name         Supercell 比賽腳本 (Brawl Stars + Clash Royale)
// @namespace    http://tampermonkey.net/
// @version      2.0
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

  // ===== 遊戲偵測 =====
  const currentUrl = window.location.href;
  const GAME = currentUrl.includes('/clashroyale/') ? 'clashroyale' : 'brawlstars';
  // 偵測頁面語言
  const LANG_MATCH = currentUrl.match(/\/(en|zh-tc|zh-cn|ja|ko|fr|de|es|pt|it)\//);
  const PAGE_LANG = LANG_MATCH ? LANG_MATCH[1] : 'en';
  const LOCALE_URL = `https://event.supercell.com/${GAME}/assets/events/cards/zh-tc.json`;
  const LOCALE_URL_PAGE = `https://event.supercell.com/${GAME}/assets/events/cards/${PAGE_LANG}.json`;

  // 「抓住它」按鈕文字（兩個遊戲可能不同）
  const GRAB_TEXTS = {
    brawlstars: '抓住它!',
    clashroyale: '抓住它!'
  };
  const GRAB_TEXT = GRAB_TEXTS[GAME];

  console.log(`==========================start [${GAME}]==========================`);
  console.error = () => { };
  console.clear();

  let quizAnswers = [];
  let matchAnswers = [];
  let localeData = {};
  let localeDataPage = {}; // 頁面語言的 locale（用來匹配按鈕文字）
  let lastFeedChildCount = 0; // 追蹤 feed content 子元素數量

  // ===== 音效提醒 =====
  function playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // 第一個音（高音）
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 880;
      gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.3);

      // 第二個音（更高）
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1100;
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      console.log('音效播放失敗:', e);
    }
  }

  // ===== 監聽 feed content 變化 =====
  function watchFeedContent() {
    const feedContent = document.querySelector('.feed.right.cr .feed-content')
      || document.querySelector('.feed-content')
      || document.querySelector('.feed__content');
    if (!feedContent) return;

    // 初始化計數
    if (lastFeedChildCount === 0) {
      lastFeedChildCount = feedContent.children.length;
    }

    const observer = new MutationObserver((mutations) => {
      const currentCount = feedContent.children.length;
      // 排除我們自己的 ws-panel 和 ws-countdown
      const realChildren = Array.from(feedContent.children).filter(c => c.id !== 'ws-panel' && c.id !== 'ws-countdown');
      const newCount = realChildren.length;
      if (newCount > lastFeedChildCount) {
        // 只有非 post_game_card 的新內容才播音效
        // 檢查最新加入的元素是否是 post_game_card（比賽結果卡）
        const latestChild = realChildren[realChildren.length - 1];
        const isPostGame = latestChild?.classList?.contains('card-post-game') 
          || latestChild?.querySelector?.('.card-post-game')
          || latestChild?.textContent?.includes('RESULT GAME')
          || latestChild?.textContent?.includes('MATCH RESULT');
        if (!isPostGame) {
          playNotificationSound();
        }
        console.log(`[${GAME}] Feed 新增內容! ${lastFeedChildCount} → ${newCount}`);
      }
      lastFeedChildCount = newCount;
    });

    observer.observe(feedContent, { childList: true });
    console.log(`[${GAME}] Feed content 監聽已啟動`);
  }

  // 等 feed 出現後啟動監聽 + 顯示初始 ws-panel
  const feedWatchInterval = setInterval(() => {
    const feedContent = document.querySelector('.feed.right.cr .feed-content')
      || document.querySelector('.feed-content')
      || document.querySelector('.feed__content');
    if (feedContent) {
      clearInterval(feedWatchInterval);
      watchFeedContent();
      // 初始化 ws-panel（等待狀態）
      if (GAME === 'clashroyale') {
        showWaitingPanel(feedContent);
      }
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
      <style>
        #ws-panel .ws-card {
          max-width: 327px;
          width: 100%;
          margin: 8px auto 0;
          border-radius: 2px;
          overflow: hidden;
          font-family: "Supercell Headline", sans-serif;
        }
        #ws-panel .ws-card-bg {
          background-color: rgba(25, 26, 36, 0.92);
          border-radius: 2px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px;
        }
        #ws-panel .ws-waiting {
          color: #aaa;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          text-align: center;
        }
        #ws-panel .ws-waiting-dot {
          animation: ws-blink 1.4s infinite;
        }
        @keyframes ws-blink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      </style>
      <div class="ws-card">
        <div class="ws-card-bg">
          <div class="ws-waiting">⏳ 等待 WebSocket 訊息<span class="ws-waiting-dot">.</span><span class="ws-waiting-dot" style="animation-delay:0.2s">.</span><span class="ws-waiting-dot" style="animation-delay:0.4s">.</span></div>
        </div>
      </div>
    `;
  }

  // ===== 載入 locale 資料 =====
  function fetchLocale() {
    fetch(LOCALE_URL)
      .then(response => response.json())
      .then(data => {
        localeData = data;
        console.log(`[${GAME}] locale (zh-tc) loaded, keys:`, Object.keys(data).length);
      })
      .catch(error => {
        console.log('Error fetching the JSON:', error);
      });
    // 同時載入頁面語言的 locale（用來匹配按鈕上的文字）
    if (LOCALE_URL_PAGE !== LOCALE_URL) {
      fetch(LOCALE_URL_PAGE)
        .then(response => response.json())
        .then(data => {
          localeDataPage = data;
          console.log(`[${GAME}] locale (${PAGE_LANG}) loaded, keys:`, Object.keys(data).length);
        })
        .catch(error => {
          console.log('Error fetching page locale:', error);
        });
    } else {
      localeDataPage = localeData;
    }
  }

  fetchLocale();
  setInterval(fetchLocale, 5000);

  // ===== 抓住它 / Grab (隨機獎勵) =====
  setInterval(() => {
    findAndClickButtonWithText(document.body, GRAB_TEXT);
    // CR 的 Random Loot Drop 按鈕可能是英文 "Grab" 或其他文字
    findAndClickButtonWithText(document.body, "Grab");
    findAndClickButtonWithText(document.body, "GRAB");
    // 也嘗試點擊 card-loot 裡面的按鈕（不管文字是什麼）
    const lootCard = document.querySelector('.card-loot button:not([disabled])');
    if (lootCard) lootCard.click();
  }, 500);

  // ===== 按讚 / Cheer =====
  if (GAME === 'brawlstars') {
    let bsPinSelected = false;
    setInterval(() => {
      // 已選過表情，直接點 cheer 按鈕
      if (bsPinSelected) {
        const cheerBtn = document.querySelector('.cheerButtonContainer__cheerButton');
        if (cheerBtn) cheerBtn.click();
        return;
      }

      // 表情選擇面板開著，隨機選一個
      const pinBtns = document.querySelectorAll('.cheerPinModal__btn-container .cheer-pin-button');
      if (pinBtns.length > 0) {
        const randomIdx = Math.floor(Math.random() * pinBtns.length);
        pinBtns[randomIdx].click();
        bsPinSelected = true;
        return;
      }

      // 面板還沒開，點 switchButton 打開表情選擇
      const switchBtn = document.querySelector('.cheerButtonContainer__switchButton');
      if (switchBtn) switchBtn.click();
    }, 500);
  } else {
    // Clash Royale: 選完表情後 cheer-pin-container 會有 activePin class
    // 裡面的 cheer-pin-button 就是要一直按的按鈕
    setInterval(() => {
      // 優先：已選好表情，直接按 activePin 裡的按鈕
      const activePin = document.querySelector('.cheer-pin-container.activePin .cheer-pin-button');
      if (activePin) {
        activePin.click();
        return;
      }

      // 表情選擇面板已開啟（多個 cheer-pin-button），隨機選一個
      const pinBtns = document.querySelectorAll('.cheer-pin-button');
      if (pinBtns.length > 1) {
        const randomIdx = Math.floor(Math.random() * pinBtns.length);
        pinBtns[randomIdx].click();
        return;
      }

      // 面板未開啟，先點 cheer-btn 開啟
      const cheerBtns = document.querySelectorAll('.cheer-btn');
      if (cheerBtns.length > 0) {
        cheerBtns[cheerBtns.length - 1].click();
      }
    }, 500);
  }

  // ===== 選MVP =====
  setInterval(() => {
    document.querySelectorAll('h3')
      .forEach(h3 => {
        if (h3.textContent.includes('的MVP')) {
          const button = h3.parentElement.querySelector("button");
          if (button) {
            button.click();
          }
        }
      });
  }, 500);

  // ===== 自動投票 prediction（延遲 10 秒，等大家選完再投） =====
  let matchVoteEndTime = 0; // 用 timestamp 計時，不受 WebSocket 影響
  let matchVoteCompleted = false; // 標記是否已投票完成
  let lastMatchTypeId = ''; // 追蹤目前是哪一場的 prediction

  function startMatchVoteCountdown(typeId) {
    // 如果是同一場且已投過，不再倒數
    if (typeId === lastMatchTypeId && matchVoteCompleted) return;
    // 如果是新的一場，重置狀態
    if (typeId !== lastMatchTypeId) {
      lastMatchTypeId = typeId;
      matchVoteCompleted = false;
    }
    // 已在倒數中
    if (matchVoteEndTime > Date.now()) return;

    matchVoteEndTime = Date.now() + 10000;

    const countdownInterval = setInterval(() => {
      const remaining = Math.ceil((matchVoteEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        // 時間到，用最新數據投票
        const latestMatch = matchAnswers[matchAnswers.length - 1];
        if (latestMatch && latestMatch.payload) {
          tryVoteMatchPrediction(latestMatch.payload);
        }
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

    if (remaining <= 0) {
      display.style.display = 'none';
      return;
    }

    display.style.display = 'block';

    // 取得目前最多人選的選項
    const latestMatch = matchAnswers[matchAnswers.length - 1];
    let choiceText = '...';
    if (latestMatch && latestMatch.payload) {
      const answers = latestMatch.payload.answers;
      const alternatives = latestMatch.payload.alternatives;
      if (answers && Object.keys(answers).length > 0) {
        const winnerKey = getHighestPercentageKey(answers);
        const totalVotes = Object.values(answers).reduce((s, v) => s + v, 0) || 1;
        const pct = Math.round((answers[winnerKey] / totalVotes) * 100);
        if (Array.isArray(alternatives)) {
          choiceText = `選項 ${parseInt(winnerKey) + 1} (${pct}%)`;
        } else if (alternatives && alternatives[winnerKey]) {
          const locKey = alternatives[winnerKey].value;
          choiceText = (locKey && localeData[locKey]) ? `${localeData[locKey]} (${pct}%)` : `${winnerKey} (${pct}%)`;
        }
      }
    }

    display.innerHTML = `⏱ ${remaining}s 後將選: <span style="color:#78ff96;">${choiceText}</span>`;
  }

  // ===== 自動投票「誰會贏得這場比賽？」(mp0001) — BS 用 =====
  const MATCH_PREDICT_ID = 'mp0001';
  const MATCH_PREDICT_ENTITY_IDS = {
    brawlstars: '3JqmncWUk3D62zAAsbnhG3',
    clashroyale: '6gfgIlzCrSIWuhEIEMAMry'
  };
  const MATCH_PREDICT_ENTITY_ID = MATCH_PREDICT_ENTITY_IDS[GAME];
  const MATCH_PREDICT_TITLE_KEY = 'mp0001_title';

  function isWhoWillWinPayload(payload) {
    if (!payload) return false;
    const candidates = [
      payload.id,
      payload.predictionId,
      payload.questionId,
      payload.entityId,
      payload.entity_id,
      payload.titleKey,
      payload.title,
    ];
    if (candidates.some(v => v === MATCH_PREDICT_ID || v === MATCH_PREDICT_ENTITY_ID || v === MATCH_PREDICT_TITLE_KEY)) {
      return true;
    }
    try {
      const s = JSON.stringify(payload);
      return s.includes(MATCH_PREDICT_ID) || s.includes(MATCH_PREDICT_ENTITY_ID);
    } catch {
      return false;
    }
  }

  // BS 的 interval fallback（也走延遲邏輯，倒數結束後才投）
  if (GAME === 'brawlstars') {
    setInterval(() => {
      try {
        if (matchAnswers.length === 0) return;
        if (matchVoteCountdown > 0) return; // 還在倒數中，不投

        const latestMatch = matchAnswers[matchAnswers.length - 1];
        const payload = latestMatch && latestMatch.payload;
        if (!payload) return;
        if (!isWhoWillWinPayload(payload)) return;

        const answers = payload.answers;
        if (!answers || Object.keys(answers).length === 0) return;

        const winnerKey = getHighestPercentageKey(answers);
        if (winnerKey == null) return;

        const alternatives = payload.alternatives;
        if (!alternatives || !alternatives[winnerKey]) return;

        const localeKey = alternatives[winnerKey].value;
        const teamText = localeData[localeKey];

        if (teamText) {
          findAndClickButtonWithText(document.body, teamText);
        }
      } catch (error) {
        // 靜默處理
      }
    }, 1000);
  }

  // ===== 自動重連 =====
  setInterval(() => {
    const button = document.querySelector("#__layout > div > div:nth-child(5) > div > div > div > div.baseModal__scroll > div > div > button");
    if (button) {
      // button.click();
    }
  }, 1000);

  // ===== WebSocket 攔截 =====
  const OriginalWebSocket = window.WebSocket;

  function MyWebSocket(url, protocols) {
    const ws = new OriginalWebSocket(url, protocols);

    ws.send = function (data) {
      OriginalWebSocket.prototype.send.call(this, data);
    };

    ws.addEventListener('message', function (event) {
      let jsonData = JSON.parse(event.data);
      console.log(jsonData);

      // 收到任何訊息（含 global_state）就標記已連線
      if (GAME === 'brawlstars') {
        let maybeAnswer = document.querySelector("#maybe-answer");
        if (maybeAnswer && maybeAnswer.querySelector('.ws-waiting-dot')) {
          maybeAnswer.innerHTML = `<div style="color:#2e7d32;font-size:12px;font-weight:900;text-transform:uppercase;text-align:center;">✅ WS 已連線 — 等待互動訊息</div>`;
        }
      }

      if (jsonData[0].messageType != 'global_state') {
        console.log('Received WebSocket message:', JSON.stringify(jsonData, null, 2), JSON.parse(event.data)[0]);

        let localeKey = '';
        let correctAnswer = {};

        if (jsonData[0].payload.correctAnswer?.alternative != null) {
          const altKey = jsonData[0].payload.correctAnswer.alternative;
          localeKey = jsonData[0].payload?.alternatives[altKey].value;
          correctAnswer = {
            [altKey]: `答案是 ${localeData[localeKey]}`
          };

          console.log("localeKey", localeKey);
          try {
            // 用頁面語言的文字匹配按鈕（按鈕上顯示的是頁面語言）
            const pageText = localeDataPage[localeKey] || localeData[localeKey];
            const clicked = findAndClickButtonWithText(document.body, pageText);
            if (!clicked) {
              // fallback: 用 alternative key 提取數字點第 N 個按鈕
              const answerNum = altKey.match(/(\d+)$/);
              if (answerNum) {
                const idx = parseInt(answerNum[1]) - 1;
                const quizBtns = document.querySelectorAll('.buttons-quiz:not([disabled])');
                if (quizBtns[idx]) {
                  quizBtns[idx].click();
                  console.log(`[${GAME}] 點擊第 ${idx + 1} 個 quiz 按鈕`);
                }
              }
            }
          }
          catch {
          }
        }

        // 更新顯示面板
        if (GAME === 'brawlstars') {
          let maybeAnswer = document.querySelector("#maybe-answer");
          if (maybeAnswer) {
            const payload = jsonData[0].payload;
            const msgType = jsonData[0].messageType;
            const answers = payload.answers ?? {};
            const answerEntries = Object.entries(answers);
            const payloadJson = JSON.stringify(payload, null, 2);

            let answersHtml = '';
            if (answerEntries.length > 0) {
              const maybe = getHighestPercentageKey(answers);
              const hasCorrect = Object.keys(correctAnswer).length > 0;
              const titleText = hasCorrect ? '✅ 正確答案已揭曉' : '📊 即時投票';

              answersHtml = `
                <div style="text-align:center;font-size:14px;font-weight:900;text-transform:uppercase;margin-bottom:12px;color:${hasCorrect ? '#2e7d32' : '#e65100'};">${titleText}</div>
              ` + answerEntries.map(([key, val]) => {
                const isCorrect = correctAnswer[key];
                const isMaybe = key === maybe && !hasCorrect;
                const bg = isCorrect ? 'rgba(76,175,80,0.15)' : isMaybe ? 'rgba(255,152,0,0.15)' : 'rgba(0,0,0,0.04)';
                const border = isCorrect ? '#4caf50' : isMaybe ? '#ff9800' : '#ddd';
                const label = isCorrect ? ' ✅' : isMaybe ? ' ⬅ 最多人選' : '';
                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin:4px 0;border-radius:2px;background:${bg};border:2px solid ${border};font-size:13px;font-weight:900;text-transform:uppercase;">
                  <span>${key}</span>
                  <span>${val}%${label}</span>
                </div>`;
              }).join('');
            }

            maybeAnswer.innerHTML = `
              ${answersHtml}
              <pre style="margin:8px 0 0;padding:8px;background:#f5f5f5;border:2px solid #000;font-size:10px;color:#333;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto;">${payloadJson}</pre>
              <div style="text-align:center;margin-top:6px;font-size:10px;color:#666;text-transform:uppercase;font-weight:900;">${msgType}</div>
            `;
          }
        } else {
          updateCRPanel(jsonData[0], correctAnswer);
        }

        // 如果還沒有 correctAnswer，嘗試用最多人選的答案來點（搶先投票）
        if (!jsonData[0].payload.correctAnswer && jsonData[0].messageType === 'quiz') {
          const answers = jsonData[0].payload.answers;
          if (answers && Object.keys(answers).length > 0) {
            const bestKey = getHighestPercentageKey(answers);
            if (bestKey) {
              const altValue = jsonData[0].payload.alternatives?.[bestKey]?.value;
              if (altValue) {
                // 用頁面語言文字匹配
                const pageText = localeDataPage[altValue] || localeData[altValue];
                if (pageText) {
                  const clicked = findAndClickButtonWithText(document.body, pageText);
                  if (!clicked) {
                    // fallback: 用數字 index 點
                    const num = bestKey.match(/(\d+)$/);
                    if (num) {
                      const idx = parseInt(num[1]) - 1;
                      const quizBtns = document.querySelectorAll('.buttons-quiz:not([disabled])');
                      if (quizBtns[idx]) {
                        quizBtns[idx].click();
                        console.log(`[${GAME}] 搶先點擊第 ${idx + 1} 個 quiz 按鈕 (最多人選)`);
                      }
                    }
                  }
                }
              }
            }
          }
        }

        if (jsonData[0].messageType == 'quiz') {
          quizAnswers.push(JSON.parse(event.data)[0]);
        }
        if (jsonData[0].messageType == 'match_prediction') {
          matchAnswers.push(JSON.parse(event.data)[0]);
          // 如果還沒投票（未 completed），啟動 10 秒倒數
          if (!jsonData[0].payload.completed) {
            startMatchVoteCountdown(jsonData[0].payload.typeId || '');
          }
        }
      }
    });

    return ws;
  }

  window.WebSocket = MyWebSocket;

  // ===== 即時投票 match prediction =====
  function tryVoteMatchPrediction(payload) {
    try {
      const answers = payload.answers;
      if (!answers || Object.keys(answers).length === 0) return;

      const winnerKey = getHighestPercentageKey(answers);
      if (winnerKey == null) return;

      const alternatives = payload.alternatives;
      if (!alternatives) return;

      // CR 格式: alternatives 是陣列, answers key 是數字 index ("0", "1")
      // BS 格式: alternatives 是物件, answers key 是 "answer_1" 等
      if (Array.isArray(alternatives)) {
        // CR 模式：直接用 winnerKey 作為 index 點第 N 個 prediction 按鈕
        const idx = parseInt(winnerKey);
        const predBtns = document.querySelectorAll('.card-prediction button:not([disabled])');
        // 取最後一組（最新的投票，每組 2 個按鈕）
        const groupSize = alternatives.length;
        const lastGroupStart = predBtns.length - groupSize;
        if (lastGroupStart >= 0 && predBtns[lastGroupStart + idx]) {
          predBtns[lastGroupStart + idx].click();
          console.log(`[${GAME}] WS 即時投票: index=${idx}, votes=${answers[winnerKey]}`);
        }
      } else {
        // BS 模式：用 locale 文字匹配
        if (!alternatives[winnerKey]) return;
        const localeKey = alternatives[winnerKey].value;
        const teamText = localeData[localeKey];

        if (teamText) {
          const clicked = findAndClickButtonWithText(document.body, teamText);
          if (!clicked) {
            const altKeys = Object.keys(alternatives);
            const idx = altKeys.indexOf(winnerKey);
            if (idx >= 0) {
              const predBtns = document.querySelectorAll('.card-prediction button:not([disabled])');
              const lastGroupStart = predBtns.length - altKeys.length;
              if (lastGroupStart >= 0 && predBtns[lastGroupStart + idx]) {
                predBtns[lastGroupStart + idx].click();
              }
            }
          }
          console.log(`[${GAME}] WS 即時投票: ${teamText}`);
        }
      }
    } catch (e) {
      // 靜默
    }
  }

  // ===== CR 顯示面板 =====
  function updateCRPanel(msg, correctAnswer) {
    let feedContent = document.querySelector('.feed.right.cr .feed-content');
    if (!feedContent) {
      feedContent = document.querySelector('.feed-content') || document.querySelector('.feed__content');
    }
    if (!feedContent) return;

    let panel = document.querySelector('#ws-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ws-panel';
      feedContent.appendChild(panel);
    }
    if (panel.parentElement !== feedContent) {
      feedContent.appendChild(panel);
    }

    const payload = msg.payload;
    const msgType = msg.messageType;
    const answers = payload.answers ?? {};
    const alternatives = payload.alternatives ?? {};
    const totalVotes = Object.values(answers).reduce((s, v) => s + v, 0) || 1;
    const bestKey = getHighestPercentageKey(answers);
    const correctKey = payload.correctAnswer?.alternative;

    // 取得題目文字
    let title = '';
    if (payload.titleKey && localeData[payload.titleKey]) {
      title = localeData[payload.titleKey];
    } else if (payload.question && localeData[payload.question]) {
      title = localeData[payload.question];
    } else if (msgType === 'quiz') {
      title = 'Quiz';
    } else if (msgType === 'match_prediction') {
      title = localeData['mp0001_title'] || 'Match Prediction';
    } else {
      title = msgType;
    }

    // 建構按鈕 HTML
    let buttonsHtml = '';
    const altKeys = Object.keys(alternatives);
    altKeys.forEach((key) => {
      const votes = answers[key] || 0;
      const pct = Math.round((votes / totalVotes) * 100);

      let label = key;
      if (Array.isArray(alternatives)) {
        label = `選項 ${parseInt(key) + 1}`;
      } else {
        const altValue = alternatives[key]?.value;
        label = (altValue && localeData[altValue]) ? localeData[altValue] : key;
      }

      let stateClass = '';
      if (correctKey && key === correctKey) {
        stateClass = 'ws-correct';
      } else if (!correctKey && key === bestKey) {
        stateClass = 'ws-best';
      }

      buttonsHtml += `
        <button class="ws-btn ${stateClass}" type="button" disabled>
          <div class="ws-prog-wrap">
            <div class="ws-prog" style="width:${pct}%;"></div>
          </div>
          <span class="ws-btn-label">${label}</span>
          <span class="ws-btn-pct">${pct}%</span>
        </button>`;
    });

    // 狀態標籤
    let statusHtml = '';
    if (correctKey) {
      let correctText = correctKey;
      if (Array.isArray(alternatives)) {
        correctText = `選項 ${parseInt(correctKey) + 1}`;
      } else if (alternatives[correctKey]?.value && localeData[alternatives[correctKey].value]) {
        correctText = localeData[alternatives[correctKey].value];
      }
      statusHtml = `<div class="ws-status ws-status-correct">✓ 正確答案: ${correctText}</div>`;
    } else if (bestKey) {
      statusHtml = `<div class="ws-status ws-status-best">⏳ 最多人選: ${bestKey} (${Math.round((answers[bestKey] / totalVotes) * 100)}%)</div>`;
    }

    const payloadJson = JSON.stringify(payload, null, 2);

    panel.innerHTML = `
      <style>
        #ws-panel .ws-card {
          max-width: 327px;
          width: 100%;
          margin: 8px auto 0;
          border-radius: 2px;
          overflow: hidden;
          font-family: "Supercell Headline", sans-serif;
        }
        #ws-panel .ws-card-bg {
          background-color: rgba(25, 26, 36, 0.92);
          border-radius: 2px;
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        #ws-panel .ws-scorebar {
          background-color: rgb(0, 0, 0);
          color: rgb(255, 255, 255);
          display: flex;
          flex-direction: row;
          height: 24px;
          justify-content: center;
          align-items: center;
          width: 100%;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          gap: 8px;
        }
        #ws-panel .ws-scorebar-type {
          background: #4e6ded;
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 10px;
        }
        #ws-panel .ws-content {
          padding: 24px 16px;
        }
        #ws-panel .ws-btn-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          margin: -8px 0 0 -8px;
          padding-bottom: 16px;
        }
        #ws-panel .ws-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: rgb(255, 255, 255);
          color: rgb(0, 0, 0);
          border: none;
          border-radius: 2px;
          height: 48px;
          padding: 0 24px;
          margin: 8px 0 0 8px;
          width: calc(50% - 8px);
          font-family: "Supercell Headline", sans-serif;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          overflow: hidden;
          cursor: default;
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.5));
        }
        #ws-panel .ws-btn.ws-correct {
          background: #78ff96;
        }
        #ws-panel .ws-btn.ws-best {
          background: #ffd700;
        }
        #ws-panel .ws-prog-wrap {
          position: absolute;
          left: 0; top: 0; bottom: 0; right: 0;
          overflow: hidden;
          border-radius: inherit;
        }
        #ws-panel .ws-prog {
          position: absolute;
          left: -6px;
          top: 0;
          height: 100%;
          width: 0;
          transform: skew(-10deg);
        }
        #ws-panel .ws-prog::after {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background-color: rgb(0, 0, 0);
          opacity: 0.2;
        }
        #ws-panel .ws-btn.ws-correct .ws-prog::after {
          background-color: #006600;
          opacity: 0.15;
        }
        #ws-panel .ws-btn.ws-best .ws-prog::after {
          background-color: #665500;
          opacity: 0.15;
        }
        #ws-panel .ws-btn-label {
          position: relative;
          z-index: 1;
          font-size: 12px;
          line-height: 1;
        }
        #ws-panel .ws-btn-pct {
          position: absolute;
          top: 4px; right: 6px;
          font-family: "Supercell Text", sans-serif;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          z-index: 1;
          opacity: 0.8;
        }
        #ws-panel .ws-title {
          font-family: "Supercell Headline", sans-serif;
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          color: #fff;
          text-align: center;
          line-height: 1.1;
          padding: 0 8px;
        }
        #ws-panel .ws-status {
          text-align: center;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          margin-top: 8px;
          padding: 4px 8px;
          border-radius: 2px;
        }
        #ws-panel .ws-status-correct {
          background: rgba(120, 255, 150, 0.2);
          color: #78ff96;
        }
        #ws-panel .ws-status-best {
          background: rgba(255, 215, 0, 0.2);
          color: #ffd700;
        }
        #ws-panel .ws-payload {
          margin: 8px 16px 0;
          padding: 8px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 2px;
          font-family: "Supercell Text", sans-serif;
          font-size: 10px;
          color: #ccc;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 150px;
          overflow-y: auto;
        }
        #ws-panel .ws-copy-btn {
          display: block;
          margin: 6px 16px 16px;
          padding: 6px 12px;
          background: #4e6ded;
          color: #fff;
          border: none;
          border-radius: 2px;
          font-family: "Supercell Headline", sans-serif;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          cursor: pointer;
          filter: drop-shadow(0 0 4px rgba(78,110,237,0.5));
        }
        #ws-panel .ws-copy-btn:hover {
          background: #6b85f0;
        }
      </style>
      <div class="ws-card">
        <div class="ws-card-bg">
          <div class="ws-scorebar">
            <span class="ws-scorebar-type">${msgType}</span>
            <span>WS LIVE</span>
          </div>
          <div class="ws-content">
            <div class="ws-btn-grid">
              ${buttonsHtml}
            </div>
            <div class="ws-title">${title}</div>
            ${statusHtml}
          </div>
          <pre class="ws-payload">${payloadJson}</pre>
          <button class="ws-copy-btn" id="ws-copy-btn">📋 COPY JSON</button>
        </div>
      </div>
    `;

    // 綁定 copy 按鈕
    const copyBtn = panel.querySelector('#ws-copy-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(payloadJson).then(() => {
          copyBtn.textContent = '✓ COPIED!';
          setTimeout(() => { copyBtn.textContent = '📋 COPY JSON'; }, 1500);
        });
      };
    }

    feedContent.scrollTop = feedContent.scrollHeight;
  }

  // ===== 工具函式 =====
  function getHighestPercentageKey(answers) {
    const totalSum = Object.values(answers).reduce((sum, value) => sum + value, 0);
    let maxPercentage = 0;
    let maxKey = null;

    for (const [key, value] of Object.entries(answers)) {
      const percentage = (value / totalSum) * 100;
      if (percentage > maxPercentage) {
        maxPercentage = percentage;
        maxKey = key;
      }
    }

    return maxKey;
  }

  // ===== 插入顯示面板 =====
  const checkInterval = 100;
  const intervalId = setInterval(() => {
    const element = document.querySelector('.feed__content');
    if (element) {
      clearInterval(intervalId);
      console.log('元素已找到:', element);
      const feedContent = document.querySelector('.feed__content');
      feedContent.style.overflow = 'visible';

      const newDiv = document.createElement('div');
      newDiv.id = 'maybe-answer';
      newDiv.style.cssText = `
        width: 100%;
        margin: 0 0 8px;
        border: 2px solid #000;
        overflow: hidden;
        font-family: "Supercell Headline", sans-serif;
        background-color: #fff;
        padding: 16px;
        color: #000;
      `;
      newDiv.innerHTML = `
        <style>
          #maybe-answer .ws-waiting-dot { animation: ws-blink 1.4s infinite; }
          @keyframes ws-blink { 0%, 80%, 100% { opacity: 0; } 40% { opacity: 1; } }
        </style>
        <div style="color:#666;font-size:12px;font-weight:900;text-transform:uppercase;text-align:center;">⏳ 等待 WebSocket 訊息<span class="ws-waiting-dot">.</span><span class="ws-waiting-dot" style="animation-delay:0.2s">.</span><span class="ws-waiting-dot" style="animation-delay:0.4s">.</span></div>
      `;

      feedContent.prepend(newDiv);
    }
  }, checkInterval);

  // ===== DOM 搜尋並點擊按鈕 =====
  function findAndClickButtonWithText(root, text) {
    try {
      if (!root) return false;

      if ((root.tagName === 'BUTTON' || root.className.includes('RectangleButton')) && root.textContent.trim() === text.trim()) {
        root.click();
        return true;
      }

      for (let child of root.children) {
        if (findAndClickButtonWithText(child, text)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('An error occurred:', error);
      return false;
    }
  }

})();
