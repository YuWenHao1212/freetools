# Homepage V2 Implementation Checklist

> Design reference: TinyWow style
> Mockup: Neatoolkit.pen → "Homepage V2 - Desktop" (frame HFfje)
> Date: 2026-02-11

---

## Layout Structure

- [ ] Header: Neatoolkit + "by Wenhao" logo + nav (SEO order)
- [ ] Hero: title + subtitle + trust badges (no search bar)
- [ ] Category Cards: 4 colored cards in horizontal row
- [ ] All Tools: section title + 3x3 tool card grid
- [ ] Footer: legal links + attribution

## Category Order (by SEO search volume)

1. Image Tools (258K/mo) - amber `#D97706`
2. Video Tools (68K/mo) - red `#DC2626`
3. YouTube Tools (11K/mo) - teal `#0D9488`
4. Text Tools - purple `#7C3AED`

> Career Tools hidden for now, add when ready

---

## Design Quality Checklist

### Typography
- [ ] Headings: Newsreader (serif) + Noto Serif TC
- [ ] Body: Satoshi (from Fontshare) + Noto Sans TC
- [ ] NOT Inter for body (too common / AI-looking)
- [ ] Match personal website (yu-wenhao.com) font system

### Color System
- [ ] Background: `#FAF8F5` (cream-50) - unified, no separate hero bg color
- [ ] Primary text: `#1A1A1A` (ink-900)
- [ ] Secondary text: `#6B6560` (ink-500) - subtitle, descriptions, trust badges
- [ ] Border: `#E8E4DD` (cream-300)
- [ ] Accent/CTA: `#CA8A04` (amber-600)

### Category Card Colors (white text on colored bg)
- [ ] Amber `#D97706` - verify white text contrast >= 4.5:1
- [ ] Red `#DC2626` - verify white text contrast >= 4.5:1
- [ ] Teal `#0D9488` - verify white text contrast >= 4.5:1
- [ ] Purple `#7C3AED` - verify white text contrast >= 4.5:1
- [ ] Use `font-weight: semibold` on card text for better readability
- [ ] If contrast fails, darken the bg color slightly

### Tool Card Icon Colors
- [ ] Each tool icon uses its category color at 15% opacity as bg circle
- [ ] Icon itself uses full category color
- [ ] Verify 15% opacity circles are visible on white card background

---

## Interaction & Animation

### Card Hover States
- [ ] All clickable cards: `cursor-pointer`
- [ ] Category cards: `hover:shadow-lg`, `hover:-translate-y-1`, `transition-all duration-200`
- [ ] Tool cards: `hover:shadow-md`, `hover:-translate-y-0.5`, `hover:border-ink-900/10`
- [ ] Arrow (→) on tool cards: slides right on hover (`group-hover:translate-x-1`)
- [ ] Smooth transitions: 150-300ms, no layout shift

### Hero Decorative Elements (TinyWow style)
- [ ] Scattered geometric shapes using CSS absolute positioning
- [ ] Small triangles, circles, diamonds in brand colors
- [ ] Use semi-transparent versions (10-20% opacity)
- [ ] Colors: amber, teal, purple, red (match category colors)
- [ ] `pointer-events-none` so they don't block clicks
- [ ] Respect `prefers-reduced-motion` - disable animations

---

## Accessibility

### Color Contrast (WCAG AA minimum 4.5:1)
- [ ] Primary text `#1A1A1A` on `#FAF8F5` bg - OK (high contrast)
- [ ] Secondary text `#6B6560` on `#FAF8F5` bg - verify >= 4.5:1
- [ ] White text on category card colors - verify each one
- [ ] Don't convey info by color alone (icons + text together)

### General
- [ ] All images have alt text
- [ ] Focus states visible for keyboard navigation
- [ ] Category card icons use Lucide (SVG, not emoji)
- [ ] Trust badge icons + text (not color-only)

---

## Responsive

- [ ] Mobile: category cards stack 2x2 grid
- [ ] Mobile: tool cards stack to single column
- [ ] Mobile: hero text size responsive (52px → ~32px)
- [ ] Mobile: decorative elements hidden or reduced
- [ ] Test at 320px, 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on any breakpoint

