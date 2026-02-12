# Neatoolkit Launch Day Plan — 2026-02-11

> **Status: LAUNCHED** — 2026-02-11 全部完成，neatoolkit.com 已正式上線。
> FB 貼文於 2026-02-12 發布。

## Overview

Neatoolkit 正式上線前的最後一哩路。三個 Agent 平行作業，無相互依賴。

**目標**：今天結束前 neatoolkit.com 可以正式對外、FB 發文宣傳。

---

## Agents

| Agent | 工具 | 負責範圍 |
|-------|------|---------|
| **Agent 1** | Claude Code (VS Code, Cockpit) | 規劃協調、FB 貼文、Daily Note、Azure CLI 操作、後端 API config、法律頁面、sitemap |
| **Agent 2** | Claude Code (VS Code, myneatoolkit) | 前端開發：首頁重設計、漢堡選單 |
| **Agent 3** | Human (Yu WenHao) | GSC 提交、最終驗證 |

---

## Agent 2 — 前端開發（Claude Code @ myneatoolkit）

### Task 2A: 首頁完整重設計 ✅ (Agent 2 完成)

**目標**：從樸素的列表頁升級為有品牌感、可擴展的首頁。

**現狀問題**：
- 無 Hero section，直接是「免費線上工具」標題
- 工具卡片純白底 + 文字，無圖示，無視覺區分
- 分類間沒有明確視覺分隔
- 不好擴展（新工具只能往下堆）

**設計規格**：

1. **Hero Section**
   - 品牌 tagline：「Free online tools that are actually free.」
   - Value props（3 點）：No watermark / No signup / 100% browser-side
   - 簡潔背景，不要花俏動畫

2. **工具分類展示**
   - 4 個分類：圖片工具、影片工具、文字工具、YouTube 工具
   - 每個分類一個 section，有 icon + 標題
   - 工具卡片加 icon（使用 Lucide icons）
   - Hover 效果：微妙的 shadow/scale 變化

3. **Data-Driven 架構**
   - 工具列表從 data array 驅動
   - 新工具只需加一筆資料（name, description, icon, href, category）
   - 不需要改 JSX 結構

4. **設計風格**
   - 對標 Linear / Notion — 乾淨、留白、精緻
   - 保持現有 cream/warm 色調
   - Typography：清晰的層次（h1 > h2 > card title > description）
   - Responsive：mobile 單欄、tablet 雙欄、desktop 雙欄或三欄

5. **i18n**
   - zh-TW + en 雙語
   - 更新 `messages/zh-TW.json` 和 `messages/en.json`

