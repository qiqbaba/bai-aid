// ==UserScript==
// @name         BAI Token 用量多维度聚合统计
// @namespace    https://chat.b.ai/
// @version      1.1.0
// @description  自动抓取并统计 chat.b.ai 的今天、本周、最近24小时、最近7天中各模型 Token 用量（输入/输出/合计/调用次数），支持本地持久化存储、智能增量同步、图表可视化与数据导出。
// @author       Antigravity
// @match        https://chat.b.ai/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // --- CSS Styles ---
  const STYLES = `
    #bai-stat-trigger-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      background: linear-gradient(135deg, #1677ff, #0050b3);
      color: #fff;
      border: none;
      border-radius: 50px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(22, 119, 255, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    #bai-stat-trigger-btn:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 6px 20px rgba(22, 119, 255, 0.55);
      background: linear-gradient(135deg, #4096ff, #1677ff);
    }
    #bai-stat-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(6px);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    #bai-stat-modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    #bai-stat-modal {
      width: 920px;
      max-width: 94vw;
      max-height: 90vh;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    #bai-stat-modal-overlay.active #bai-stat-modal {
      transform: scale(1);
    }
    .bai-stat-header {
      padding: 18px 24px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bai-stat-title {
      font-size: 17px;
      font-weight: 700;
      color: #1f1f1f;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bai-stat-badge {
      font-size: 12px;
      font-weight: 500;
      background: #e6f4ff;
      color: #0958d9;
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid #91caff;
    }
    .bai-stat-badge.badge-cached {
      background: #f6ffed;
      color: #389e0d;
      border-color: #b7eb8f;
    }
    .bai-stat-close-btn {
      background: none;
      border: none;
      font-size: 20px;
      color: #8c8c8c;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .bai-stat-close-btn:hover {
      background: #f0f0f0;
      color: #262626;
    }
    .bai-stat-tabs {
      display: flex;
      gap: 8px;
      padding: 12px 24px;
      background: #fff;
      border-bottom: 1px solid #f0f0f0;
    }
    .bai-stat-tab-btn {
      background: #f5f5f5;
      border: 1px solid transparent;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #595959;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .bai-stat-tab-btn:hover {
      background: #e6f4ff;
      color: #1677ff;
    }
    .bai-stat-tab-btn.active {
      background: #1677ff;
      color: #fff;
      border-color: #1677ff;
      box-shadow: 0 2px 8px rgba(22, 119, 255, 0.3);
    }
    .bai-stat-body {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .bai-stat-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .bai-stat-card {
      background: #fcfcfc;
      border: 1px solid #f0f0f0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
      overflow: hidden;
    }
    .bai-stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: #1677ff;
    }
    .bai-stat-card.card-prompt::before { background: #52c41a; }
    .bai-stat-card.card-completion::before { background: #fa8c16; }
    .bai-stat-card.card-calls::before { background: #722ed1; }

    .bai-stat-card-label {
      font-size: 12px;
      color: #8c8c8c;
      font-weight: 500;
    }
    .bai-stat-card-val {
      font-size: 20px;
      font-weight: 700;
      color: #262626;
      font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .bai-stat-card-sub {
      font-size: 11px;
      color: #bfbfbf;
    }
    .bai-stat-table-wrapper {
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .bai-stat-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .bai-stat-table th {
      background: #fafafa;
      padding: 12px 14px;
      color: #595959;
      font-weight: 600;
      border-bottom: 1px solid #f0f0f0;
    }
    .bai-stat-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #fafafa;
      color: #262626;
    }
    .bai-stat-table tr:last-child td {
      border-bottom: none;
    }
    .bai-stat-table tr:hover td {
      background: #fafafa;
    }
    .bai-stat-progress-bg {
      width: 100%;
      height: 6px;
      background: #f0f0f0;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }
    .bai-stat-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #1677ff, #69b1ff);
      border-radius: 3px;
    }
    .bai-stat-footer {
      padding: 14px 24px;
      background: #fafafa;
      border-top: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .bai-stat-meta-text {
      font-size: 12px;
      color: #8c8c8c;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .bai-stat-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .bai-stat-btn {
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
    }
    .bai-stat-btn-secondary {
      background: #fff;
      border: 1px solid #d9d9d9;
      color: #595959;
    }
    .bai-stat-btn-secondary:hover {
      border-color: #1677ff;
      color: #1677ff;
    }
    .bai-stat-btn-danger {
      background: #fff;
      border: 1px solid #ffa39e;
      color: #cf1322;
    }
    .bai-stat-btn-danger:hover {
      background: #fff1f0;
      border-color: #ff4d4f;
      color: #a8071a;
    }
    .bai-stat-btn-primary {
      background: #1677ff;
      border: 1px solid #1677ff;
      color: #fff;
    }
    .bai-stat-btn-primary:hover {
      background: #4096ff;
    }
    .bai-stat-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .bai-stat-loading-bar {
      height: 3px;
      width: 100%;
      background: #f0f0f0;
      position: relative;
      overflow: hidden;
      display: none;
    }
    .bai-stat-loading-bar.active {
      display: block;
    }
    .bai-stat-loading-bar::after {
      content: '';
      position: absolute;
      left: -50%;
      width: 50%;
      height: 100%;
      background: #1677ff;
      animation: bai-loading 1.2s infinite ease-in-out;
    }
    @keyframes bai-loading {
      0% { left: -50%; }
      100% { left: 100%; }
    }
  `;

  // Inject Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // --- Constants ---
  const MODEL_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#faad14'];

  // --- Persistent Storage Manager ---
  const Storage = {
    KEYS: {
      RECORDS: 'bai_usage_records_v1',
      LAST_SYNC: 'bai_last_sync_time_v1',
    },
    get(key, defaultValue = null) {
      try {
        if (typeof GM_getValue !== 'undefined') {
          const val = GM_getValue(key, null);
          return val !== null ? val : defaultValue;
        }
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultValue;
      } catch (e) {
        console.warn('[BAI Analytics] Storage.get error:', e);
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        if (typeof GM_setValue !== 'undefined') {
          GM_setValue(key, value);
          return;
        }
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn('[BAI Analytics] Storage.set error:', e);
      }
    },
    remove(key) {
      try {
        if (typeof GM_deleteValue !== 'undefined') {
          GM_deleteValue(key);
          return;
        }
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('[BAI Analytics] Storage.remove error:', e);
      }
    },
    clear() {
      this.remove(this.KEYS.RECORDS);
      this.remove(this.KEYS.LAST_SYNC);
    }
  };

  // --- Deduplication & Merge Helper ---
  function getRecordKey(item) {
    if (item.id) return String(item.id);
    return `${item.created_at}_${item.model}_${item.input_tokens}_${item.output_tokens}_${item.cost_points || 0}`;
  }

  function mergeRecords(newRecords, oldRecords) {
    const map = new Map();
    // 优先放入新抓取的记录，再放入老记录
    for (const r of [...newRecords, ...oldRecords]) {
      const key = getRecordKey(r);
      if (!map.has(key)) {
        map.set(key, r);
      }
    }
    // 统一按 created_at 降序（最新在前）
    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- State ---
  const initialRecords = Storage.get(Storage.KEYS.RECORDS, []) || [];
  const initialLastSync = Storage.get(Storage.KEYS.LAST_SYNC, null);

  let state = {
    allRecords: initialRecords,
    cachedStats: initialRecords.length > 0 ? calculateStats(initialRecords) : null,
    loading: false,
    activeTab: 'today', // today | thisWeek | last24h | last7d
    lastSyncTime: initialLastSync ? new Date(initialLastSync) : null,
  };

  // --- Helper Date Calculations ---
  function getTimeRanges() {
    const nowMs = Date.now();
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingNow = new Date(nowMs + beijingOffset);

    // Today start (00:00:00 UTC+8)
    const todayStart = new Date(Date.UTC(
      beijingNow.getUTCFullYear(),
      beijingNow.getUTCMonth(),
      beijingNow.getUTCDate(),
      0, 0, 0, 0
    )).getTime() - beijingOffset;

    // This week start (Monday 00:00:00 UTC+8)
    const dayOfWeek = beijingNow.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisWeekStart = new Date(Date.UTC(
      beijingNow.getUTCFullYear(),
      beijingNow.getUTCMonth(),
      beijingNow.getUTCDate() - daysToMonday,
      0, 0, 0, 0
    )).getTime() - beijingOffset;

    const last24hStart = nowMs - 24 * 60 * 60 * 1000;
    const last7dStart = nowMs - 7 * 24 * 60 * 60 * 1000;

    return {
      today: { name: '今天 (00:00 至今)', start: todayStart, end: nowMs },
      thisWeek: { name: '本周 (周一 00:00 至今)', start: thisWeekStart, end: nowMs },
      last24h: { name: '最近 24 小时', start: last24hStart, end: nowMs },
      last7d: { name: '最近 7 天', start: last7dStart, end: nowMs }
    };
  }

  function calculateStats(records) {
    const ranges = getTimeRanges();
    const result = {};

    for (const [key, range] of Object.entries(ranges)) {
      result[key] = {
        name: range.name,
        totals: { input: 0, output: 0, total: 0, calls: 0, points: 0 },
        models: {}
      };
    }

    for (const item of records) {
      const itemMs = new Date(item.created_at).getTime();
      const model = item.model || 'unknown';
      const input = Number(item.input_tokens) || 0;
      const output = Number(item.output_tokens) || 0;
      const total = Number(item.total_tokens) || (input + output);
      const points = Number(item.cost_points) || 0;

      for (const [key, range] of Object.entries(ranges)) {
        if (itemMs >= range.start && itemMs <= range.end) {
          const p = result[key];
          if (!p.models[model]) {
            p.models[model] = { model, input: 0, output: 0, total: 0, calls: 0, points: 0 };
          }
          const m = p.models[model];
          m.calls += 1;
          m.input += input;
          m.output += output;
          m.total += total;
          m.points += points;

          p.totals.calls += 1;
          p.totals.input += input;
          p.totals.output += output;
          p.totals.total += total;
          p.totals.points += points;
        }
      }
    }

    return result;
  }

  // --- Fetch & Synchronize API with Smart Incremental Support ---
  async function syncUsageRecords(isFullSync = false, onProgress) {
    const existingRecords = isFullSync ? [] : (Storage.get(Storage.KEYS.RECORDS, []) || []);
    const existingKeySet = new Set(existingRecords.map(getRecordKey));

    const fetchedNewRecords = [];
    let page = 1;
    let cursor = undefined;
    const now = Date.now();
    const maxTimeLimit = now - 30 * 24 * 60 * 60 * 1000; // 最多回溯30天
    const MAX_RETRIES = 3;
    let hitExisting = false;

    while (page <= 500) {
      const inputObj = {
        "0": {
          "json": {
            "page": page,
            "pageSize": 100,
            "sortBy": "created_at",
            "sortOrder": "desc"
          }
        }
      };
      if (cursor) {
        inputObj["0"].json.cursor = cursor;
      }

      const url = `/trpc/lambda/usage.records?batch=1&input=${encodeURIComponent(JSON.stringify(inputObj))}`;

      // 指数退避重试（针对 429 / 5xx）
      let res;
      let lastErr;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        res = await fetch(url, { credentials: 'include' });
        if (res.ok) { lastErr = null; break; }
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`HTTP ${res.status}`);
          const waitMs = 500 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          // 4xx 错误中断并保留已有合并数据
          const merged = mergeRecords(fetchedNewRecords, existingRecords);
          return {
            records: merged,
            newCount: fetchedNewRecords.length,
            error: new Error(`请求第 ${page} 页失败: HTTP ${res.status}`)
          };
        }
      }
      if (lastErr) {
        const merged = mergeRecords(fetchedNewRecords, existingRecords);
        return {
          records: merged,
          newCount: fetchedNewRecords.length,
          error: new Error(`请求第 ${page} 页失败（已重试 ${MAX_RETRIES} 次）: ${lastErr.message}`)
        };
      }

      const json = await res.json();
      const resultObj = json[0]?.result?.data?.json;
      if (!resultObj || !Array.isArray(resultObj.data)) break;

      const pageData = resultObj.data;
      if (pageData.length === 0) break;

      for (const item of pageData) {
        const key = getRecordKey(item);
        if (!isFullSync && existingKeySet.has(key)) {
          // 增量模式下，一旦遇到本地已存在的记录，说明更早的历史数据本地均已有，直接结束翻页
          hitExisting = true;
          break;
        }
        fetchedNewRecords.push(item);
        existingKeySet.add(key);
      }

      if (onProgress) {
        onProgress(page, fetchedNewRecords.length, isFullSync);
      }

      if (hitExisting) {
        break;
      }

      // 检查最旧记录是否超出时间限制
      const oldestTime = new Date(pageData[pageData.length - 1].created_at).getTime();
      if (oldestTime < maxTimeLimit) break;

      // 以 has_more 为唯一翻页依据
      if (!resultObj.has_more) break;
      cursor = resultObj.next_cursor;

      page++;
      await new Promise(r => setTimeout(r, 60));
    }

    const merged = mergeRecords(fetchedNewRecords, existingRecords);

    // 持久化存储
    Storage.set(Storage.KEYS.RECORDS, merged);
    Storage.set(Storage.KEYS.LAST_SYNC, Date.now());

    return {
      records: merged,
      newCount: fetchedNewRecords.length,
      error: null
    };
  }

  function formatTime(date) {
    if (!date) return '从未同步';
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // --- Render UI ---
  function createUI() {
    // 1. Trigger Floating Button
    const triggerBtn = document.createElement('button');
    triggerBtn.id = 'bai-stat-trigger-btn';
    triggerBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 3v18h18"/>
        <path d="m19 9-5 5-4-4-3 3"/>
      </svg>
      Token 用量统计
    `;
    document.body.appendChild(triggerBtn);

    // 2. Modal Overlay
    const overlay = document.createElement('div');
    overlay.id = 'bai-stat-modal-overlay';
    overlay.innerHTML = `
      <div id="bai-stat-modal">
        <div class="bai-stat-header">
          <div class="bai-stat-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18"/>
              <path d="m19 9-5 5-4-4-3 3"/>
            </svg>
            Token 用量多维度聚合分析
            <span class="bai-stat-badge ${state.allRecords.length > 0 ? 'badge-cached' : ''}" id="bai-stat-badge">
              ${state.allRecords.length > 0 ? '本地已缓存' : '实时统计'}
            </span>
          </div>
          <button class="bai-stat-close-btn" id="bai-stat-close">&times;</button>
        </div>

        <div class="bai-stat-tabs">
          <button class="bai-stat-tab-btn active" data-tab="today">🌟 今天</button>
          <button class="bai-stat-tab-btn" data-tab="thisWeek">📅 本周</button>
          <button class="bai-stat-tab-btn" data-tab="last24h">⏱️ 最近 24 小时</button>
          <button class="bai-stat-tab-btn" data-tab="last7d">🗓️ 最近 7 天</button>
        </div>

        <div class="bai-stat-loading-bar" id="bai-stat-loading-bar"></div>

        <div class="bai-stat-body" id="bai-stat-content">
          <!-- Content populated dynamically -->
        </div>

        <div class="bai-stat-footer">
          <div class="bai-stat-meta-text" id="bai-stat-meta">
            ${state.allRecords.length > 0 
              ? `已缓存 ${state.allRecords.length} 条记录 | 上次同步: ${formatTime(state.lastSyncTime)}` 
              : '本地暂无缓存，点击增量同步拉取最新记录'}
          </div>
          <div class="bai-stat-actions">
            <button class="bai-stat-btn bai-stat-btn-danger" id="bai-stat-clear" title="清空本地所有已缓存的记录">🗑️ 清空</button>
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-stat-full-refresh" title="清除缓存并从头重新抓取全部历史">⚡ 全量重抓</button>
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-stat-export-csv">📥 导出 CSV</button>
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-stat-export-json">📦 导出 JSON</button>
            <button class="bai-stat-btn bai-stat-btn-primary" id="bai-stat-sync">🔄 增量同步</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Event Handlers
    triggerBtn.addEventListener('click', () => {
      overlay.classList.add('active');
      if (state.allRecords.length === 0 && !state.loading) {
        startSync(true);
      } else {
        renderContent();
      }
    });

    overlay.querySelector('#bai-stat-close').addEventListener('click', () => {
      overlay.classList.remove('active');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });

    overlay.querySelectorAll('.bai-stat-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.bai-stat-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTab = btn.getAttribute('data-tab');
        renderContent();
      });
    });

    // 增量同步按钮
    overlay.querySelector('#bai-stat-sync').addEventListener('click', () => {
      startSync(false);
    });

    // 全量重抓按钮
    overlay.querySelector('#bai-stat-full-refresh').addEventListener('click', () => {
      if (state.allRecords.length > 0) {
        if (!confirm('确定要清除本地缓存并重新全量抓取所有历史用量吗？（这可能需要翻页数次）')) {
          return;
        }
      }
      startSync(true);
    });

    // 清空缓存按钮
    overlay.querySelector('#bai-stat-clear').addEventListener('click', () => {
      if (confirm('确定要清空本地已持久化存储的所有 Token 用量记录吗？')) {
        Storage.clear();
        state.allRecords = [];
        state.cachedStats = null;
        state.lastSyncTime = null;
        const metaText = document.querySelector('#bai-stat-meta');
        if (metaText) metaText.innerText = '本地缓存已清空';
        const badge = document.querySelector('#bai-stat-badge');
        if (badge) {
          badge.className = 'bai-stat-badge';
          badge.innerText = '实时统计';
        }
        renderContent();
      }
    });

    overlay.querySelector('#bai-stat-export-csv').addEventListener('click', () => {
      exportData('csv');
    });

    overlay.querySelector('#bai-stat-export-json').addEventListener('click', () => {
      exportData('json');
    });
  }

  async function startSync(isFullSync = false) {
    if (state.loading) return;
    state.loading = true;

    const loadingBar = document.querySelector('#bai-stat-loading-bar');
    const syncBtn = document.querySelector('#bai-stat-sync');
    const fullBtn = document.querySelector('#bai-stat-full-refresh');
    const clearBtn = document.querySelector('#bai-stat-clear');
    const metaText = document.querySelector('#bai-stat-meta');
    const badge = document.querySelector('#bai-stat-badge');
    
    if (loadingBar) loadingBar.classList.add('active');
    if (syncBtn) syncBtn.disabled = true;
    if (fullBtn) fullBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;

    if (metaText) {
      metaText.innerText = isFullSync ? '正在执行全量抓取...' : '正在检查最新用量记录并增量同步...';
    }

    try {
      const { records, newCount, error } = await syncUsageRecords(isFullSync, (page, count, isFull) => {
        if (metaText) {
          metaText.innerText = isFull 
            ? `正在全量抓取第 ${page} 页，已获取 ${count} 条明细...` 
            : `正在增量同步第 ${page} 页，发现 ${count} 条新记录...`;
        }
      });

      state.allRecords = records;
      state.cachedStats = calculateStats(records);
      state.lastSyncTime = new Date();

      if (badge) {
        badge.className = 'bai-stat-badge badge-cached';
        badge.innerText = `已缓存 (${records.length} 条)`;
      }

      if (error) {
        console.warn('[BAI Analytics] 同步中断:', error);
        if (metaText) {
          metaText.innerText = `同步中断 (${error.message})，本地已保存 ${records.length} 条记录 (${formatTime(state.lastSyncTime)})`;
        }
      } else {
        if (metaText) {
          if (isFullSync) {
            metaText.innerText = `全量抓取完成！共计 ${records.length} 条记录 (${formatTime(state.lastSyncTime)})`;
          } else {
            metaText.innerText = newCount > 0 
              ? `增量同步完成！新增 ${newCount} 条记录，当前共 ${records.length} 条 (${formatTime(state.lastSyncTime)})`
              : `已是最新数据（无新增调用），本地共 ${records.length} 条记录 (${formatTime(state.lastSyncTime)})`;
          }
        }
      }
    } catch (err) {
      console.error('[BAI Analytics] 同步失败:', err);
      if (metaText) metaText.innerText = `同步失败: ${err.message}`;
    } finally {
      state.loading = false;
      if (loadingBar) loadingBar.classList.remove('active');
      if (syncBtn) syncBtn.disabled = false;
      if (fullBtn) fullBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
      renderContent();
    }
  }

  function renderContent() {
    const container = document.querySelector('#bai-stat-content');
    if (!container) return;

    if (state.loading && state.allRecords.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px; color: #8c8c8c;">
          <div style="font-size: 28px; margin-bottom: 12px;">⏳</div>
          <div style="font-size: 14px; font-weight: 500;">正在从官方接口抓取用量记录并建立本地缓存...</div>
        </div>
      `;
      return;
    }

    if (state.allRecords.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px; color: #8c8c8c;">
          <div style="font-size: 28px; margin-bottom: 12px;">📭</div>
          <div style="font-size: 14px; font-weight: 500;">暂无用量缓存，点击下方“增量同步”或“全量重抓”开始分析。</div>
        </div>
      `;
      return;
    }

    const allStats = state.cachedStats || calculateStats(state.allRecords);
    const activeData = allStats[state.activeTab];
    const { totals, models, name } = activeData;

    const modelList = Object.values(models).sort((a, b) => b.total - a.total);

    // Cards Grid
    const cardsHtml = `
      <div class="bai-stat-cards-grid">
        <div class="bai-stat-card">
          <div class="bai-stat-card-label">总 Token 用量</div>
          <div class="bai-stat-card-val">${totals.total.toLocaleString()}</div>
          <div class="bai-stat-card-sub">${name}</div>
        </div>
        <div class="bai-stat-card card-prompt">
          <div class="bai-stat-card-label">Prompt Tokens (输入)</div>
          <div class="bai-stat-card-val">${totals.input.toLocaleString()}</div>
          <div class="bai-stat-card-sub">${totals.total > 0 ? ((totals.input / totals.total) * 100).toFixed(1) + '% 占比' : '0%'}</div>
        </div>
        <div class="bai-stat-card card-completion">
          <div class="bai-stat-card-label">Completion Tokens (输出)</div>
          <div class="bai-stat-card-val">${totals.output.toLocaleString()}</div>
          <div class="bai-stat-card-sub">${totals.total > 0 ? ((totals.output / totals.total) * 100).toFixed(1) + '% 占比' : '0%'}</div>
        </div>
        <div class="bai-stat-card card-calls">
          <div class="bai-stat-card-label">总调用次数</div>
          <div class="bai-stat-card-val">${totals.calls.toLocaleString()} 次</div>
          <div class="bai-stat-card-sub">均次: ${totals.calls > 0 ? Math.round(totals.total / totals.calls).toLocaleString() : 0} Tokens</div>
        </div>
      </div>
    `;

    // Table Rows
    let tableRowsHtml = '';
    if (modelList.length === 0) {
      tableRowsHtml = `<tr><td colspan="6" style="text-align:center; padding: 24px; color:#8c8c8c;">该时间段内无调用记录</td></tr>`;
    } else {
      modelList.forEach((m, idx) => {
        const percent = totals.total > 0 ? ((m.total / totals.total) * 100).toFixed(1) : 0;
        tableRowsHtml += `
          <tr>
            <td style="font-weight: 600; color: #1f1f1f;">
              <div style="display:flex; align-items:center; gap: 8px;">
                <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${MODEL_COLORS[idx % MODEL_COLORS.length]};"></span>
                ${escapeHtml(m.model)}
              </div>
            </td>
            <td>${m.calls.toLocaleString()}</td>
            <td style="color: #52c41a; font-family: monospace; font-weight: 600;">${m.input.toLocaleString()}</td>
            <td style="color: #fa8c16; font-family: monospace; font-weight: 600;">${m.output.toLocaleString()}</td>
            <td style="color: #1677ff; font-family: monospace; font-weight: 700;">${m.total.toLocaleString()}</td>
            <td style="width: 140px;">
              <div style="display:flex; justify-content:space-between; font-size: 11px; color:#8c8c8c;">
                <span>${percent}%</span>
              </div>
              <div class="bai-stat-progress-bg">
                <div class="bai-stat-progress-bar" style="width: ${percent}%;"></div>
              </div>
            </td>
          </tr>
        `;
      });
    }

    const tableHtml = `
      <div class="bai-stat-table-wrapper">
        <table class="bai-stat-table">
          <thead>
            <tr>
              <th>模型名称</th>
              <th>调用次数</th>
              <th>Prompt (输入)</th>
              <th>Completion (输出)</th>
              <th>Total (合计)</th>
              <th>用量占比</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = cardsHtml + tableHtml;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function csvEscape(val) {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportData(format) {
    if (state.allRecords.length === 0) {
      alert('暂无数据可导出，请先点击增量同步或全量重抓');
      return;
    }
    const allStats = state.cachedStats || calculateStats(state.allRecords);
    const activeData = allStats[state.activeTab];
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `bai_token_stats_${state.activeTab}_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else if (format === 'csv') {
      const rows = [
        ['时间维度', activeData.name],
        ['总调用次数', activeData.totals.calls],
        ['总输入 Token', activeData.totals.input],
        ['总输出 Token', activeData.totals.output],
        ['总合计 Token', activeData.totals.total],
        [],
        ['模型名称', '调用次数', 'Prompt Token (输入)', 'Completion Token (输出)', 'Total Token (合计)', '用量占比']
      ];

      Object.values(activeData.models).forEach(m => {
        const percent = activeData.totals.total > 0 ? ((m.total / activeData.totals.total) * 100).toFixed(2) + '%' : '0%';
        rows.push([m.model, m.calls, m.input, m.output, m.total, percent]);
      });

      const csvContent = "\uFEFF" + rows.map(e => e.map(csvEscape).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bai_token_stats_${state.activeTab}_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  // Initialize
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    createUI();
  } else {
    window.addEventListener('DOMContentLoaded', createUI);
  }
})();
