# Phase 2: YouTube + AI Tools Implementation Plan

> **Status:** ✅ Complete — all core tasks implemented and deployed to production.
> **Created:** 2026-02-10
> **Completed:** 2026-02-10

**Goal:** Ship 3 YouTube tools (subtitle download, AI summary, subtitle translate) with BFF security pattern, AI integration, and progressive CAPTCHA.

**Architecture:** Frontend (Next.js on Vercel) calls Next.js API Routes (BFF proxy layer) which forward to FastAPI (Azure). FastAPI URL is never exposed to browser. YouTube transcript extraction via `youtube-transcript-api`. AI processing via OpenRouter (gpt-4.1-nano default, configurable).

**Tech Stack:**
- Backend: Python 3.11, FastAPI, youtube-transcript-api, OpenRouter (via OpenAI SDK)
- Frontend: Next.js 16, Tailwind v4, next-intl, Cloudflare Turnstile
- Security: BFF proxy, API key middleware, progressive CAPTCHA (verify-once), Upstash Redis rate limit
- Infrastructure: Azure Container Apps, Vercel, Cloudflare Turnstile, Upstash Redis

---

## Task Status Overview

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Backend API Key Middleware | ✅ Complete | X-API-Key middleware, PROXY_KEY + PERSONAL_KEY |
| 2 | Frontend BFF Proxy Routes | ✅ Complete | All endpoints proxied via `/api/*` |
| 3 | YouTube Transcript Endpoint | ✅ Complete | With proxy retry, oEmbed metadata, duration_seconds |
| 4 | YouTube AI Summary Endpoint | ✅ Complete | OpenRouter gpt-4.1-nano, Markdown output |
| 5 | YouTube Translate Endpoint | ✅ Complete | Same-language editing, model override support |
| 6 | Cloudflare Turnstile Integration | ✅ Complete | Progressive CAPTCHA with verify-once improvement |
| 7 | YouTube Subtitle Download Page | ✅ Complete | Language pills, timestamps, copy/download |
| 8 | YouTube AI Summary Page | ✅ Complete | Markdown rendering, CAPTCHA, auto-retry |
| 9 | YouTube Subtitle Translate Page | ✅ Complete | zh-TW/en, CAPTCHA, full content modal |
| 10 | YTToolsNav + Navigation | ✅ Complete | Header, mobile nav, footer updated |
| 11 | SEO & i18n | ✅ Complete | FAQ/HowTo/WebApp schemas, zh-TW + en |
| 12 | /youtube Claude Code Skill | ✅ Complete | SKILL.md + fetch_transcript.sh, PERSONAL_KEY auth |
| 13 | Deploy & Verify | ✅ Complete | Both repos deployed and tested |

---

## Post-Plan Improvements

These were added after the original plan during implementation and testing:

| Improvement | Description | Commit |
|-------------|-------------|--------|
| Upstash Redis rate limit | Replaced in-memory Map with persistent Redis | `feat: replace in-memory rate limit with Upstash Redis` |
| Video metadata (oEmbed) | Added title, channel, thumbnail to all responses | Part of initial YouTube endpoint implementation |
| VideoInfoCard component | Shared component for displaying video info | Part of YouTube page implementation |
| Webshare proxy retry | Proxy rotation for YouTube transcript extraction reliability | Added to youtube_service.py |
| Video title as filename | Download .txt uses video title instead of video ID | `fix: use video title as download filename instead of video ID` |
| Auto-retry after CAPTCHA | Automatically re-submits after Turnstile verification | `fix: auto-retry after CAPTCHA verification` |
| 60-minute duration limit | Backend calculates from subtitle timestamps, frontend shows WarningModal | `feat: add 60-minute duration limit UI with WarningModal` |
| CAPTCHA on subtitle page | Originally missing, added for consistency | `fix: add CAPTCHA handling to YouTube subtitle page` |
| Verify-once CAPTCHA | Only require CAPTCHA once per 24h instead of every request | `fix: only require CAPTCHA once per 24h instead of every request` |
| i18n error messages | Mapped backend error strings to translated frontend messages | `feat: add rate limit notice, i18n error messages, and update FAQ` |
| Summary prompt tuning | Few-shot example for Markdown format compliance, video type detection | Multiple commits |

