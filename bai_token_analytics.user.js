// ==UserScript==
// @name         BAI Token 用量多维度聚合统计
// @namespace    https://chat.b.ai/
// @version      1.3.1
// @description  自动抓取并统计 chat.b.ai 的今天、本周、最近24小时、最近7天及全历史各模型 Token 用量（输入/输出/合计/缓存命中/缓存创建/耗时/TPS/联网搜索/调用次数），支持全局多维与自定义日期时间筛选、默认隐藏/折叠筛选栏、本地持久化存储、智能增量同步、图表可视化与完整数据导出。
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
      background: rgba(0, 0, 0, 0.48);
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
      width: 1180px;
      max-width: 96vw;
      max-height: 94vh;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid rgba(0, 0, 0, 0.08);
    }
    #bai-stat-modal-overlay.active #bai-stat-modal {
      transform: scale(1);
    }
    .bai-stat-header {
      padding: 14px 24px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bai-stat-title {
      font-size: 16px;
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
    .bai-stat-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 24px;
      background: #fff;
      border-bottom: 1px solid #f0f0f0;
      flex-wrap: wrap;
      gap: 10px;
    }
    .bai-stat-tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .bai-stat-tab-btn {
      background: #f5f5f5;
      border: 1px solid transparent;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #595959;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 5px;
      user-select: none;
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
    .bai-stat-top-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .bai-stat-filter-toggle-btn {
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #595959;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 5px;
      user-select: none;
      position: relative;
    }
    .bai-stat-filter-toggle-btn:hover {
      background: #e6f4ff;
      border-color: #91caff;
      color: #1677ff;
    }
    .bai-stat-filter-toggle-btn.active {
      background: #e6f4ff;
      border-color: #1677ff;
      color: #1677ff;
    }
    .bai-stat-filter-toggle-btn.has-filter {
      background: #e6f4ff;
      border-color: #1677ff;
      color: #0958d9;
      font-weight: 700;
    }
    .bai-stat-filter-badge-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      background: #1677ff;
      border-radius: 50%;
    }
    .bai-stat-view-switch {
      display: flex;
      background: #ebebeb;
      padding: 3px;
      border-radius: 8px;
      gap: 3px;
    }
    .bai-stat-view-btn {
      border: 1px solid transparent;
      background: transparent;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #595959;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 5px;
      user-select: none;
    }
    .bai-stat-view-btn:hover {
      color: #1677ff;
      background: rgba(255, 255, 255, 0.6);
    }
    .bai-stat-view-btn.active {
      background: #ffffff;
      color: #1677ff;
      border-color: rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    /* --- Global Filter Container (Hidden by default) --- */
    .bai-stat-filter-container {
      background: #fafbfc;
      border-bottom: 1px solid #f0f0f0;
      transition: all 0.25s ease;
    }
    .bai-stat-filter-container.collapsed {
      display: none;
    }
    .bai-stat-filter-container.expanded {
      display: block;
      padding: 12px 24px;
    }
    .bai-stat-filter-card {
      background: #ffffff;
      border: 1px solid #eaedf1;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .bai-stat-filter-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .bai-stat-filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .bai-stat-filter-label {
      font-size: 12px;
      font-weight: 600;
      color: #4b5563;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .bai-stat-preset-btns {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      align-items: center;
    }
    .bai-stat-filter-btn {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .bai-stat-filter-btn:hover {
      background: #f0f7ff;
      border-color: #91caff;
      color: #1677ff;
    }
    .bai-stat-filter-btn.active {
      background: #1677ff;
      border-color: #1677ff;
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(22, 119, 255, 0.25);
    }
    .bai-stat-input, .bai-stat-select {
      height: 30px;
      padding: 4px 10px;
      border: 1px solid #d9d9d9;
      border-radius: 6px;
      font-size: 12px;
      color: #1f1f1f;
      background: #fff;
      outline: none;
      transition: all 0.2s;
      font-family: inherit;
    }
    .bai-stat-input:focus, .bai-stat-select:focus {
      border-color: #1677ff;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15);
    }
    .bai-stat-datetime {
      color: #262626;
      min-width: 175px;
    }
    .bai-stat-filter-sep {
      font-size: 12px;
      color: #8c8c8c;
      font-weight: 500;
    }

    /* --- Active Filter Compact Banner (shown when collapsed & filters active) --- */
    .bai-stat-active-filter-bar {
      padding: 8px 24px;
      background: #f0f7ff;
      border-bottom: 1px solid #bae0ff;
      font-size: 12px;
      color: #0958d9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .bai-stat-active-filter-bar strong {
      color: #003eb3;
      font-weight: 700;
    }

    .bai-stat-body {
      padding: 18px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .bai-stat-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .bai-stat-card {
      background: #fcfcfc;
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
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
    .bai-stat-card.card-cache-read::before { background: #13c2c2; }
    .bai-stat-card.card-cache-write::before { background: #2f54eb; }
    .bai-stat-card.card-latency::before { background: #eb2f96; }
    .bai-stat-card.card-tps::before { background: #faad14; }
    .bai-stat-card.card-calls::before { background: #722ed1; }

    .bai-stat-card-label {
      font-size: 11px;
      color: #8c8c8c;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bai-stat-card-val {
      font-size: 18px;
      font-weight: 700;
      color: #1f1f1f;
      font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .bai-stat-card-sub {
      font-size: 11px;
      color: #8c8c8c;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .bai-stat-card-highlight {
      font-weight: 600;
      color: #389e0d;
    }

    /* --- Details summary and pagination --- */
    .bai-stat-detail-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      background: #fafbfc;
      border: 1px solid #eaedf1;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12px;
      color: #595959;
    }
    .bai-stat-detail-summary-metrics {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .bai-stat-detail-summary strong {
      color: #1677ff;
      font-weight: 700;
    }
    .bai-stat-pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 2px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .bai-stat-page-info {
      font-size: 12px;
      color: #595959;
    }
    .bai-stat-page-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bai-stat-page-num {
      font-size: 12px;
      font-weight: 600;
      color: #262626;
      min-width: 48px;
      text-align: center;
    }

    .bai-stat-table-wrapper {
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      background: #fff;
      position: relative;
    }
    .bai-stat-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      text-align: left;
      font-size: 12px;
      min-width: 900px;
    }
    .bai-stat-table th {
      position: sticky;
      top: -18px;
      z-index: 10;
      background: #fafafa;
      padding: 10px 12px;
      color: #595959;
      font-weight: 600;
      border-bottom: 1px solid #e8e8e8;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .bai-stat-table thead tr th:first-child {
      border-top-left-radius: 9px;
    }
    .bai-stat-table thead tr th:last-child {
      border-top-right-radius: 9px;
    }
    .bai-stat-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f5f5f5;
      color: #262626;
      vertical-align: middle;
      background: #fff;
    }
    .bai-stat-table tr:last-child td {
      border-bottom: none;
    }
    .bai-stat-table tr:last-child td:first-child {
      border-bottom-left-radius: 9px;
    }
    .bai-stat-table tr:last-child td:last-child {
      border-bottom-right-radius: 9px;
    }
    .bai-stat-table tr:hover td {
      background: #fafafa;
    }
    .bai-stat-tag {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .bai-stat-tag-api {
      background: #e6f4ff;
      color: #0958d9;
      border: 1px solid #91caff;
    }
    .bai-stat-tag-web {
      background: #f6ffed;
      color: #389e0d;
      border: 1px solid #b7eb8f;
    }
    .bai-stat-progress-bg {
      width: 100%;
      height: 5px;
      background: #f0f0f0;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 3px;
    }
    .bai-stat-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #1677ff, #69b1ff);
      border-radius: 3px;
    }
    .bai-stat-raw-detail {
      background: #282c34;
      color: #abb2bf;
      padding: 10px 14px;
      border-radius: 6px;
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 11px;
      max-height: 220px;
      overflow-y: auto;
      margin-top: 6px;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.45;
    }
    .bai-stat-copy-btn {
      background: #f0f0f0;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      color: #595959;
      transition: all 0.2s;
    }
    .bai-stat-copy-btn:hover {
      background: #e6f4ff;
      color: #1677ff;
      border-color: #91caff;
    }
    .bai-stat-footer {
      padding: 12px 24px;
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
      padding: 6px 12px;
      border-radius: 7px;
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

  // Inject Styles (Prevent duplicate)
  let styleEl = document.querySelector('#bai-stat-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'bai-stat-styles';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = STYLES;

  // --- Constants ---
  const MODEL_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#faad14', '#13c2c2', '#2f54eb'];

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
    for (const r of [...newRecords, ...oldRecords]) {
      const key = getRecordKey(r);
      if (!map.has(key)) {
        map.set(key, r);
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- Helper Date Calculations ---
  function toLocalDatetimeString(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const H = pad(d.getHours());
    const m = pad(d.getMinutes());
    return `${Y}-${M}-${D}T${H}:${m}`;
  }

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

  // --- State ---
  const initialRecords = Storage.get(Storage.KEYS.RECORDS, []) || [];
  const initialLastSync = Storage.get(Storage.KEYS.LAST_SYNC, null);

  let state = {
    allRecords: initialRecords,
    loading: false,
    activeTab: 'today', // today | thisWeek | last24h | last7d | all | custom
    activeView: 'aggregate', // aggregate | details
    lastSyncTime: initialLastSync ? new Date(initialLastSync) : null,
    expandedRecordIds: new Set(),
    filterExpanded: false, // 筛选区域默认隐藏 (false)
    // 全局数据筛选条件
    filter: {
      preset: 'today', // today | thisWeek | last24h | last7d | yesterday | last3d | all | custom
      startDateTime: '', // 'YYYY-MM-DDTHH:mm'
      endDateTime: '', // 'YYYY-MM-DDTHH:mm'
      model: 'all',
      source: 'all',
      searchKey: '',
      page: 1,
      pageSize: 50,
    }
  };

  // --- 判断是否处于自定义/非默认的额外筛选状态 ---
  function hasActiveExtraFilters() {
    const f = state.filter;
    return (
      f.preset === 'custom' ||
      f.preset === 'yesterday' ||
      f.preset === 'last3d' ||
      f.model !== 'all' ||
      f.source !== 'all' ||
      Boolean(f.searchKey && f.searchKey.trim()) ||
      Boolean(f.startDateTime) ||
      Boolean(f.endDateTime)
    );
  }

  // --- 全局数据过滤器与指标聚合计算 ---
  function getFilteredData() {
    const { preset, startDateTime, endDateTime, model, source, searchKey } = state.filter;
    const ranges = getTimeRanges();
    const nowMs = Date.now();

    let startTime = 0;
    let endTime = Infinity;
    let rangeDesc = '全部历史';

    if (preset === 'today') {
      startTime = ranges.today.start;
      endTime = ranges.today.end;
      rangeDesc = '今天 (00:00 至今)';
    } else if (preset === 'thisWeek') {
      startTime = ranges.thisWeek.start;
      endTime = ranges.thisWeek.end;
      rangeDesc = '本周 (周一 00:00 至今)';
    } else if (preset === 'last24h') {
      startTime = ranges.last24h.start;
      endTime = ranges.last24h.end;
      rangeDesc = '最近 24 小时';
    } else if (preset === 'last7d') {
      startTime = ranges.last7d.start;
      endTime = ranges.last7d.end;
      rangeDesc = '最近 7 天';
    } else if (preset === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      startTime = d.getTime();
      d.setHours(23, 59, 59, 999);
      endTime = d.getTime();
      rangeDesc = '昨天全天';
    } else if (preset === 'last3d') {
      startTime = nowMs - 3 * 24 * 60 * 60 * 1000;
      endTime = nowMs;
      rangeDesc = '最近 3 天';
    } else if (preset === 'all') {
      startTime = 0;
      endTime = Infinity;
      rangeDesc = '全部历史数据';
    } else if (preset === 'custom') {
      if (startDateTime) {
        startTime = new Date(startDateTime).getTime();
      }
      if (endDateTime) {
        endTime = new Date(endDateTime).getTime() + 59999;
      }
      rangeDesc = `自定义 (${startDateTime || '最初'} ~ ${endDateTime || '最新'})`;
    }

    const filteredRecords = state.allRecords.filter(item => {
      const itemMs = new Date(item.created_at).getTime();
      if (itemMs < startTime || itemMs > endTime) return false;

      if (model && model !== 'all' && (item.model || 'unknown') !== model) {
        return false;
      }

      const itemSource = (item.source_type || item.source || 'api').toLowerCase();
      if (source && source !== 'all' && itemSource !== source.toLowerCase()) {
        return false;
      }

      if (searchKey && searchKey.trim()) {
        const q = searchKey.trim().toLowerCase();
        const m = (item.model || '').toLowerCase();
        const reqId = (item.request_id || '').toLowerCase();
        const id = String(item.id || '').toLowerCase();
        if (!m.includes(q) && !reqId.includes(q) && !id.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // 计算全局指标汇总与模型分组
    const totals = {
      calls: filteredRecords.length,
      input: 0,
      output: 0,
      total: 0,
      points: 0,
      cacheRead: 0,
      cacheCreation: 0,
      cache5m: 0,
      cache1h: 0,
      totalDuration: 0,
      webSearches: 0,
      sourceApi: 0,
      sourceWeb: 0
    };
    const models = {};

    for (const item of filteredRecords) {
      const mName = item.model || 'unknown';
      const input = Number(item.input_tokens) || 0;
      const output = Number(item.output_tokens) || 0;
      const total = Number(item.total_tokens) || (input + output);
      const points = Number(item.cost_points) || 0;

      const cacheTokens = item.cache_tokens || {};
      const cacheRead = Number(cacheTokens.cache_read_input_tokens) || 0;
      const cache5m = Number(cacheTokens.cache_creation_5m_tokens) || 0;
      const cache1h = Number(cacheTokens.cache_creation_1h_tokens) || 0;
      const cacheCreation = Number(cacheTokens.cache_creation_input_tokens) || (cache5m + cache1h);

      const duration = Number(item.duration_sec) || (item.duration_ms ? item.duration_ms / 1000 : 0);
      const webSearch = Number(item.web_search_count) || 0;
      const sourceStr = (item.source_type || item.source || 'api').toLowerCase();

      if (!models[mName]) {
        models[mName] = {
          model: mName,
          calls: 0,
          input: 0,
          output: 0,
          total: 0,
          points: 0,
          cacheRead: 0,
          cacheCreation: 0,
          totalDuration: 0,
          webSearches: 0,
          sourceApi: 0,
          sourceWeb: 0
        };
      }
      const m = models[mName];
      m.calls += 1;
      m.input += input;
      m.output += output;
      m.total += total;
      m.points += points;
      m.cacheRead += cacheRead;
      m.cacheCreation += cacheCreation;
      m.totalDuration += duration;
      m.webSearches += webSearch;
      if (sourceStr === 'web') m.sourceWeb += 1;
      else m.sourceApi += 1;

      totals.input += input;
      totals.output += output;
      totals.total += total;
      totals.points += points;
      totals.cacheRead += cacheRead;
      totals.cacheCreation += cacheCreation;
      totals.cache5m += cache5m;
      totals.cache1h += cache1h;
      totals.totalDuration += duration;
      totals.webSearches += webSearch;
      if (sourceStr === 'web') totals.sourceWeb += 1;
      else totals.sourceApi += 1;
    }

    return {
      filteredRecords,
      totals,
      models,
      rangeDesc,
      startTime,
      endTime
    };
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

      const oldestTime = new Date(pageData[pageData.length - 1].created_at).getTime();
      if (oldestTime < maxTimeLimit) break;

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

  function formatDateTime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // --- Render UI ---
  function createUI() {
    // 清理旧实例防止重复
    const oldBtn = document.querySelector('#bai-stat-trigger-btn');
    if (oldBtn) oldBtn.remove();
    const oldOverlay = document.querySelector('#bai-stat-modal-overlay');
    if (oldOverlay) oldOverlay.remove();

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
            Token 用量与全指标分析
            <span class="bai-stat-badge ${state.allRecords.length > 0 ? 'badge-cached' : ''}" id="bai-stat-badge">
              ${state.allRecords.length > 0 ? '本地已缓存' : '实时统计'}
            </span>
          </div>
          <button class="bai-stat-close-btn" id="bai-stat-close">&times;</button>
        </div>

        <div class="bai-stat-top-bar" id="bai-stat-top-bar">
          <!-- Top bar dynamically updated -->
        </div>

        <!-- 全局筛选容器（默认隐藏） -->
        <div id="bai-stat-filter-container" class="bai-stat-filter-container ${state.filterExpanded ? 'expanded' : 'collapsed'}">
          <!-- Filter content populated dynamically -->
        </div>

        <!-- 筛选已生效的迷你提示条（当筛选栏折叠且筛选激活时展示） -->
        <div id="bai-stat-active-filter-bar-wrapper"></div>

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
            <button class="bai-stat-btn bai-stat-btn-danger" id="bai-stat-clear" data-action="clear" title="清空本地所有已缓存的记录">清空</button>
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-stat-full-refresh" data-action="full-refresh" title="清除缓存并从头重新抓取全部历史">全量重抓</button>
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-stat-export-csv" data-action="export-csv" title="导出当前筛选维度报表及明细 CSV">导出 CSV</button>
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-stat-export-json" data-action="export-json" title="导出完整 JSON 数据">导出 JSON</button>
            <button class="bai-stat-btn bai-stat-btn-primary" id="bai-stat-sync" data-action="sync">增量同步</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let searchDebounceTimer = null;

    // --- 全局事件委托 (Event Delegation) ---
    triggerBtn.addEventListener('click', () => {
      overlay.classList.add('active');
      if (state.allRecords.length === 0 && !state.loading) {
        startSync(true);
      } else {
        renderContent();
      }
    });

    overlay.addEventListener('click', (e) => {
      // 1. 点击背景关闭
      if (e.target === overlay) {
        overlay.classList.remove('active');
        return;
      }

      // 2. 点击关闭按钮
      if (e.target.closest('#bai-stat-close')) {
        overlay.classList.remove('active');
        return;
      }

      // 3. 点击顶部时间维度快捷 Tab (今天 / 本周 / 最近24h / 最近7天 / 全部历史 / 自定义)
      const tabBtn = e.target.closest('.bai-stat-tab-btn');
      if (tabBtn) {
        const tab = tabBtn.getAttribute('data-tab');
        if (tab && state.filter.preset !== tab) {
          state.filter.preset = tab;
          state.activeTab = tab;
          state.filter.page = 1;
          renderContent();
        }
        return;
      }

      // 4. 点击筛选面板展开/收起按钮
      if (e.target.closest('#bai-filter-toggle') || e.target.closest('#bai-filter-open-btn')) {
        state.filterExpanded = !state.filterExpanded;
        renderContent();
        return;
      }

      // 5. 点击筛选面板内的「收起」按钮
      if (e.target.closest('#bai-filter-collapse-btn')) {
        state.filterExpanded = false;
        renderContent();
        return;
      }

      // 6. 点击视图切换 Switcher (聚合 vs 明细)
      const viewBtn = e.target.closest('.bai-stat-view-btn');
      if (viewBtn) {
        const view = viewBtn.getAttribute('data-view');
        if (view && state.activeView !== view) {
          state.activeView = view;
          renderContent();
        }
        return;
      }

      // 7. 点击筛选面板内的预设按钮
      const filterPresetBtn = e.target.closest('[data-filter-preset]');
      if (filterPresetBtn) {
        const preset = filterPresetBtn.getAttribute('data-filter-preset');
        if (preset) {
          state.filter.preset = preset;
          state.activeTab = preset;
          state.filter.page = 1;

          if (preset === 'custom') {
            if (!state.filter.startDateTime) {
              const ranges = getTimeRanges();
              state.filter.startDateTime = toLocalDatetimeString(ranges.today.start);
            }
            if (!state.filter.endDateTime) {
              state.filter.endDateTime = toLocalDatetimeString(new Date());
            }
          }
          renderContent();
        }
        return;
      }

      // 8. 重置筛选按钮
      if (e.target.closest('#bai-filter-reset') || e.target.closest('#bai-filter-reset-compact')) {
        state.filter = {
          preset: 'today',
          startDateTime: '',
          endDateTime: '',
          model: 'all',
          source: 'all',
          searchKey: '',
          page: 1,
          pageSize: state.filter.pageSize || 50
        };
        state.activeTab = 'today';
        renderContent();
        return;
      }

      // 9. 应用自定义日期时间筛选
      if (e.target.closest('#bai-filter-apply-custom')) {
        const startInput = overlay.querySelector('#bai-filter-start');
        const endInput = overlay.querySelector('#bai-filter-end');
        if (startInput) state.filter.startDateTime = startInput.value;
        if (endInput) state.filter.endDateTime = endInput.value;
        state.filter.preset = 'custom';
        state.activeTab = 'custom';
        state.filter.page = 1;
        renderContent();
        return;
      }

      // 10. 分页: 上一页
      if (e.target.closest('#bai-page-prev')) {
        if (state.filter.page > 1) {
          state.filter.page -= 1;
          renderContent();
        }
        return;
      }

      // 11. 分页: 下一页
      if (e.target.closest('#bai-page-next')) {
        const { filteredRecords } = getFilteredData();
        const totalPages = Math.ceil(filteredRecords.length / (state.filter.pageSize || 50)) || 1;
        if (state.filter.page < totalPages) {
          state.filter.page += 1;
          renderContent();
        }
        return;
      }

      // 12. 点击明细行展开/收起「详情」按钮
      const rawBtn = e.target.closest('.bai-stat-view-raw-btn');
      if (rawBtn) {
        const key = rawBtn.getAttribute('data-record-key');
        if (key) {
          if (state.expandedRecordIds.has(key)) {
            state.expandedRecordIds.delete(key);
          } else {
            state.expandedRecordIds.add(key);
          }
          renderContent();
        }
        return;
      }

      // 13. 点击「复制 JSON」按钮
      const copyBtn = e.target.closest('.bai-stat-copy-raw-btn');
      if (copyBtn) {
        const key = copyBtn.getAttribute('data-record-key');
        const record = state.allRecords.find((r, i) => getRecordKey(r) === key || String(r.id || i) === key);
        if (record) {
          navigator.clipboard.writeText(JSON.stringify(record, null, 2)).then(() => {
            copyBtn.innerText = '已复制!';
            setTimeout(() => { copyBtn.innerText = '复制 JSON'; }, 1500);
          });
        }
        return;
      }

      // 14. 增量同步
      if (e.target.closest('#bai-stat-sync') || e.target.closest('[data-action="sync"]')) {
        startSync(false);
        return;
      }

      // 15. 全量重抓
      if (e.target.closest('#bai-stat-full-refresh') || e.target.closest('[data-action="full-refresh"]')) {
        if (state.allRecords.length > 0) {
          if (!confirm('确定要清除本地缓存并重新全量抓取所有历史用量吗？（这可能需要翻页数次）')) {
            return;
          }
        }
        startSync(true);
        return;
      }

      // 16. 清空缓存
      if (e.target.closest('#bai-stat-clear') || e.target.closest('[data-action="clear"]')) {
        if (confirm('确定要清空本地已持久化存储的所有 Token 用量记录吗？')) {
          Storage.clear();
          state.allRecords = [];
          state.lastSyncTime = null;
          state.expandedRecordIds.clear();
          state.filter.page = 1;
          const metaText = document.querySelector('#bai-stat-meta');
          if (metaText) metaText.innerText = '本地缓存已清空';
          const badge = document.querySelector('#bai-stat-badge');
          if (badge) {
            badge.className = 'bai-stat-badge';
            badge.innerText = '实时统计';
          }
          renderContent();
        }
        return;
      }

      // 17. 导出 CSV
      if (e.target.closest('#bai-stat-export-csv') || e.target.closest('[data-action="export-csv"]')) {
        exportData('csv');
        return;
      }

      // 18. 导出 JSON
      if (e.target.closest('#bai-stat-export-json') || e.target.closest('[data-action="export-json"]')) {
        exportData('json');
        return;
      }
    });

    // --- 筛选控件 Change / Input 事件监听 ---
    overlay.addEventListener('change', (e) => {
      // 1. 模型下拉选择
      if (e.target.id === 'bai-filter-model') {
        state.filter.model = e.target.value;
        state.filter.page = 1;
        renderContent();
        return;
      }

      // 2. 渠道下拉选择
      if (e.target.id === 'bai-filter-source') {
        state.filter.source = e.target.value;
        state.filter.page = 1;
        renderContent();
        return;
      }

      // 3. 每页条数下拉选择
      if (e.target.id === 'bai-filter-pagesize') {
        state.filter.pageSize = Number(e.target.value) || 50;
        state.filter.page = 1;
        renderContent();
        return;
      }

      // 4. 起始时间选择
      if (e.target.id === 'bai-filter-start') {
        state.filter.startDateTime = e.target.value;
        state.filter.preset = 'custom';
        state.activeTab = 'custom';
        state.filter.page = 1;
        renderContent();
        return;
      }

      // 5. 结束时间选择
      if (e.target.id === 'bai-filter-end') {
        state.filter.endDateTime = e.target.value;
        state.filter.preset = 'custom';
        state.activeTab = 'custom';
        state.filter.page = 1;
        renderContent();
        return;
      }
    });

    overlay.addEventListener('input', (e) => {
      // 关键字搜索框（输入防抖并保持光标）
      if (e.target.id === 'bai-filter-search') {
        const val = e.target.value;
        state.filter.searchKey = val;
        state.filter.page = 1;
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          const cursor = e.target.selectionStart;
          renderContent();
          const searchInput = overlay.querySelector('#bai-filter-search');
          if (searchInput) {
            searchInput.focus();
            try {
              searchInput.setSelectionRange(cursor, cursor);
            } catch (_) {}
          }
        }, 220);
      }
    });
  }

  async function startSync(isFullSync = false) {
    if (state.loading) return;
    state.loading = true;

    const loadingBar = document.querySelector('#bai-stat-loading-bar');
    const syncBtn = document.querySelector('#bai-stat-sync') || document.querySelector('[data-action="sync"]');
    const fullBtn = document.querySelector('#bai-stat-full-refresh') || document.querySelector('[data-action="full-refresh"]');
    const clearBtn = document.querySelector('#bai-stat-clear') || document.querySelector('[data-action="clear"]');
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
    const topBarEl = document.querySelector('#bai-stat-top-bar');
    const filterContainerEl = document.querySelector('#bai-stat-filter-container');
    const activeFilterBarWrapper = document.querySelector('#bai-stat-active-filter-bar-wrapper');
    if (!container || !topBarEl || !filterContainerEl) return;

    if (state.loading && state.allRecords.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 50px; color: #8c8c8c;">
          <div style="font-size: 32px; margin-bottom: 12px;">⏳</div>
          <div style="font-size: 15px; font-weight: 500;">正在从官方接口抓取用量记录并建立本地缓存...</div>
        </div>
      `;
      return;
    }

    if (state.allRecords.length === 0) {
      topBarEl.innerHTML = '';
      filterContainerEl.innerHTML = '';
      if (activeFilterBarWrapper) activeFilterBarWrapper.innerHTML = '';
      container.innerHTML = `
        <div style="text-align:center; padding: 50px; color: #8c8c8c;">
          <div style="font-size: 32px; margin-bottom: 12px;">📭</div>
          <div style="font-size: 15px; font-weight: 500;">暂无用量缓存，点击下方“增量同步”或“全量重抓”开始分析。</div>
        </div>
      `;
      return;
    }

    // 全局筛选与数据计算
    const { filteredRecords, totals, models, rangeDesc } = getFilteredData();
    const filter = state.filter;
    const hasExtra = hasActiveExtraFilters();

    // 1. 渲染顶部栏 (Top Bar)
    topBarEl.innerHTML = `
      <div class="bai-stat-tabs">
        <button class="bai-stat-tab-btn ${filter.preset === 'today' ? 'active' : ''}" data-tab="today">今天</button>
        <button class="bai-stat-tab-btn ${filter.preset === 'thisWeek' ? 'active' : ''}" data-tab="thisWeek">本周</button>
        <button class="bai-stat-tab-btn ${filter.preset === 'last24h' ? 'active' : ''}" data-tab="last24h">最近 24 小时</button>
        <button class="bai-stat-tab-btn ${filter.preset === 'last7d' ? 'active' : ''}" data-tab="last7d">最近 7 天</button>
        <button class="bai-stat-tab-btn ${filter.preset === 'all' ? 'active' : ''}" data-tab="all">全部历史</button>
        ${filter.preset === 'custom' ? `<button class="bai-stat-tab-btn active" data-tab="custom">自定义时间</button>` : ''}
        ${filter.preset === 'yesterday' ? `<button class="bai-stat-tab-btn active" data-tab="yesterday">昨天</button>` : ''}
        ${filter.preset === 'last3d' ? `<button class="bai-stat-tab-btn active" data-tab="last3d">近 3 天</button>` : ''}
      </div>
      <div class="bai-stat-top-right">
        <button class="bai-stat-filter-toggle-btn ${state.filterExpanded ? 'active' : ''} ${hasExtra ? 'has-filter' : ''}" id="bai-filter-toggle" title="展开/收起全局数据多维筛选器">
          <span>筛选 ${hasExtra ? '<span class="bai-stat-filter-badge-dot"></span>' : ''}</span>
          <span style="font-size: 10px; margin-left: 2px;">${state.filterExpanded ? '▲' : '▼'}</span>
        </button>
        <div class="bai-stat-view-switch">
          <button class="bai-stat-view-btn ${state.activeView === 'aggregate' ? 'active' : ''}" data-view="aggregate">模型聚合</button>
          <button class="bai-stat-view-btn ${state.activeView === 'details' ? 'active' : ''}" data-view="details">调用明细</button>
        </div>
      </div>
    `;

    // 2. 渲染筛选面板 (Filter Container, 默认隐藏)
    filterContainerEl.className = `bai-stat-filter-container ${state.filterExpanded ? 'expanded' : 'collapsed'}`;

    // 提取模型下拉选项
    const modelSet = new Set();
    state.allRecords.forEach(r => {
      if (r.model) modelSet.add(r.model);
    });
    const sortedModels = Array.from(modelSet).sort();
    let modelOptionsHtml = '';
    sortedModels.forEach(m => {
      modelOptionsHtml += `<option value="${escapeHtml(m)}" ${filter.model === m ? 'selected' : ''}>${escapeHtml(m)}</option>`;
    });

    filterContainerEl.innerHTML = `
      <div class="bai-stat-filter-card">
        <!-- 第一行：快捷时间范围预设与自定义日期时间输入 -->
        <div class="bai-stat-filter-row">
          <div class="bai-stat-filter-group">
            <span class="bai-stat-filter-label">时间预设:</span>
            <div class="bai-stat-preset-btns">
              <button class="bai-stat-filter-btn ${filter.preset === 'today' ? 'active' : ''}" data-filter-preset="today">今天</button>
              <button class="bai-stat-filter-btn ${filter.preset === 'yesterday' ? 'active' : ''}" data-filter-preset="yesterday">昨天</button>
              <button class="bai-stat-filter-btn ${filter.preset === 'thisWeek' ? 'active' : ''}" data-filter-preset="thisWeek">本周</button>
              <button class="bai-stat-filter-btn ${filter.preset === 'last24h' ? 'active' : ''}" data-filter-preset="last24h">近 24h</button>
              <button class="bai-stat-filter-btn ${filter.preset === 'last3d' ? 'active' : ''}" data-filter-preset="last3d">近 3 天</button>
              <button class="bai-stat-filter-btn ${filter.preset === 'last7d' ? 'active' : ''}" data-filter-preset="last7d">近 7 天</button>
              <button class="bai-stat-filter-btn ${filter.preset === 'all' ? 'active' : ''}" data-filter-preset="all">全部历史</button>
              <button class="bai-stat-filter-btn ${filter.preset === 'custom' ? 'active' : ''}" data-filter-preset="custom">自定义时间</button>
            </div>
          </div>

          <!-- 自定义日期时间选择器 -->
          <div class="bai-stat-filter-group" style="display: flex;">
            <span class="bai-stat-filter-label">自定义:</span>
            <input type="datetime-local" class="bai-stat-input bai-stat-datetime" id="bai-filter-start" value="${filter.startDateTime || ''}" title="起始日期与时间">
            <span class="bai-stat-filter-sep">至</span>
            <input type="datetime-local" class="bai-stat-input bai-stat-datetime" id="bai-filter-end" value="${filter.endDateTime || ''}" title="结束日期与时间">
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-filter-apply-custom" style="padding: 4px 10px; font-size: 11px;">应用时间</button>
          </div>
        </div>

        <!-- 第二行：模型、渠道、关键字模糊搜索与重置/收起 -->
        <div class="bai-stat-filter-row">
          <div class="bai-stat-filter-group">
            <span class="bai-stat-filter-label">模型:</span>
            <select class="bai-stat-select" id="bai-filter-model" style="min-width: 140px;">
              <option value="all" ${filter.model === 'all' ? 'selected' : ''}>全部模型 (All)</option>
              ${modelOptionsHtml}
            </select>
          </div>

          <div class="bai-stat-filter-group">
            <span class="bai-stat-filter-label">渠道:</span>
            <select class="bai-stat-select" id="bai-filter-source">
              <option value="all" ${filter.source === 'all' ? 'selected' : ''}>全部渠道</option>
              <option value="api" ${filter.source === 'api' ? 'selected' : ''}>API 密钥</option>
              <option value="web" ${filter.source === 'web' ? 'selected' : ''}>Web 网页</option>
            </select>
          </div>

          <div class="bai-stat-filter-group" style="flex: 1; min-width: 190px;">
            <input type="text" class="bai-stat-input" id="bai-filter-search" style="width: 100%;" placeholder="搜索 Request ID / 模型 / ID..." value="${escapeHtml(filter.searchKey || '')}">
          </div>

          <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-filter-reset" title="重置所有筛选条件" style="padding: 4px 10px; font-size: 12px;">
            重置筛选
          </button>
          <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-filter-collapse-btn" title="收起筛选面板" style="padding: 4px 10px; font-size: 12px;">
            收起 ▲
          </button>
        </div>
      </div>
    `;

    // 3. 渲染筛选激活状态提示条 (当筛选面板收起且有生效筛选时展示)
    if (activeFilterBarWrapper) {
      if (!state.filterExpanded && hasExtra) {
        activeFilterBarWrapper.innerHTML = `
          <div class="bai-stat-active-filter-bar">
            <span>已应用全局筛选：<strong>${escapeHtml(rangeDesc)}</strong> ${filter.model !== 'all' ? `• 模型: <strong>${escapeHtml(filter.model)}</strong>` : ''} ${filter.source !== 'all' ? `• 渠道: <strong>${filter.source.toUpperCase()}</strong>` : ''} ${filter.searchKey ? `• 搜索: "<strong>${escapeHtml(filter.searchKey)}</strong>"` : ''} (匹配 <strong>${filteredRecords.length.toLocaleString()}</strong> 条)</span>
            <div style="display:flex; gap:6px;">
              <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-filter-open-btn" style="padding: 2px 8px; font-size: 11px;">修改筛选</button>
              <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-filter-reset-compact" style="padding: 2px 8px; font-size: 11px;">重置</button>
            </div>
          </div>
        `;
      } else {
        activeFilterBarWrapper.innerHTML = '';
      }
    }

    // 4. 计算衍生总计指标
    const cacheHitRate = totals.input > 0 ? ((totals.cacheRead / totals.input) * 100).toFixed(1) : '0.0';
    const avgDuration = totals.calls > 0 ? (totals.totalDuration / totals.calls).toFixed(2) : '0.00';
    const avgTps = totals.totalDuration > 0 ? Math.round(totals.output / totals.totalDuration) : 0;

    // 5. 8 宫格指标卡片 (实时反映全局筛选结果)
    const cardsHtml = `
      <div class="bai-stat-cards-grid">
        <!-- 1. 总用量 -->
        <div class="bai-stat-card">
          <div class="bai-stat-card-label">总 Token 用量 <span>Total</span></div>
          <div class="bai-stat-card-val">${totals.total.toLocaleString()}</div>
          <div class="bai-stat-card-sub">均次: ${totals.calls > 0 ? Math.round(totals.total / totals.calls).toLocaleString() : 0} Tokens</div>
        </div>

        <!-- 2. Prompt 输入 -->
        <div class="bai-stat-card card-prompt">
          <div class="bai-stat-card-label">Prompt (输入) <span>Input</span></div>
          <div class="bai-stat-card-val">${totals.input.toLocaleString()}</div>
          <div class="bai-stat-card-sub">${totals.total > 0 ? ((totals.input / totals.total) * 100).toFixed(1) + '% 占总用量' : '0%'}</div>
        </div>

        <!-- 3. Completion 输出 -->
        <div class="bai-stat-card card-completion">
          <div class="bai-stat-card-label">Completion (输出) <span>Output</span></div>
          <div class="bai-stat-card-val">${totals.output.toLocaleString()}</div>
          <div class="bai-stat-card-sub">${totals.total > 0 ? ((totals.output / totals.total) * 100).toFixed(1) + '% 占总用量' : '0%'}</div>
        </div>

        <!-- 4. 缓存命中 -->
        <div class="bai-stat-card card-cache-read">
          <div class="bai-stat-card-label">缓存命中 <span>Cache Read</span></div>
          <div class="bai-stat-card-val">${totals.cacheRead.toLocaleString()}</div>
          <div class="bai-stat-card-sub">命中率: <span class="bai-stat-card-highlight">${cacheHitRate}%</span> (占输入)</div>
        </div>

        <!-- 5. 缓存创建 -->
        <div class="bai-stat-card card-cache-write">
          <div class="bai-stat-card-label">缓存写入 <span>Cache Create</span></div>
          <div class="bai-stat-card-val">${totals.cacheCreation.toLocaleString()}</div>
          <div class="bai-stat-card-sub">5m: ${totals.cache5m.toLocaleString()} | 1h: ${totals.cache1h.toLocaleString()}</div>
        </div>

        <!-- 6. 平均响应耗时 -->
        <div class="bai-stat-card card-latency">
          <div class="bai-stat-card-label">平均耗时 <span>Latency</span></div>
          <div class="bai-stat-card-val">${avgDuration} <span style="font-size:12px; font-weight:normal; color:#8c8c8c;">秒/次</span></div>
          <div class="bai-stat-card-sub">累计总耗时: ${(totals.totalDuration).toFixed(1)} 秒</div>
        </div>

        <!-- 7. 生成速度 TPS -->
        <div class="bai-stat-card card-tps">
          <div class="bai-stat-card-label">生成速度 <span>Throughput</span></div>
          <div class="bai-stat-card-val">${avgTps.toLocaleString()} <span style="font-size:12px; font-weight:normal; color:#8c8c8c;">T/s</span></div>
          <div class="bai-stat-card-sub">输出 Token / 耗时秒</div>
        </div>

        <!-- 8. 调用与联网搜索 -->
        <div class="bai-stat-card card-calls">
          <div class="bai-stat-card-label">调用与搜索 <span>Calls</span></div>
          <div class="bai-stat-card-val">${totals.calls.toLocaleString()} <span style="font-size:12px; font-weight:normal; color:#8c8c8c;">次</span></div>
          <div class="bai-stat-card-sub">搜索: ${totals.webSearches} 次 | API:${totals.sourceApi} Web:${totals.sourceWeb}</div>
        </div>
      </div>
    `;

    // 6. 视图渲染：模型聚合 vs 调用明细
    let mainViewHtml = '';

    if (state.activeView === 'aggregate') {
      const modelList = Object.values(models).sort((a, b) => b.total - a.total);
      let tableRowsHtml = '';

      if (modelList.length === 0) {
        tableRowsHtml = `
          <tr>
            <td colspan="11" style="text-align:center; padding: 36px 20px; color:#8c8c8c;">
              <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
              <div style="font-size: 14px; font-weight: 500;">当前筛选范围内无调用记录</div>
              <div style="font-size: 12px; margin-top: 4px; color: #a8a8a8;">请尝试调整筛选时间、模型或点击「重置筛选」</div>
            </td>
          </tr>
        `;
      } else {
        modelList.forEach((m, idx) => {
          const percent = totals.total > 0 ? ((m.total / totals.total) * 100).toFixed(1) : '0.0';
          const modelHitRate = m.input > 0 ? ((m.cacheRead / m.input) * 100).toFixed(1) : '0.0';
          const modelAvgDur = m.calls > 0 ? (m.totalDuration / m.calls).toFixed(2) : '0.00';
          const modelTps = m.totalDuration > 0 ? Math.round(m.output / m.totalDuration) : 0;

          tableRowsHtml += `
            <tr>
              <td style="font-weight: 600; color: #1f1f1f;">
                <div style="display:flex; align-items:center; gap: 8px;">
                  <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${MODEL_COLORS[idx % MODEL_COLORS.length]};"></span>
                  <span>${escapeHtml(m.model)}</span>
                </div>
              </td>
              <td>${m.calls.toLocaleString()}</td>
              <td style="color: #52c41a; font-family: monospace; font-weight: 600;">${m.input.toLocaleString()}</td>
              <td style="color: #fa8c16; font-family: monospace; font-weight: 600;">${m.output.toLocaleString()}</td>
              <td style="color: #13c2c2; font-family: monospace; font-weight: 600;">
                ${m.cacheRead.toLocaleString()}
                <span style="font-size: 10px; color: #8c8c8c; font-weight: normal;">(${modelHitRate}%)</span>
              </td>
              <td style="color: #2f54eb; font-family: monospace;">${m.cacheCreation.toLocaleString()}</td>
              <td style="color: #1677ff; font-family: monospace; font-weight: 700;">${m.total.toLocaleString()}</td>
              <td style="width: 100px;">
                <div style="font-size: 10px; color:#8c8c8c; display:flex; justify-content:space-between;">
                  <span>${percent}%</span>
                </div>
                <div class="bai-stat-progress-bg">
                  <div class="bai-stat-progress-bar" style="width: ${percent}%;"></div>
                </div>
              </td>
              <td>${modelAvgDur}s</td>
              <td>${modelTps > 0 ? `${modelTps} T/s` : '-'}</td>
              <td>${m.webSearches > 0 ? `🌐 ${m.webSearches}` : '0'}</td>
            </tr>
          `;
        });
      }

      mainViewHtml = `
        <div class="bai-stat-table-wrapper">
          <table class="bai-stat-table">
            <thead>
              <tr>
                <th>模型名称</th>
                <th>调用次数</th>
                <th>Prompt (输入)</th>
                <th>Completion (输出)</th>
                <th>缓存命中</th>
                <th>缓存写入</th>
                <th>Total (合计)</th>
                <th>用量占比</th>
                <th>平均耗时</th>
                <th>生成速度</th>
                <th>联网搜索</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      `;
    } else {
      // 明细列表分页与展示
      const pageSize = filter.pageSize || 50;
      const totalCount = filteredRecords.length;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;
      const currentPage = Math.min(Math.max(1, filter.page || 1), totalPages);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalCount);
      const pageRecords = filteredRecords.slice(startIndex, endIndex);

      const filterSummaryHtml = `
        <div class="bai-stat-detail-summary">
          <div class="bai-stat-detail-summary-metrics">
            <span>📌 当前范围: <strong>${escapeHtml(rangeDesc)}</strong></span>
            <span>• 筛选出 <strong>${totalCount.toLocaleString()}</strong> 条记录</span>
            <span>• 总用量: <strong>${totals.total.toLocaleString()}</strong> Tokens</span>
            <span>(输入: ${totals.input.toLocaleString()} / 输出: ${totals.output.toLocaleString()})</span>
            <span>• 缓存命中: <strong>${totals.cacheRead.toLocaleString()}</strong></span>
            <span>• 累计耗时: <strong>${totals.totalDuration.toFixed(1)}s</strong></span>
          </div>
          ${totals.points > 0 ? `<div>🪙 消耗点数: <strong>${Number(totals.points.toFixed(4))}</strong></div>` : ''}
        </div>
      `;

      let detailRowsHtml = '';

      if (pageRecords.length === 0) {
        detailRowsHtml = `
          <tr>
            <td colspan="11" style="text-align:center; padding: 36px 20px; color:#8c8c8c;">
              <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
              <div style="font-size: 14px; font-weight: 500;">未找到符合筛选条件的调用明细</div>
              <div style="font-size: 12px; margin-top: 4px; color: #a8a8a8;">请尝试调整筛选时间、模型或点击「重置筛选」</div>
            </td>
          </tr>
        `;
      } else {
        pageRecords.forEach((r, idx) => {
          const recordKey = getRecordKey(r);
          const isExpanded = state.expandedRecordIds.has(recordKey);
          const cacheTokens = r.cache_tokens || {};
          const cacheRead = Number(cacheTokens.cache_read_input_tokens) || 0;
          const cacheCreation = Number(cacheTokens.cache_creation_input_tokens) || 0;
          const duration = Number(r.duration_sec) || (r.duration_ms ? (r.duration_ms / 1000).toFixed(2) : 0);
          const source = (r.source_type || r.source || 'api').toLowerCase();

          detailRowsHtml += `
            <tr>
              <td style="color: #595959; white-space: nowrap; font-family: monospace;">${formatDateTime(r.created_at)}</td>
              <td style="font-weight: 600; color: #1f1f1f;">${escapeHtml(r.model || 'unknown')}</td>
              <td>
                <span class="bai-stat-tag ${source === 'web' ? 'bai-stat-tag-web' : 'bai-stat-tag-api'}">
                  ${source.toUpperCase()}
                </span>
              </td>
              <td style="color: #52c41a; font-family: monospace;">${(Number(r.input_tokens) || 0).toLocaleString()}</td>
              <td style="color: #fa8c16; font-family: monospace;">${(Number(r.output_tokens) || 0).toLocaleString()}</td>
              <td style="color: #13c2c2; font-family: monospace;">${cacheRead > 0 ? cacheRead.toLocaleString() : '-'}</td>
              <td style="color: #2f54eb; font-family: monospace;">${cacheCreation > 0 ? cacheCreation.toLocaleString() : '-'}</td>
              <td style="font-weight: 700; color: #1677ff; font-family: monospace;">${(Number(r.total_tokens) || 0).toLocaleString()}</td>
              <td>${duration ? `${duration}s` : '-'}</td>
              <td>${r.web_search_count > 0 ? `🌐 ${r.web_search_count}` : '0'}</td>
              <td style="white-space: nowrap;">
                <button class="bai-stat-copy-btn bai-stat-view-raw-btn" data-record-key="${recordKey}" title="查看完整 JSON 原始字段">
                  ${isExpanded ? '收起' : '详情'}
                </button>
              </td>
            </tr>
            ${isExpanded ? `
              <tr>
                <td colspan="11" style="background: #f9f9f9; padding: 12px 16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                    <span style="font-weight:600; font-size:12px; color:#595959;">Request ID: ${escapeHtml(r.request_id || r.id || 'N/A')}</span>
                    <button class="bai-stat-copy-btn bai-stat-copy-raw-btn" data-record-key="${recordKey}">复制 JSON</button>
                  </div>
                  <pre class="bai-stat-raw-detail">${escapeHtml(JSON.stringify(r, null, 2))}</pre>
                </td>
              </tr>
            ` : ''}
          `;
        });
      }

      const paginationHtml = `
        <div class="bai-stat-pagination">
          <div class="bai-stat-page-info">
            显示第 <strong>${totalCount > 0 ? startIndex + 1 : 0}</strong> - <strong>${endIndex}</strong> 条，共 <strong>${totalCount.toLocaleString()}</strong> 条
          </div>
          <div class="bai-stat-page-controls">
            <select class="bai-stat-select" id="bai-filter-pagesize" style="height: 28px; padding: 2px 6px;">
              <option value="20" ${pageSize === 20 ? 'selected' : ''}>20 条/页</option>
              <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 条/页</option>
              <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 条/页</option>
              <option value="200" ${pageSize === 200 ? 'selected' : ''}>200 条/页</option>
            </select>
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-page-prev" ${currentPage <= 1 ? 'disabled' : ''} style="padding: 3px 8px; font-size: 11px;">上一页</button>
            <span class="bai-stat-page-num">${currentPage} / ${totalPages}</span>
            <button class="bai-stat-btn bai-stat-btn-secondary" id="bai-page-next" ${currentPage >= totalPages ? 'disabled' : ''} style="padding: 3px 8px; font-size: 11px;">下一页</button>
          </div>
        </div>
      `;

      mainViewHtml = `
        ${filterSummaryHtml}
        <div class="bai-stat-table-wrapper">
          <table class="bai-stat-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>模型</th>
                <th>渠道</th>
                <th>Prompt (输入)</th>
                <th>Completion (输出)</th>
                <th>缓存命中</th>
                <th>缓存写入</th>
                <th>Total</th>
                <th>耗时</th>
                <th>搜索</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${detailRowsHtml}
            </tbody>
          </table>
        </div>
        ${paginationHtml}
      `;
    }

    container.innerHTML = cardsHtml + mainViewHtml;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function csvEscape(val) {
    const str = String(val === null || val === undefined ? '' : val);
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

    const timestamp = new Date().toISOString().slice(0, 10);
    const { filteredRecords, totals, models, rangeDesc } = getFilteredData();
    const f = state.filter;

    const filterDetails = [];
    if (f.model !== 'all') filterDetails.push(`模型: ${f.model}`);
    if (f.source !== 'all') filterDetails.push(`渠道: ${f.source.toUpperCase()}`);
    if (f.searchKey) filterDetails.push(`搜索: "${f.searchKey}"`);
    const scopeDesc = `时间范围: ${rangeDesc}${filterDetails.length > 0 ? ` | ${filterDetails.join(', ')}` : ''}`;

    if (format === 'json') {
      const exportPayload = {
        exportTime: new Date().toISOString(),
        viewMode: state.activeView,
        scope: scopeDesc,
        totals: totals,
        models: models,
        records: filteredRecords
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `bai_token_stats_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else if (format === 'csv') {
      const hitRate = totals.input > 0 ? ((totals.cacheRead / totals.input) * 100).toFixed(2) + '%' : '0.00%';
      const avgDur = totals.calls > 0 ? (totals.totalDuration / totals.calls).toFixed(2) : '0.00';
      const avgTps = totals.totalDuration > 0 ? Math.round(totals.output / totals.totalDuration) : 0;

      const rows = [
        ['【统计维度与筛选范围】', scopeDesc],
        ['总调用次数', totals.calls],
        ['Prompt 输入 Token', totals.input],
        ['Completion 输出 Token', totals.output],
        ['⚡ 缓存命中 Token (Cache Read)', totals.cacheRead],
        ['⚡ 缓存命中率 (Cache Hit Rate)', hitRate],
        ['⚡ 缓存写入 Token (Cache Create)', totals.cacheCreation],
        ['⚡ 5分钟缓存创建 Token', totals.cache5m],
        ['⚡ 1小时缓存创建 Token', totals.cache1h],
        ['总合计 Token (Total)', totals.total],
        ['平均耗时 (秒)', avgDur],
        ['平均生成速度 (Tokens/s)', avgTps],
        ['联网搜索总次数', totals.webSearches],
        ['渠道分布 API 次数', totals.sourceApi],
        ['渠道分布 Web 次数', totals.sourceWeb],
        ['算力点数消耗', totals.points],
        []
      ];

      if (models && Object.keys(models).length > 0) {
        rows.push(['--- 各模型聚合统计 ---']);
        rows.push(['模型名称', '调用次数', 'Prompt(输入)', 'Completion(输出)', '缓存命中 Token', '缓存命中率', '缓存写入 Token', 'Total(合计)', '用量占比', '平均耗时(秒)', '生成速度(T/s)', '联网搜索次数', 'API调用数', 'Web调用数', '点数消耗']);
        Object.values(models).forEach(m => {
          const percent = totals.total > 0 ? ((m.total / totals.total) * 100).toFixed(2) + '%' : '0%';
          const mHitRate = m.input > 0 ? ((m.cacheRead / m.input) * 100).toFixed(2) + '%' : '0%';
          const mAvgDur = m.calls > 0 ? (m.totalDuration / m.calls).toFixed(2) : '0.00';
          const mTps = m.totalDuration > 0 ? Math.round(m.output / m.totalDuration) : 0;

          rows.push([
            m.model,
            m.calls,
            m.input,
            m.output,
            m.cacheRead,
            mHitRate,
            m.cacheCreation,
            m.total,
            percent,
            mAvgDur,
            mTps,
            m.webSearches,
            m.sourceApi,
            m.sourceWeb,
            m.points
          ]);
        });
        rows.push([]);
      }

      rows.push(['--- 调用明细清单 ---']);
      rows.push([
        '记录 ID',
        '时间 (created_at)',
        '模型 (model)',
        '渠道 (source)',
        'Request ID',
        'Prompt(输入)',
        'Completion(输出)',
        '缓存命中 Token',
        '缓存写入 Token',
        'Total 合计',
        '耗时 (秒)',
        '联网搜索次数',
        '消耗点数'
      ]);

      filteredRecords.forEach(r => {
        const cacheTokens = r.cache_tokens || {};
        const cRead = Number(cacheTokens.cache_read_input_tokens) || 0;
        const cCreate = Number(cacheTokens.cache_creation_input_tokens) || 0;
        const dur = Number(r.duration_sec) || (r.duration_ms ? (r.duration_ms / 1000).toFixed(2) : 0);
        const src = r.source_type || r.source || 'api';

        rows.push([
          r.id || '',
          r.created_at || '',
          r.model || '',
          src,
          r.request_id || '',
          Number(r.input_tokens) || 0,
          Number(r.output_tokens) || 0,
          cRead,
          cCreate,
          Number(r.total_tokens) || 0,
          dur,
          Number(r.web_search_count) || 0,
          Number(r.cost_points) || 0
        ]);
      });

      const csvContent = "\uFEFF" + rows.map(e => e.map(csvEscape).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `bai_token_stats_${timestamp}.csv`);
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