**完成方式**：Agent 2 實作，參考 [TinyWow.com](https://tinywow.com) 設計模式

**參考來源：TinyWow**
TinyWow 是一個成功的免費線上工具網站，首頁用「分類卡片 → 工具列表」的雙層架構。Agent 2 參考了它的資訊架構和視覺層次，但在配色和品牌識別上做了 Neatoolkit 自己的風格。

**Plan vs 實際：主要差異**

| 面向 | 原始 Plan | 實際實作（TinyWow-inspired） |
|------|----------|----------------------------|
| **首頁架構** | 4 個分類 section 各自展開工具 | 改為 TinyWow 式雙層：上方 4 張分類卡片（入口） + 下方全工具 grid |
| **分類卡片** | Plan 未提及獨立元件 | 新增 `CategoryCard.tsx`：含 icon、工具數量、featured tool 標籤、等高佈局 |
| **Hero highlight** | Plan 只說「品牌 tagline」 | 加入手繪 SVG 筆刷底線（#d3050b 紅，多輪迭代調校） |
| **色彩系統** | 「保持現有 cream/warm 色調」 | 新增自訂分類色彩 CSS tokens，取代 Tailwind 預設色（UI/UX Pro Max 研究後選定） |
| **Header branding** | Plan 未提及 | 參考 TinyWow "by Jenni" → 加入 "by **Wenhao**" 靠右 + 粗體 |
| **SEO 排序** | Plan 未提及 | 工具分類按搜尋量排序（image > video > youtube > text） |
| **Icon 系統** | 「使用 Lucide icons」 | 新增 `LucideIcon.tsx` 動態載入器，支援從 data string 渲染任意 Lucide icon |
| **背景裝飾** | 「簡潔背景」 | 新增 `HeroDecorations.tsx`，使用分類色彩的柔和圓形裝飾 |
| **工具預設順序** | Plan 未提及 | 圖片工具改為 AI 去背優先（高搜尋量），ImageToolsNav tab 順序同步調整 |

**額外優化（Plan 未涵蓋）**：
- 使用 UI/UX Pro Max skill 研究配色、字體、UX 最佳實踐
- 經 ~8 輪迭代調校 SVG 筆刷底線（粗細、位置、色彩飽和度）
- 字體大小全面調校，確保與各工具頁內文一致
- Section 間距統一（Hero pb / AllTools pt 對齊）
- JSON-LD WebApplication schema 加入 SEO 結構化資料

**修改/新增檔案**：
- ✅ `src/app/[locale]/page.tsx` — 完整重寫首頁（Hero + CategoryCards + AllTools grid）
- ✅ `src/lib/tools.ts` — 工具資料定義 + 自訂分類色彩 tokens
- ✅ `src/components/home/CategoryCard.tsx` — 分類卡片元件（等高、featured tool 標籤）
- ✅ `src/components/home/ToolCard.tsx` — 工具卡片元件（icon + hover 效果）
- ✅ `src/components/home/HeroDecorations.tsx` — Hero 背景裝飾（使用分類色彩）
- ✅ `src/components/home/LucideIcon.tsx` — 動態 Lucide icon 載入器
- ✅ `src/app/globals.css` — 自訂 CSS 變數（--cat-image/video/youtube/text）+ @theme inline tokens
- ✅ `src/components/layout/Header.tsx` — "by **Wenhao**" 靠右 + 粗體
- ✅ `src/components/layout/ImageToolsNav.tsx` — AI 去背為預設（重新排序）
- ✅ `messages/zh-TW.json` — 中文翻譯
- ✅ `messages/en.json` — 英文翻譯

**設計亮點**：
- Hero 「免費」文字下方有手繪 SVG 筆刷底線（#d3050b 紅色，opacity 0.75）
- 自訂柔和分類色：image #C2753A / video #C75461 / youtube #2A8F82 / text #7B5EA7
- 等高分類卡片（CSS Grid + flex），featured tool 標籤
- 字體大小經多次調校，與工具頁一致

**Commit**：`c80f995` feat: redesign homepage with TinyWow-inspired layout

**驗收標準**：
- [x] Hero section 有品牌感（SVG 手繪底線 + trust badges）
- [x] 工具卡片有 icon、hover 效果（Lucide icons + shadow/translate 動畫）
- [x] Mobile responsive（單欄 → 雙欄 → 三欄）
- [x] Data-driven（新增工具只改 `src/lib/tools.ts` 資料）
- [x] zh-TW + en 雙語正常

---

### Task 2B: 漢堡選單修復（Mobile Scroll）✅ (Agent 2 完成)

**目標**：Mobile 選單太長時可以滾動。

**現狀問題**：工具增加後，MobileNav 內容超出螢幕高度，無法滾動。

**修復方式**：
- `src/components/layout/MobileNav.tsx`
- 選單容器加 `overflow-y-auto` + `max-height: 100dvh`
- 確保底部的 LocaleSwitcher 可見

**完成方式**：Agent 2 在首頁重設計過程中一併修復

**Commit**：包含在 `c80f995` feat: redesign homepage with TinyWow-inspired layout

**驗收標準**：
- [x] Mobile 選單可滾動
- [x] 底部 locale switcher 可見
- [x] 展開/收合動畫正常

---

### Task 2C: 法律頁面（3 頁）✅ (Agent 1 完成)

**完成方式**：Agent 1 根據 homepage-v2-checklist 分工接手

**建立檔案**：
- ✅ `src/app/[locale]/about/page.tsx`
- ✅ `src/app/[locale]/privacy/page.tsx`
- ✅ `src/app/[locale]/terms/page.tsx`
- ✅ `src/components/layout/Footer.tsx` — `href: "#"` → `/about`, `/privacy`, `/terms`
- ✅ `src/app/sitemap.ts` — 動態產生所有頁面 sitemap

**i18n**：使用 Agent 2 已準備好的 `messages/zh-TW.json` 和 `messages/en.json` 翻譯

**驗收標準**：
- [x] 3 頁都可正常訪問（zh-TW + en）— build 通過
- [x] Footer 連結正確
- [x] 內容準確（使用既有 i18n translations，符合實際技術架構）

---

## Agent 3 — Human 手動操作

### Task 3A: Azure OpenAI Deployment 建立 ✅ (Agent 1 via Azure CLI)

**完成方式**：Agent 1 使用 Azure CLI 完成（非手動 Portal 操作）

**結果**：
- Resource: `neatoolkit-openai` @ `neatoolkit-rg` (Japan East)
- Endpoint: `https://neatoolkit-openai.openai.azure.com/`
- Deployment: `gpt-4.1-nano` (GlobalStandard, capacity 10)
- Rate Limits: 10 req/min, 10K tokens/min

---

### Task 3B: neatoolkit-api Config 更新 ✅ (Agent 1)

**完成方式**：Agent 1 直接修改程式碼 + Azure CLI 更新環境變數

**架構升級**：改為 config-based 雙 client 架構，支援 Azure OpenAI 和 OpenRouter 切換

- `LLM_PROVIDER` env var 決定用哪個 client（`azure` or `openrouter`）
- 切換只需改環境變數，程式碼零修改

**修改檔案**（neatoolkit-api）：
- `src/services/qwen_service.py` → 重新命名為 `src/services/llm_service.py`
- `src/config.py` — 新增 `LLM_PROVIDER`、`AZURE_OPENAI_*` 設定
- `src/routers/youtube.py` — import 改為 `llm_service`
- `.env.example` — 雙 provider 範例

**Container Apps 環境變數**：
- ✅ 新增: `LLM_PROVIDER=azure`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AI_SUMMARY_MODEL`, `AI_TRANSLATE_MODEL`
- ✅ 移除: `OPENROUTER_API_KEY`

**Commits**：
- `83e8b2d` refactor: switch LLM provider from OpenRouter to config-based dual client
- `398b5d3` chore: add startup log for active LLM provider

**驗證**：
- ✅ CI/CD pass
- ✅ Health check OK
- ✅ YouTube AI 摘要功能正常（Azure Monitor 確認 TotalCalls = 2）
- ✅ YouTube 字幕翻譯功能正常

---

### Task 3C: GSC 提交 ✅ (Agent 1 + Agent 3)

**目標**：讓 Google 開始收錄 neatoolkit.com。

**完成步驟**：
1. ✅ Agent 1 建立 `src/app/sitemap.ts`（動態產生所有頁面 URL）
2. ✅ Agent 1 加入 GSC HTML meta 驗證標記到 `layout.tsx`
3. ✅ Agent 3 在 GSC 驗證通過
4. ✅ Agent 3 提交 sitemap：`https://neatoolkit.com/sitemap.xml`

**Commit**：`a8e8d10` chore: add Google Search Console verification meta tag

---

### Task 3D: 最終驗證 ✅ (Agent 3 完成)

**依賴**：Agent 2 ✅ + Task 3A/3B ✅ 都已完成。

Checklist：
- [x] 首頁在 desktop + mobile 看起來正確
- [x] 漢堡選單可滾動
- [x] 法律頁面 3 頁都能訪問（zh-TW + en）
- [x] Footer 連結正確
- [x] YouTube AI 摘要功能正常（Azure OpenAI）
- [x] YouTube 字幕翻譯功能正常（Azure OpenAI）
- [x] GSC 已提交
- [x] 部署到 Vercel production

---

## Agent 1 — 規劃協調 + FB 貼文（Claude Code @ Cockpit）

### Task 1A: 規劃與協調（已完成）

- ✅ Daily Note 建立
- ✅ 分工計畫撰寫
- ✅ Chrome 書籤整理

### Task 1C: Azure OpenAI + 後端 API Config ✅

- ✅ Azure CLI 建立 `neatoolkit-openai` resource + `gpt-4.1-nano` deployment
- ✅ Config-based 雙 client 架構（Azure / OpenRouter 切換）
- ✅ `qwen_service.py` → `llm_service.py` 重新命名
- ✅ Container Apps 環境變數更新 + CI/CD 部署
- ✅ Azure Monitor 確認 requests 正確路由到 Azure OpenAI

### Task 1D: 法律頁面 + Sitemap ✅

- ✅ 建立 about/privacy/terms 三個頁面（使用既有 i18n）
- ✅ Footer href `#` → 實際路徑
- ✅ `src/app/sitemap.ts` 動態產生 sitemap（含所有工具 + 法律頁面）
- ✅ Build 驗證通過

### Task 1E: Analytics 設定 ✅ (Agent 1)

- ✅ GA4 tracking (`G-ZTE1LQFM2Q`) 加到 `layout.tsx`
- ✅ Umami 自架到 Azure（PostgreSQL Flexible Server `neatoolkit-pg` + Container App `umami`）
- ✅ Umami tracking 加到 `layout.tsx`（Website ID: `b660106e-893b-433a-b62e-8cda66940c23`）
- ✅ yu-wenhao.com 也切換到 Azure Umami（Website ID: `dd3449c5-95e2-4c5e-8f19-ec99000f9010`）
- ✅ Umami min-replicas 設為 0（省成本）

**Commits**：
- `8a7338e` feat: add GA4 and Umami analytics tracking
- `a8e8d10` chore: add Google Search Console verification meta tag
- `265ed58` chore: switch Umami analytics from Cloud to self-hosted Azure instance (personal-website)

**Umami Dashboard**：`https://umami.livelystone-ee11a8ed.japaneast.azurecontainerapps.io`

### Task 1B: FB 貼文 — Neatoolkit 上線發表 ✅ (2026-02-12 發布)

**依賴**：所有技術工作已完成，待明天排版測試後發文。

**角度**：Build in public — 「我做了一個免費工具站」

**內容方向**：
- 為什麼做 neatoolkit（市場上免費工具都是假免費）
- 做了什麼（9 個工具、4 大分類）
- 技術選擇（瀏覽器端處理、不上傳檔案）
- 品牌理念（有質感的免費工具）
- CTA：試試看 neatoolkit.com

**語言**：中文（FB 主要受眾）

**使用 /content skill 撰寫**

---

## Timeline

```
09:30  ✅ Agent 1: Chrome 書籤整理完成
09:40  ✅ Agent 1: Daily Planning 完成
10:00  ✅ Agent 1: 分工計畫完成
       → Agent 2 開始：首頁 mockup (Pencil MCP)
       → Agent 1 開始：Azure CLI 建 resource + deployment
         ↓（平行）
10:20  ✅ Agent 1: Azure OpenAI resource + gpt-4.1-nano deployment 完成
10:25  ✅ Agent 1: 後端 config-based 雙 client 架構完成
10:40  ✅ Agent 1: CI/CD 部署 + Azure Monitor 驗證通過
         ↓
       Agent 2: 首頁 V2 實作中...
         ↓（平行）
11:20  ✅ Agent 1: 法律頁面 (about/privacy/terms) 完成
11:25  ✅ Agent 1: sitemap.ts 完成
11:25  ✅ Agent 1: Footer href 更新完成
         ↓
       ✅ Agent 2: 首頁重設計完成（c80f995）
       ✅ Agent 2: 漢堡選單修復完成
         ↓
       ✅ Agent 1: GA4 + Umami 自架 (Azure) 完成
         ↓
       ✅ Agent 3: GSC 驗證 + Sitemap 提交完成
         ↓
       ✅ Agent 3: 最終驗證通過
         ↓
       ✅ Agent 1: yu-wenhao.com Umami 切換到 Azure
         ↓
       🚀 技術工作全部完成！
         ↓
       ✅ Agent 1: FB 貼文（2026-02-12 發布）
```

---

## 安全方案：JWT + Turnstile + Redis 直傳架構 ✅ (計畫外新增)

**問題**：Vercel Hobby 方案 body limit 4.5MB，影片/圖片上傳被擋 → 413。

**方案**：瀏覽器直接上傳到 Azure Container Apps，繞過 Vercel proxy。

**架構流程**：
```
使用者點「開始處理」→ Turnstile 驗證
    ↓
瀏覽器 → Vercel POST /api/upload-token（驗 Turnstile → 簽 JWT）
    ↓
瀏覽器 → Azure POST /api/{endpoint}（帶 JWT + FormData 大檔案）
    ↓
Azure 驗 JWT 簽名 + 過期 + action 匹配 + Redis 單次使用 → 處理
```

**保護層**：
- Turnstile：防 bot
- JWT 5 分鐘過期 + jti 唯一識別
- action 限制：壓縮 token 不能打去背
- Redis 單次使用：同一 token 用兩次 → 401
- CORS：只允許 neatoolkit.com
- Rate limit：slowapi 仍在

**影響範圍**：video/compress、video/to-gif、image/compress、image/remove-bg（4 個 upload endpoint）

**修改檔案**（neatoolkit 前端）：
- ✅ `src/app/api/upload-token/route.ts` — 新增，簽發 JWT
- ✅ `src/lib/api.ts` — 新增 `fetchDirectApi()`
- ✅ `src/components/shared/TurnstileWidget.tsx` — 修復 widget 重複 bug
- ✅ 4 個元件改用 `fetchDirectApi` + Turnstile（VideoCompress, VideoToGif, ImageCompress, RemoveBackground）
- ✅ 刪除 4 個舊 proxy routes（`src/app/api/video/compress/route.ts` 等）
- ✅ `src/lib/proxy.ts` — 刪除 `proxyFormData()`

**修改檔案**（neatoolkit-api 後端）：
- ✅ `src/utils/token_validator.py` — 新增，JWT 驗證 + Upstash Redis 單次使用
- ✅ `src/main.py` — APIKeyMiddleware 加 JWT 驗證路徑 + 修正 middleware 順序
- ✅ `src/config.py` — 新增 UPLOAD_SECRET, PUBLIC_UPLOAD_PATHS, Upstash 設定
- ✅ `src/services/ffmpeg_service.py` — ffmpeg SIGTERM 容錯
- ✅ `requirements.txt` — 新增 PyJWT

**Azure 設定**：
- ✅ resiliency policy：request timeout 240s → 600s
- ✅ 環境變數：UPLOAD_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

**Debug 歷程**（5 個 cascading bugs）：
1. CORS 錯誤 → Starlette middleware 順序反轉，CORSMiddleware 必須最後加
2. Token 驗證失敗 → Upstash REST API 用 path-based 語法非 query params
3. Token 驗證失敗 → UPLOAD_SECRET Vercel/Azure 不一致
4. Turnstile widget 重複 → useRef 修復 callback 穩定性
5. ffmpeg SIGTERM → Azure 240s timeout + 檢查 output file 存在即成功

**驗證結果**：
- ✅ 18.9MB 影片壓縮成功
- ✅ 93.9MB 影片壓縮成功（→ 6.2MB, -93%）
- ✅ 93.9MB 影片轉 GIF 成功
- ✅ 圖片壓縮 + AI 去背正常
- ✅ YouTube 工具不受影響（仍走 Vercel proxy + API key）

---

## Notes

- Agent 2 的三個任務（2A/2B/2C）彼此無依賴，可按任意順序做
- Agent 3 的 3B 依賴 3A（需要 Azure endpoint 才能改 config）
- Agent 3 的 3D 依賴所有其他任務完成
- Agent 1 的 1B 依賴 3D 驗證通過
- 如果 Azure deployment 有問題，可以先保持 OpenRouter，不影響其他任務上線
