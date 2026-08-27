const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function run() {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Launch browser with high DPR for crisp Retina screenshots
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch (e2) {
      browser = await chromium.launch({ headless: true });
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2, // 2x Retina resolution
    colorScheme: 'light',
  });

  const page = await context.newPage();

  // Generate realistic mock records across today, yesterday, and earlier this week
  const now = new Date();
  const makeTime = (hoursAgo, minutesAgo = 0) => {
    const d = new Date(now.getTime() - (hoursAgo * 3600 + minutesAgo * 60) * 1000);
    return d.toISOString();
  };

  const mockRecords = [
    {
      id: "rec_9821034",
      request_id: "req_01JGF89Q7K12A34B",
      created_at: makeTime(0, 12),
      model: "claude-3-7-sonnet-20250219",
      source_type: "api",
      input_tokens: 38450,
      output_tokens: 4210,
      total_tokens: 42660,
      cost_points: 0.168,
      cache_tokens: {
        cache_read_input_tokens: 32000,
        cache_creation_input_tokens: 6450,
        cache_creation_5m_tokens: 6450,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 4.85,
      web_search_count: 0
    },
    {
      id: "rec_9821012",
      request_id: "req_01JGF78X9P56C78D",
      created_at: makeTime(0, 45),
      model: "claude-3-7-sonnet-20250219",
      source_type: "api",
      input_tokens: 41200,
      output_tokens: 2890,
      total_tokens: 44090,
      cost_points: 0.152,
      cache_tokens: {
        cache_read_input_tokens: 38500,
        cache_creation_input_tokens: 2700,
        cache_creation_5m_tokens: 2700,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 3.62,
      web_search_count: 0
    },
    {
      id: "rec_9820988",
      request_id: "req_01JGF65V2M78E90F",
      created_at: makeTime(1, 15),
      model: "gpt-4o",
      source_type: "web",
      input_tokens: 15600,
      output_tokens: 1450,
      total_tokens: 17050,
      cost_points: 0.048,
      cache_tokens: {
        cache_read_input_tokens: 10240,
        cache_creation_input_tokens: 5360,
        cache_creation_5m_tokens: 5360,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 2.15,
      web_search_count: 2
    },
    {
      id: "rec_9820950",
      request_id: "req_01JGF54T8K90G12H",
      created_at: makeTime(2, 30),
      model: "deepseek-reasoner",
      source_type: "api",
      input_tokens: 28400,
      output_tokens: 8640,
      total_tokens: 37040,
      cost_points: 0.082,
      cache_tokens: {
        cache_read_input_tokens: 22100,
        cache_creation_input_tokens: 6300,
        cache_creation_5m_tokens: 6300,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 14.20,
      web_search_count: 0
    },
    {
      id: "rec_9820921",
      request_id: "req_01JGF43R4H12I34J",
      created_at: makeTime(3, 10),
      model: "claude-3-5-sonnet-20241022",
      source_type: "api",
      input_tokens: 24500,
      output_tokens: 1980,
      total_tokens: 26480,
      cost_points: 0.088,
      cache_tokens: {
        cache_read_input_tokens: 19200,
        cache_creation_input_tokens: 5300,
        cache_creation_5m_tokens: 5300,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 2.78,
      web_search_count: 0
    },
    {
      id: "rec_9820890",
      request_id: "req_01JGF32P0F34K56L",
      created_at: makeTime(4, 25),
      model: "gemini-2.0-flash",
      source_type: "web",
      input_tokens: 18900,
      output_tokens: 2150,
      total_tokens: 21050,
      cost_points: 0.015,
      cache_tokens: {
        cache_read_input_tokens: 14000,
        cache_creation_input_tokens: 4900,
        cache_creation_5m_tokens: 4900,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 1.45,
      web_search_count: 1
    },
    {
      id: "rec_9820850",
      request_id: "req_01JGF21N6D56M78N",
      created_at: makeTime(5, 50),
      model: "o3-mini",
      source_type: "api",
      input_tokens: 32100,
      output_tokens: 5420,
      total_tokens: 37520,
      cost_points: 0.095,
      cache_tokens: {
        cache_read_input_tokens: 25600,
        cache_creation_input_tokens: 6500,
        cache_creation_5m_tokens: 6500,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 6.80,
      web_search_count: 0
    },
    {
      id: "rec_9820810",
      request_id: "req_01JGF10L2B78O90P",
      created_at: makeTime(8, 15),
      model: "deepseek-chat",
      source_type: "api",
      input_tokens: 19800,
      output_tokens: 1650,
      total_tokens: 21450,
      cost_points: 0.018,
      cache_tokens: {
        cache_read_input_tokens: 16200,
        cache_creation_input_tokens: 3600,
        cache_creation_5m_tokens: 3600,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 1.62,
      web_search_count: 0
    },
    {
      id: "rec_9820780",
      request_id: "req_01JGF09J8Z90Q12R",
      created_at: makeTime(10, 40),
      model: "claude-3-7-sonnet-20250219",
      source_type: "api",
      input_tokens: 52400,
      output_tokens: 3600,
      total_tokens: 56000,
      cost_points: 0.205,
      cache_tokens: {
        cache_read_input_tokens: 45000,
        cache_creation_input_tokens: 7400,
        cache_creation_5m_tokens: 7400,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 4.12,
      web_search_count: 0
    },
    {
      id: "rec_9820750",
      request_id: "req_01JGE98H4X12S34T",
      created_at: makeTime(14, 20),
      model: "gpt-4o",
      source_type: "api",
      input_tokens: 22300,
      output_tokens: 1890,
      total_tokens: 24190,
      cost_points: 0.065,
      cache_tokens: {
        cache_read_input_tokens: 17800,
        cache_creation_input_tokens: 4500,
        cache_creation_5m_tokens: 4500,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 2.45,
      web_search_count: 0
    },
    // Yesterday records
    {
      id: "rec_9820600",
      request_id: "req_01JGE87F0V34U56V",
      created_at: makeTime(26, 10),
      model: "claude-3-7-sonnet-20250219",
      source_type: "api",
      input_tokens: 48900,
      output_tokens: 3100,
      total_tokens: 52000,
      cost_points: 0.186,
      cache_tokens: {
        cache_read_input_tokens: 42000,
        cache_creation_input_tokens: 6900,
        cache_creation_5m_tokens: 6900,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 3.90,
      web_search_count: 0
    },
    {
      id: "rec_9820550",
      request_id: "req_01JGE76D6T56W78X",
      created_at: makeTime(28, 45),
      model: "deepseek-reasoner",
      source_type: "api",
      input_tokens: 35600,
      output_tokens: 9200,
      total_tokens: 44800,
      cost_points: 0.098,
      cache_tokens: {
        cache_read_input_tokens: 28000,
        cache_creation_input_tokens: 7600,
        cache_creation_5m_tokens: 7600,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 15.60,
      web_search_count: 0
    },
    // 2 days ago records
    {
      id: "rec_9820400",
      request_id: "req_01JGE65B2R78Y90Z",
      created_at: makeTime(52, 30),
      model: "claude-3-5-sonnet-20241022",
      source_type: "web",
      input_tokens: 28000,
      output_tokens: 2400,
      total_tokens: 30400,
      cost_points: 0.102,
      cache_tokens: {
        cache_read_input_tokens: 21500,
        cache_creation_input_tokens: 6500,
        cache_creation_5m_tokens: 6500,
        cache_creation_1h_tokens: 0
      },
      duration_sec: 3.10,
      web_search_count: 1
    }
  ];

  // Read the actual userscript content
  const userscriptPath = path.join(__dirname, 'bai_token_analytics.user.js');
  const userscriptCode = fs.readFileSync(userscriptPath, 'utf-8');

  // Build a sleek mock host page simulating chat.b.ai interface
  const hostHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>BAI Chat - AI Workspace</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .sidebar {
      width: 260px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 12px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 16px;
      color: #0f172a;
      padding: 8px 4px;
    }
    .logo-icon {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #1677ff, #0050b3);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 14px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
    }
    .nav-item.active {
      background: #eff6ff;
      color: #1677ff;
      font-weight: 600;
    }
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }
    .chat-header {
      height: 56px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }
    .chat-model-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .chat-messages {
      flex: 1;
      padding: 32px 100px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      overflow-y: auto;
      background: #fbfcfe;
    }
    .message {
      display: flex;
      gap: 14px;
      max-width: 840px;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .avatar-user { background: #e2e8f0; color: #475569; }
    .avatar-ai { background: linear-gradient(135deg, #1677ff, #0958d9); color: #fff; }
    .msg-content {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 14px;
      line-height: 1.6;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .chat-input-area {
      padding: 16px 100px 24px;
      background: #ffffff;
    }
    .input-box {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="logo">
      <div class="logo-icon">B</div>
      <span>BAI Platform</span>
    </div>
    <div class="nav-item active">💬 对话工作台</div>
    <div class="nav-item">⚡ API 密钥管理</div>
    <div class="nav-item">📊 用量与费用账单</div>
    <div class="nav-item">⚙️ 系统设置</div>
  </div>

  <div class="chat-container">
    <div class="chat-header">
      <div class="chat-model-badge">
        <span style="width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
        claude-3-7-sonnet-20250219 (Thinking Enabled)
      </div>
      <div style="font-size:12px; color:#64748b;">余额: 520.80 点数 | 延迟: 142ms</div>
    </div>

    <div class="chat-messages">
      <div class="message">
        <div class="avatar avatar-user">U</div>
        <div class="msg-content">
          请帮我分析一下大型语言模型（LLM）开启 Prompt Caching 对接口吞吐率和计算成本的具体收益。
        </div>
      </div>
      <div class="message">
        <div class="avatar avatar-ai">AI</div>
        <div class="msg-content">
          <strong>Prompt Caching（提示词缓存）的核心收益分析：</strong><br><br>
          1. <strong>显著降低延迟 (TTFT)</strong>：已缓存的 Token 无需重复计算注意力矩阵，首字生成时间降低 70%~90%；<br>
          2. <strong>极大幅度降低输入成本</strong>：命中缓存的输入 Token 费用通常仅为常规输入的 10%（减少 90% 成本消耗）；<br>
          3. <strong>提高系统整体吞吐量 (TPS)</strong>：释放计算显存与矩阵算力，服务可并发处理更多长文本推理任务。
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <div class="input-box">
        <span>输入消息或直接按 Enter 发送...</span>
        <span style="background:#1677ff; color:#fff; border-radius:6px; padding:4px 10px; font-size:12px;">发送 ↵</span>
      </div>
    </div>
  </div>

  <script>
    // Mock Greasemonkey storage
    const MOCK_STORAGE = {
      'bai_usage_records_v1': ${JSON.stringify(mockRecords)},
      'bai_last_sync_time_v1': ${Date.now() - 3 * 60 * 1000}
    };

    window.GM_getValue = function(key, defVal) {
      return MOCK_STORAGE[key] !== undefined ? MOCK_STORAGE[key] : defVal;
    };
    window.GM_setValue = function(key, val) {
      MOCK_STORAGE[key] = val;
    };
    window.GM_deleteValue = function(key) {
      delete MOCK_STORAGE[key];
    };
    window.GM_registerMenuCommand = function() {};
  </script>
</body>
</html>
  `;

  await page.setContent(hostHtml);

  // Inject the actual userscript
  await page.addScriptTag({ content: userscriptCode });
  await page.waitForTimeout(300);

  // 1. Screenshot of the closed state (Floating Capsule Button in page context)
  console.log('1. Capturing floating trigger button...');
  const triggerBtn = await page.$('#bai-stat-trigger-btn');
  if (triggerBtn) {
    await triggerBtn.screenshot({
      path: path.join(assetsDir, 'floating_trigger_button.png'),
    });
  }

  // 2. Click floating button to open the modal
  console.log('2. Opening modal and capturing full view preview...');
  await page.click('#bai-stat-trigger-btn');
  await page.waitForTimeout(400);

  // Capture Live Preview (Full page with popup overlay)
  await page.screenshot({
    path: path.join(assetsDir, 'userscript_live_preview.png'),
    fullPage: false
  });
  // Also copy to root for backwards compatibility with README preview
  fs.copyFileSync(
    path.join(assetsDir, 'userscript_live_preview.png'),
    path.join(__dirname, 'userscript_live_preview.png')
  );

  // 3. Capture modal closeup: Model Aggregate Report & 8 Metric Cards (Default view)
  console.log('3. Capturing model aggregate report view...');
  const modalEl = await page.$('#bai-stat-modal');
  if (modalEl) {
    await modalEl.screenshot({
      path: path.join(assetsDir, '01_model_aggregate_view.png')
    });
  }

  // 4. Capture Advanced Filter Panel (Expanded)
  console.log('4. Expanding filter panel and capturing filter view...');
  await page.click('#bai-filter-toggle');
  await page.waitForTimeout(300);
  if (modalEl) {
    await modalEl.screenshot({
      path: path.join(assetsDir, '02_advanced_filter_panel.png')
    });
  }

  // 5. Select a filter preset (e.g., thisWeek) and switch to Details View
  console.log('5. Switching to details view and expanding raw JSON...');
  // Collapse filter
  await page.click('#bai-filter-collapse-btn');
  await page.waitForTimeout(200);

  // Switch to details view
  await page.click('[data-view="details"]');
  await page.waitForTimeout(300);

  // Expand first detail row (Raw JSON)
  const detailButtons = await page.$$('.bai-stat-view-raw-btn');
  if (detailButtons.length > 0) {
    await detailButtons[0].click();
    await page.waitForTimeout(300);
  }

  if (modalEl) {
    await modalEl.screenshot({
      path: path.join(assetsDir, '03_call_details_and_raw_json.png')
    });
  }

  // 6. Capture with Active Filter Mini Banner
  console.log('6. Capturing active filter mini banner...');
  // Click "近 24 小时" tab or preset
  await page.click('[data-tab="last24h"]');
  await page.waitForTimeout(200);
  // Switch to aggregate view
  await page.click('[data-view="aggregate"]');
  await page.waitForTimeout(200);

  // Open filter, select a specific model "claude-3-7-sonnet-20250219", then collapse
  await page.click('#bai-filter-toggle');
  await page.waitForTimeout(200);
  await page.selectOption('#bai-filter-model', 'claude-3-7-sonnet-20250219');
  await page.waitForTimeout(200);
  await page.click('#bai-filter-collapse-btn');
  await page.waitForTimeout(200);

  if (modalEl) {
    await modalEl.screenshot({
      path: path.join(assetsDir, '04_active_filter_banner.png')
    });
  }

  await browser.close();
  console.log('All screenshots generated successfully!');
}

run().catch(err => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});