---

## Definition of Done

- [x] API key middleware active on FastAPI (rejects keyless requests)
- [x] BFF proxy routes working for all Phase 1 + Phase 2 endpoints
- [x] `NEXT_PUBLIC_API_URL` removed from frontend (no exposed API URL)
- [x] YouTube transcript endpoint working with proxy retry
- [x] YouTube summary endpoint working with OpenRouter
- [x] YouTube translate endpoint working with model override support
- [x] Cloudflare Turnstile integrated for all YouTube endpoints
- [x] Verify-once CAPTCHA (request 4 verifies, 5-10 auto-pass)
- [x] All 3 YouTube pages functional with correct UX
- [x] FullContentModal working (desktop modal / mobile bottom sheet)
- [x] WarningModal for 60-minute duration limit
- [x] URL persistence across YouTube tab switches (sessionStorage)
- [x] Video metadata display (title, channel, thumbnail)
- [x] All zh-TW translations are real Traditional Chinese
- [x] All en translations complete
- [x] SEO complete (meta, JSON-LD, FAQ) for all 3 pages
- [x] 60-minute video duration limit enforced
- [x] Rate limit with Upstash Redis (3 free, verify-once, block at 11)
- [x] Phase 1 tools still functional after BFF retrofit
- [x] Production deployed and verified (both repos)
- [x] Production build passes for both repos

### Not Done (Deferred)

- [x] `/youtube` Claude Code skill — SKILL.md + fetch script, env vars in settings.json
- [ ] Japanese/Korean translation UI — backend supports, frontend deferred
- [ ] A/B test model quality — infrastructure ready, not yet executed
- [ ] Daily AI budget cap — rate limit + duration limit sufficient
- [ ] Google Search Console submission — pending

---

## File Map (Final State)

### Backend (`neatoolkit-api`)

| File | Purpose |
|------|---------|
| `src/config.py` | PROXY_KEY, PERSONAL_KEY, MAX_VIDEO_DURATION_MINUTES, RATE_LIMIT_YOUTUBE |
| `src/main.py` | APIKeyMiddleware, router registration |
| `src/routers/youtube.py` | 3 routes: /subtitle, /summary, /translate + _check_duration helper |
| `src/services/youtube_service.py` | extract_video_id, fetch_transcript (with proxy retry), fetch_video_metadata |
| `src/services/qwen_service.py` | generate_summary, translate_text (via OpenRouter) |

### Frontend (`neatoolkit`)

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | fetchApi, ApiError (relative paths, no exposed API URL) |
| `src/lib/proxy.ts` | proxyJson, proxyStream (server-side, adds X-API-Key) |
| `src/lib/rate-limit.ts` | checkRateLimit, markVerified, getClientIP (Upstash Redis) |
| `src/lib/turnstile.ts` | verifyTurnstile (server-side Turnstile verification) |
| `src/lib/error-messages.ts` | getErrorMessageKey (maps backend errors to i18n keys) |
| `src/app/api/youtube/subtitle/route.ts` | BFF proxy + rate limit + CAPTCHA |
| `src/app/api/youtube/summary/route.ts` | BFF proxy + rate limit + CAPTCHA |
| `src/app/api/youtube/translate/route.ts` | BFF proxy + rate limit + CAPTCHA |
| `src/components/youtube-subtitle/YouTubeSubtitle.tsx` | Subtitle download UI |
| `src/components/youtube-summary/YouTubeSummary.tsx` | AI summary UI |
| `src/components/youtube-translate/YouTubeTranslate.tsx` | Subtitle translate UI |
| `src/components/shared/FullContentModal.tsx` | Desktop modal / mobile bottom sheet |
| `src/components/shared/WarningModal.tsx` | Amber warning modal (duration limit) |
| `src/components/shared/TurnstileWidget.tsx` | Cloudflare Turnstile client widget |
| `src/components/shared/VideoInfoCard.tsx` | Video title/channel/thumbnail card |
| `src/components/layout/YouTubeToolsNav.tsx` | Tab navigation for YouTube tools |
| `messages/zh-TW.json` | Traditional Chinese translations |
| `messages/en.json` | English translations |
