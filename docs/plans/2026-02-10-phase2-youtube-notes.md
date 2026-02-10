# Phase 2: YouTube + AI Tools - Decision Notes

> Status: ✅ Implementation complete. Deployed to production.
> Date: 2026-02-10
> Completed: 2026-02-10

---

## Pages (3 pages, from original 2)

| Page | URL | Target Keywords (TW) | Monthly Search | KD |
|------|-----|----------------------|---------------|----|
| YouTube subtitle download | `/youtube/subtitle` | YouTube 字幕下載 | ~6,375 | 4 |
| YouTube AI summary | `/youtube/summary` | AI YouTube 摘要 | ~2,744 | 0 |
| YouTube subtitle translate | `/youtube/translate` | YouTube 字幕翻譯 | ~2,125 | 0 |

Split rationale: Each page targets a different search intent and keyword cluster. Tabs on the same page don't help SEO.

## Design Decisions (from mockup review)

### Shared across pages
- **YTToolsNav**: 3 tabs (字幕下載 | AI 摘要 | 字幕翻譯)
- **URL persistence**: Switching tabs preserves the pasted URL, resets results, re-enables action button
- **Timestamp toggle**: Default OFF on Page 1 & 3. Users want clean text, not subtitle files
- **Preview**: 3-5 lines only (confidence check), with "(共 XX 行)" indicator
- **Full view**: Modal (desktop) / Bottom sheet (mobile) for reading full content
- **Action buttons**: 查看完整[內容] (primary) | 複製[內容] | 下載 .txt
- **Disabled state**: After results appear, the submit button dims (opacity 0.5, $cream-300)
- **No "重新開始" button**: Users just paste a new URL
- **VideoInfoCard**: Shared component showing video title, channel, thumbnail (via YouTube oEmbed API)
- **WarningModal**: Shared amber-styled modal for 60-minute duration limit warnings

### Page 1: 字幕下載
- No AI, pure YouTube transcript extraction
- Language pills for selecting from available YouTube subtitles
- Output: clean transcript text (no SRT/VTT format)

### Page 2: AI 摘要
- Single output: structured summary with bullet points (Markdown rendered)
- No modal needed (summary is short enough)
- Only "複製摘要" button (no download needed)

### Page 3: 字幕翻譯
- Language selector pills: 繁體中文 (default) | English
- Output: full translated text (can be hundreds of lines)
- Needs modal + download due to length

### Removed features
- **SRT/VTT format**: Search volume 0-708, not worth UI space
- **AI 章節 (chapters)**: Search volume 44 (TW), intent is for creators not viewers
- **Mind map**: Search volume 44 (TW), defer to future phase as bonus feature
- **Japanese / Korean translation**: Backend supports ja/ko, but frontend only exposes zh-TW/en for MVP

---

## API & Cost Strategy

### Models (actual implementation)

| Page | API Provider | Model | Cost/request (15min video) |
|------|-------------|-------|---------------------------|
| 字幕下載 | youtube-transcript-api | None (no AI) | $0 |
| AI 摘要 | OpenRouter | gpt-4.1-nano (default) | ~$0.0002-0.0005 |
| 字幕翻譯 | OpenRouter | gpt-4.1-nano (default) | ~$0.0005-0.001 |

> **Note:** Original plan was Alibaba Cloud Qwen (dashscope). Switched to OpenRouter for better model flexibility and A/B testing support. Models are configurable via `AI_SUMMARY_MODEL` and `AI_TRANSLATE_MODEL` env vars.

### Cost projection

| Scenario | Summary reqs | Translate reqs | Monthly AI cost |
|----------|-------------|----------------|-----------------|
| Early (10% conversion) | 270 | 210 | ~$0.30 |
| Growth (20%) | 540 | 420 | ~$0.60 |
| Burst (50%) | 1,350 | 1,050 | ~$1.50 |

### Translation quality notes
- Using OpenRouter with gpt-4.1-nano as default
- System prompt specifies: Traditional Chinese (Taiwan) with Taiwan terminology
- Intelligent same-language handling: if source == target, fixes speech-to-text errors and merges subtitle fragments instead of translating
- Model A/B testing infrastructure exists (backend accepts `model` override, `ALLOWED_MODELS` whitelist)

---

## Security: Anti-Abuse Architecture (No Login)

### BFF Pattern (Backend-for-Frontend) ✅

```
Browser → Next.js API Route (/api/*) → FastAPI (Azure)
          ↑ public                      ↑ hidden, requires API_SECRET_KEY
```

- FastAPI URL is NOT exposed to browser (no NEXT_PUBLIC_ prefix)
- FastAPI only accepts requests with X-API-Key header
- Rate limiting and CAPTCHA at Next.js layer
- Video duration validation at FastAPI layer

### Defense layers (at Next.js API Route) ✅

| Layer | Method | Status |
|-------|--------|--------|
| 1. BFF Proxy | API key hidden server-side | ✅ Implemented |
| 2. Rate Limit | Upstash Redis, IP-based, 24h TTL | ✅ Implemented |
| 3. CAPTCHA | Cloudflare Turnstile (progressive) | ✅ Implemented |
| 4. Duration Limit | 60-minute max via subtitle timestamps | ✅ Implemented |
| 5. Input Validation | URL format, video length, subtitle exists | ✅ Implemented |
| 6. Backend Rate Limit | slowapi 10/minute per IP on FastAPI | ✅ Implemented |

> **Note:** One-time token (original Layer 3) was replaced by Turnstile. Daily AI budget cap (original Layer 6) was not implemented — cost is controlled by rate limit + duration limit instead.

### Progressive CAPTCHA ✅

