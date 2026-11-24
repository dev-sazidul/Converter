# Priority Issue List — BestConvert (`https://bestconvert.site/`)

Issues are grouped by root cause (no duplicates) and categorized by severity: **Critical**, **High**, **Medium**, and **Low**.

---

## Critical Issues

### 1. Dead "Login" and "Sign up" Buttons in Header
- **Affected File / Page:** `frontend/src/components/layout/Header.tsx` (L115–123, L202–214); Live on all pages (`https://bestconvert.site/*`)
- **Problem:** `Login` and `Sign up` buttons are rendered in both desktop and mobile navigation with no `onClick` handlers, modals, or routes. Live testing confirmed clicking them does nothing.
- **Impact:** Broken user expectation, loss of trust, and high risk of Google AdSense rejection for incomplete/non-functional site elements.
- **Recommended Solution:** Remove the `Login` and `Sign up` buttons until authentication is actually implemented, or replace them with a working route/feature.

### 2. Missing Contact Page (`/contact` returns HTTP 404) & No Contact Details
- **Affected File / Page:** Missing `frontend/src/app/contact/page.tsx`; `Footer.tsx`, `AboutPage.tsx`, `PrivacyPage.tsx`, `TermsPage.tsx`
- **Problem:** `https://bestconvert.site/contact` returns HTTP 404, and no email address, contact form, or support channel exists anywhere on the site.
- **Impact:** Severe trust deficit for users handling sensitive documents and a major red flag during Google AdSense review.
- **Recommended Solution:** Create `/contact` with a working contact email (e.g., `support@bestconvert.site`) and/or contact form, and link it from the footer, About, Privacy, and Terms pages.

---

## High Issues

### 3. AdSense Units Rendered on 404 Error Pages and "Coming Soon" Stub Pages
- **Affected File / Page:** `frontend/src/app/layout.tsx` (L70), `frontend/src/components/layout/Footer.tsx` (L10), `frontend/src/views/ToolPage.tsx` (L49)
- **Problem:** `<AdSlot>` renders `<ins class="adsbygoogle">` on 404 pages (`/contact`, `/nonexistent-test-404`) and on all 8 non-functional `Coming soon` pages.
- **Impact:** Potential Google AdSense policy violation (serving ads on error pages or pages without publisher content / under-construction pages).
- **Recommended Solution:** Suppress `<AdSlot>` on 404/not-found routes and on `tool.status === "soon"` pages.

### 4. AdSense Script ID Typo Causing Duplicate Script Injection & Hardcoded Client ID
- **Affected File / Page:** `frontend/src/app/layout.tsx` (L43), `frontend/src/components/ads/AdSlot.tsx` (L27), `frontend/src/lib/ads.ts` (L11–13)
- **Problem:** `layout.tsx` uses `id="convarter-adsense"`, while `AdSlot.tsx` checks for `id="converter-adsense"`, causing `AdSlot` to inject a duplicate `adsbygoogle.js` script. `adsenseClient()` also hardcodes `"ca-pub-5871594289590523"` and ignores `NEXT_PUBLIC_ADSENSE_CLIENT`.
- **Impact:** Duplicate AdSense script requests, wasted bandwidth, and broken env-var configurability.
- **Recommended Solution:** Align the script ID (`converter-adsense`) across `layout.tsx` and `AdSlot.tsx` (or rely solely on `layout.tsx`), and read `process.env.NEXT_PUBLIC_ADSENSE_CLIENT` with fallback.

### 5. Outdated Privacy Policy Claims & Missing Cookie Consent / Analytics Disclosure
- **Affected File / Page:** `frontend/src/views/PrivacyPage.tsx` (L29), `frontend/src/app/layout.tsx` (L50–63)
- **Problem:** Privacy Policy claims ads use "demo images" and mentions a non-existent "popup" ad, even though live AdSense is active. It also omits disclosure of Google Analytics (`G-WGB9EGCRD6`), lacks a GDPR/EEA cookie consent banner, and has no effective date or privacy contact email.
- **Impact:** Legal/compliance risk (GDPR/CCPA) and AdSense policy compliance risk.
- **Recommended Solution:** Rewrite `PrivacyPage.tsx` to accurately reflect active AdSense, Google Analytics, cookie usage, data retention (1 hour), and contact info; add a cookie consent mechanism (e.g., Google Funding Choices / CMP) for EEA/UK visitors.

### 6. High Ratio of "Coming Soon" Placeholder Tools (8 of 22 Tools)
- **Affected File / Page:** `frontend/src/lib/tools.ts` (L365–372), `frontend/src/views/ToolPage.tsx` (L108–129), `ToolBrowser.tsx`, `MoreMenu.tsx`
- **Problem:** 8 tools (`edit-pdf`, `watermark-pdf`, `page-numbers`, `repair-pdf`, `ocr-pdf`, `protect-pdf`, `unlock-pdf`, `sign-pdf`) are non-functional placeholders prominently displayed in the main tool grid and navigation.
- **Impact:** Creates an "under construction" impression for users and AdSense reviewers.
- **Recommended Solution:** Either implement the highest-demand tools before review or move unbuilt tools out of the primary grid/navigation into a subtle roadmap note.

### 7. Thin Content on Core Pages (`/about`, `/tools`, `/convert-pdf`, `/help`, `/terms`, `/privacy`)
- **Affected File / Page:** `AboutPage.tsx`, `AllToolsPage.tsx`, `ConvertPdfPage.tsx`, `HelpPage.tsx`, `TermsPage.tsx`, `PrivacyPage.tsx`
- **Problem:** Several indexable pages contain only 1–5 short paragraphs without comprehensive explanations, use cases, or structured trust signals.
- **Impact:** Weakens topical authority, SEO rankings, and AdSense "valuable inventory / thin content" evaluation.
- **Recommended Solution:** Expand each core page with original, helpful documentation (see `CONTENT_SEO_IMPROVEMENT_PLAN.md`).