---

## Content

### Hero
- [ ] H1: "真正免費的線上工具"
- [ ] Subtitle: "圖片壓縮、影片轉檔、文字排版、YouTube 字幕，讓你的工作更輕鬆。"
- [ ] Trust badges: 不需要註冊 | 完全免費，無隱藏收費 | 處理完立即刪除檔案

### All Tools Section
- [ ] Title: "所有工具"
- [ ] Subtitle: "精選打造，全部免費，簡單好用。"
- [ ] NOT "沒有套路" (we have rate limits and affiliation)

### Footer
- [ ] "Made with <3 by Yu-Wen Hao"
- [ ] Legal links: 使用條款 / 隱私權政策 / 關於我們

---

## Data Architecture

- [ ] Tool data driven from `src/lib/tools.ts`
- [ ] Category order configurable (not hardcoded in JSX)
- [ ] Easy to add new tools / categories without layout changes
- [ ] LucideIcon client-side resolver for string icon names

---

## No Search Bar (for now)

- Search bar removed - only 9 tools, not enough to warrant search
- Re-evaluate when tool count reaches 15-20+
- Keep search bar design ready in case needed later

---

## Legal Pages (can delegate to Agent 1)

> Translations already in `messages/zh-TW.json` and `messages/en.json`
> Pages need to be created and Footer hrefs updated

- [ ] Create `/about/page.tsx` (關於我們)
- [ ] Create `/privacy/page.tsx` (隱私權政策)
- [ ] Create `/terms/page.tsx` (服務條款)
- [ ] Update Footer.tsx hrefs to link to these pages
- [ ] Pages should use i18n translations from messages JSON
- [ ] Simple prose layout, consistent with site design

---

## Partnership & Monetization Layout

### Phase 1: Launch Day (now)

#### Footer "合作洽詢" link
- [ ] Add "合作洽詢" link in Footer next to legal links
- [ ] Links to email (e.g. `mailto:hello@neatoolkit.com`) or /contact page
- [ ] i18n: "合作洽詢" (zh-TW) / "Partner with Us" (en)

#### /partners page (basic)
- [ ] Create `/partners/page.tsx`
- [ ] Content sections:
  - Who we are (brief intro, link to /about)
  - Our audience (target users: creators, students, marketers)
  - Collaboration types:
    - Affiliate: recommend complementary tools/services
    - Sponsored tools: brands fund development of specific tools
    - Content partnership: KOL/blogger cross-promotion
    - API integration: let others embed our tools
  - Contact CTA (email or form)
- [ ] Add i18n translations
- [ ] SEO: target "工具網站合作" / "online tool partnership"

### Phase 2: With Traffic (1K+ DAU)

#### Affiliate integration
- [ ] Plan affiliate spots on tool pages (e.g. image compress → recommend stock photo sites)
- [ ] Use non-intrusive placement: "Related Resources" section below tool
- [ ] Track clicks with UTM parameters
- [ ] Clearly label as affiliate/sponsored (FTC compliance)

#### "For Business" / "企業方案"
- [ ] Add "企業合作" link in Header nav (after tool categories)
- [ ] Or add to Footer as prominent section
- [ ] Landing page for enterprise/white-label inquiries

### Phase 3: Scale (10K+ DAU)

#### API Partnership
- [ ] Public API documentation page
- [ ] Developer portal with API keys
- [ ] Rate-limited free tier + paid plans

#### White Label
- [ ] Custom branding options for enterprise clients
- [ ] Separate pricing/inquiry page

---

## Agent Workload Split

| Task | Agent | Status |
|------|-------|--------|
| Homepage V2 implementation | Agent 2 (frontend) | Next |
| Legal pages (about/privacy/terms) | Agent 1 (delegatable) | Pending |
| sitemap.ts for GSC | Agent 1 (delegatable) | Pending |
| Footer href updates | Whoever finishes first | Pending |
| /partners page | Phase 1, after homepage | Pending |
| Affiliate integration | Phase 2, after traffic | Future |