- First 3 requests/day per IP: no CAPTCHA
- Request 4: Cloudflare Turnstile verification (one time)
- Requests 5-10: auto-pass (verified flag stored in Redis, 24h TTL)
- 11+: blocked for 24 hours

> **Improvement from original plan:** Originally every request 4-10 required CAPTCHA. Changed to verify-once for better UX — Turnstile verification at request 4 sets a `verified:{ip}` Redis flag, subsequent requests skip CAPTCHA.

---

## Personal Workflow Integration

The YouTube subtitle API doubles as personal infrastructure.
Tool site visitors use OpenRouter AI (cheap). Personal workflow uses Claude Code (quality, subscription-covered).

### Architecture

```
Tool site visitors:
  Browser → Next.js proxy (CAPTCHA) → FastAPI → OpenRouter AI

Personal workflow:
  Claude Code session (subscription)
    → FastAPI /api/youtube/subtitle (transcript only, no AI, $0)
    → Claude Code processes transcript itself (summary, translate, diagrams)
    → Output handled by user or other skills (creative-team, /take note, etc.)
```

### Key constraint: Claude Code subscription vs Anthropic API

- DO NOT call Anthropic API from FastAPI — that costs API tokens
- AI processing for personal use happens WITHIN Claude Code sessions (covered by subscription)
- FastAPI only provides the transcript extraction service (no AI cost)

### Personal API Key

FastAPI accepts two types of API keys:
- `PROXY_KEY` — from Next.js proxy, has rate limit + CAPTCHA enforcement
- `PERSONAL_KEY` — for personal scripts/Claude Code, no rate limit

### Use cases (output destination TBD, not hardcoded)

| Use case | API endpoint | AI processing |
|----------|-------------|---------------|
| Quick summary | /subtitle | Claude Code generates summary |
| Translation | /subtitle | Claude Code translates (better zh-TW than OpenRouter) |
| Mind map | /subtitle | Claude Code outputs Mermaid mindmap |
| Flowchart | /subtitle | Claude Code outputs Mermaid flowchart or .drawio XML |
| Research | /subtitle | Claude Code analyzes, user decides where to save |

### Potential Claude Code skill (future)

```
/youtube <url>
→ Fetches transcript via personal API key
→ Claude Code summarizes + generates Mermaid diagram
→ Outputs to conversation (user decides next step)
```

**Status:** ✅ Implemented. Files: `~/.claude/skills/youtube/SKILL.md` + `scripts/fetch_transcript.sh`. Env vars (`YOUTUBE_API_URL`, `YOUTUBE_PERSONAL_KEY`) set in `~/.claude/settings.json`.

---

## Mockup Files

- `designs/forms.pen`
  - Page 1: `V2hDk` — YT Subtitle Download
  - Page 2: `WBIRC` — YT AI Summary
  - Page 3: `lqDq0` — YT Subtitle Translate

---

## Phase 1 Security Retrofit ✅

Phase 1 originally exposed FastAPI directly via `NEXT_PUBLIC_API_URL`. Retrofit completed as part of Phase 2.

### Changes completed

**Backend (neatoolkit-api):**
1. ✅ Added `X-API-Key` middleware — rejects requests without valid key (except /health)
2. ✅ Added slowapi rate limiting

**Frontend (neatoolkit):**
3. ✅ Removed `NEXT_PUBLIC_API_URL` — replaced with server-side `API_URL`
4. ✅ Created Next.js API route proxies for all endpoints
5. ✅ Added Cloudflare Turnstile to YouTube endpoints
6. ✅ Updated all frontend components to call `/api/*` instead of direct FastAPI

---

## Implementation Deviations from Original Plan

| Item | Original Plan | Actual Implementation |
|------|--------------|----------------------|
| AI Provider | Alibaba Cloud Qwen (dashscope) | OpenRouter (multiple models) |
| Summary Model | Qwen-Turbo | gpt-4.1-nano (configurable) |
| Translate Model | Qwen-MT-Turbo | gpt-4.1-nano (configurable) |
| Rate Limit Storage | In-memory Map | Upstash Redis |
| CAPTCHA frequency | Every request 4-10 | Once at request 4, then auto-pass |
| Translate languages (UI) | zh-TW, en, ja, ko | zh-TW, en only |
| Daily AI budget cap | Planned | Not implemented (rate limit sufficient) |
| /youtube Claude Code skill | Planned | ✅ Implemented — `~/.claude/skills/youtube/` |
| Proxy retry for YouTube | Not planned | Added with Webshare proxy support |
| Video metadata (oEmbed) | Not planned | Added — title, channel, thumbnail |
| Duration limit | Mentioned in notes | Fully implemented with WarningModal |

---

## Completed TODO List

- [x] Phase 1 security retrofit (BFF pattern, API key, CAPTCHA)
- [x] Define backend endpoints and request/response schemas for YouTube tools
- [x] Define Next.js API route structure (proxy + new YouTube routes)
- [x] AI integration (OpenRouter, not Qwen as originally planned)
- [x] Cloudflare Turnstile integration (all YouTube endpoints)
- [x] SEO: meta, JSON-LD, i18n for all 3 YouTube pages
- [x] Mobile responsive design
- [x] 60-minute video duration limit
- [x] Rate limit with Upstash Redis
- [x] Verify-once CAPTCHA improvement
- [ ] A/B test models for Traditional Chinese quality (infrastructure ready, not executed)
- [x] /youtube Claude Code skill — `~/.claude/skills/youtube/SKILL.md` + `scripts/fetch_transcript.sh`
- [ ] Japanese/Korean translation UI (backend ready, frontend deferred)