### 8. No Application-Level Rate Limiting on Conversion API
- **Affected File / Page:** `frontend/src/app/api/v1/tools/[tool]/route.ts`
- **Problem:** Public `POST` upload endpoints have no per-IP rate limiting or concurrency throttling before hitting FastAPI (`MAX_CONCURRENT_JOBS=2`).
- **Impact:** Vulnerable to resource exhaustion / DoS, causing `503 BusyError` for legitimate users.
- **Recommended Solution:** Add IP-based rate limiting (either in Next.js middleware/route handler or via Cloudflare/reverse proxy rules) and verify it in production.

---

## Medium Issues

### 9. Missing `og:image` and `twitter:image` Across All Pages
- **Affected File / Page:** `frontend/src/lib/metadata.ts` (L7–22); Live on all pages (`ogImg=None`)
- **Problem:** No Open Graph or Twitter share image is configured, and `twitter:card` uses `"summary"` instead of `"summary_large_image"`.
- **Impact:** Poor click-through rate and unbranded previews when pages or blog posts are shared on social media.
- **Recommended Solution:** Create a `1200x630` branded Open Graph image in `frontend/public/` and wire it into `pageMetadata()`.

### 10. Inconsistent Brand Naming (`bestconvert.site` vs `Converter` vs `Convarter`)
- **Affected File / Page:** `frontend/src/lib/tools.ts`, `frontend/src/lib/metadata.ts`, `backend/app/services/pdf/*.py`, `frontend/package.json`
- **Problem:** The domain is `bestconvert.site`, the UI/SEO brand is generic `Converter`, and downloaded files are prefixed `convarter-*` (e.g., `convarter-merged.pdf`).
- **Impact:** Weak brand identity in SERPs and confusing downloaded filenames.
- **Recommended Solution:** Standardize on one brand name (e.g., `BestConvert`) across UI, `<title>` tags, JSON-LD `Organization`, and output filenames.

### 11. DNS-Rebinding SSRF Exposure on `html-to-pdf` URL Mode
- **Affected File / Page:** `backend/app/services/convert/html_policy.py`, `backend/app/services/convert/html_to_pdf.py`
- **Problem:** Python validates the resolved IP before Playwright Chromium independently resolves DNS again.
- **Impact:** A DNS-rebinding domain could bypass the private-IP check if container network egress is not restricted.
- **Recommended Solution:** Enforce network-level egress blocking for private/link-local/metadata IP ranges on the `backend` Docker container.

### 12. Missing HTTP Security Headers on Page Routes
- **Affected File / Page:** `frontend/next.config.ts` (L10–22)
- **Problem:** `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options` are only applied to `/api/:path*`.
- **Impact:** Page routes lack clickjacking and MIME-sniffing protections unless added by Cloudflare/proxy.
- **Recommended Solution:** Add security headers to `/(.*)` in `next.config.ts` (ensuring compatibility with AdSense iframes).

### 13. Heavy Cross-Promotion (`EcosystemTools`) on Content & Home Pages
- **Affected File / Page:** `frontend/src/components/layout/EcosystemTools.tsx`, `HomePage.tsx`, `AboutPage.tsx`, `BlogIndexPage.tsx`, `BlogPostPage.tsx`, `Footer.tsx`
- **Problem:** Large promotional cards linking to `imagecustomize.site`, `bestdownloader.site`, and `futuresolutionai.com` appear prominently on almost every page.
- **Impact:** Could be viewed by AdSense reviewers as excessive outbound promotional clutter / affiliate-style cross-linking, especially on thin pages like `/about`.
- **Recommended Solution:** Keep ecosystem links subtle in the footer and `/about` page rather than prominent multi-card banners on the homepage and blog posts.

---

## Low Issues

### 14. Unused Legacy Build Artifacts (`frontend/dist/`) and Dead Media (`frontend/public/ads/flower.mp4`)
- **Affected File / Page:** `frontend/dist/`, `frontend/public/ads/flower.mp4`
- **Problem:** Old Vite/NestJS build output and an unused popup video remain in the repository.
- **Impact:** Repository bloat and developer confusion.
- **Recommended Solution:** Remove `frontend/dist/` and `frontend/public/ads/flower.mp4` after verifying they are not referenced by any deployment script.

### 15. Outdated Documentation (`PROJECT_STATUS.md`, `SEO_AUDIT.md`) & Minor Copy Mismatch
- **Affected File / Page:** `PROJECT_STATUS.md`, `SEO_AUDIT.md`, `frontend/src/views/HomePage.tsx` (L22)
- **Problem:** `PROJECT_STATUS.md` lists 19 vitest tests (actually 28) and omits the `/blog` section. `HomePage.tsx` says "Usually ready in seconds" while `CONVERSION_TIMEOUT_SECONDS` is 120s.
- **Impact:** Minor documentation drift.
- **Recommended Solution:** Update docs after next deploy; soften hero timing claim if needed.

### 16. Local Backend `html-to-pdf` Tests Fail Without Playwright Browser Binary
- **Affected File / Page:** `backend/tests/test_convert.py` (L338, L386)
- **Problem:** Running `pytest` on macOS outside Docker fails 2 `html-to-pdf` tests unless `playwright install chromium` has been run locally.
- **Impact:** Local test friction (live Docker build works).
- **Recommended Solution:** Document `playwright install chromium` in `docs/TESTING.md` or skip with a clear marker when Chromium is absent locally.
