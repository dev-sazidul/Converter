# Complete Website Audit Report — BestConvert (`https://bestconvert.site/`)

**Audit Date:** 2026-11-24  
**Scope:** Full-stack codebase inspection (`/Users/zaragadgetfair/Desktop/Convarter`), automated test execution, and live website/API testing on `https://bestconvert.site/`.  
**Constraint:** Read-only audit. No source code, design, content, or AdSense configuration was modified.

---

## 1. Executive Summary & Architecture Overview

BestConvert (`https://bestconvert.site/`) is a PDF and document conversion web application built with:
- **Frontend:** Next.js 15 (`App Router`, `output: "standalone"`), React 19, Tailwind CSS, Prisma 7 (`better-sqlite3` at `/data/db/app.db`), Google Analytics (`G-WGB9EGCRD6`), and Google AdSense (`ca-pub-5871594289590523`).
- **Backend:** FastAPI (`uvicorn`), PyMuPDF 2.0, pypdf, Pillow, python-docx, openpyxl, python-pptx, LibreOffice, Ghostscript, and Playwright Chromium (in Docker).
- **Infrastructure:** Docker Compose (`frontend` + internal `backend` on port 8000, fronted by Cloudflare).

### Overall Health Snapshot
- **Live Site Availability:** Online (`HTTP 200`, Cloudflare + Next.js SSR/ISR). `/api/health` returns `{"status":"ok","checks":{"database":true,"converter":true}}`.
- **Core PDF Tools:** 11 of 14 available tools were tested live against `https://bestconvert.site/api/v1/tools/*` and all 11 succeeded (HTTP 200 + valid file download). The remaining 3 Office-to-PDF tools and HTML URL mode were not live-tested with sample Office/URL payloads in this run (code-reviewed and covered by backend unit tests).
- **Automated Tests (Local):**
  - Frontend: `vitest` passed **28/28 tests** across 4 files; `tsc --noEmit` passed with 0 errors.
  - Backend: `pytest` passed **34/36 tests** locally; 2 `html-to-pdf` tests failed locally only because Playwright's headless Chromium binary is not installed in the local macOS cache (the live Dockerized site's `html-to-pdf` file mode passed).

---

## 2. Codebase & Technical Audit Findings

### 2.1 Critical & High-Severity Bugs / Incomplete Implementations

1. **Dead "Login" and "Sign up" Buttons (`frontend/src/components/layout/Header.tsx` L115–123, L202–214)**
   - **Evidence:** Both desktop and mobile headers render `<button type="button">Login</button>` and `<button type="button">Sign up</button>` with no `onClick` handlers, no modal, and no `/login` or `/signup` routes.
   - **Live Test:** Clicking `Login` and `Sign up` on `https://bestconvert.site/` produced no navigation, modal, or state change.

2. **Missing Contact Page (`404` on `/contact`) & No Support Contact Channel**
   - **Evidence:** No `src/app/contact` route exists. Live `GET https://bestconvert.site/contact` returned `HTTP 404`. Neither `Footer.tsx`, `AboutPage.tsx`, `PrivacyPage.tsx`, nor `TermsPage.tsx` lists a support email or contact form.

3. **AdSense Script ID Mismatch & Duplicate Injection (`frontend/src/app/layout.tsx` L42–47 vs `frontend/src/components/ads/AdSlot.tsx` L27–35, `frontend/src/lib/ads.ts` L11–13)**
   - **Evidence:** `layout.tsx` loads `adsbygoogle.js` with `id="convarter-adsense"`. `AdSlot.tsx` checks for `document.getElementById("converter-adsense")` (spelling mismatch) and injects a second `<script>` if missing.
   - Additionally, `adsenseClient()` in `frontend/src/lib/ads.ts` hardcodes `"ca-pub-5871594289590523"` instead of reading `process.env.NEXT_PUBLIC_ADSENSE_CLIENT` as documented in `.env.example` and `docker-compose.yml`.

4. **AdSense Rendered on `404` and `Coming soon` Pages (`frontend/src/app/layout.tsx` L70, `frontend/src/views/ToolPage.tsx` L49)**
   - **Evidence:** `RootLayout` unconditionally renders `<AdSlot slot="header" />`, and `Footer` unconditionally renders `<AdSlot slot="footer" />`. `ToolPage` renders `<AdSlot slot="tool" />` even when `tool.status === "soon"`.
   - **Live Test:** Confirmed `ads=1` (`ins.adsbygoogle`) present in the DOM on `/contact` (404), `/nonexistent-test-404` (404), and all 8 `Coming soon` pages (`/edit-pdf`, `/sign-pdf`, etc.).

5. **Outdated / Inaccurate Privacy Policy & Missing Consent Banner (`frontend/src/views/PrivacyPage.tsx` L29)**
   - **Evidence:** `PrivacyPage.tsx` states: *"Until an AdSense publisher id is added, those spaces use demo images. A separate popup shows a demo image or video and can be closed at any time."* On the live site, AdSense is already active, no demo images are used, and no popup component exists.
   - **Additional Gap:** Google Analytics (`G-WGB9EGCRD6` in `frontend/src/lib/ga.ts`) is loaded unconditionally in `layout.tsx` without disclosure in `PrivacyPage.tsx` and without a cookie/consent banner.

6. **8 Non-Functional "Coming Soon" Tools Promoted in Primary Navigation (`frontend/src/lib/tools.ts` L365–372)**
   - **Evidence:** `edit-pdf`, `watermark-pdf`, `page-numbers`, `repair-pdf`, `ocr-pdf`, `protect-pdf`, `unlock-pdf`, and `sign-pdf` are listed in `ToolBrowser`, `/tools`, and `MoreMenu`, but render a placeholder card (`ComingSoon` in `ToolPage.tsx`).

### 2.2 Security, Performance & Technical Quality

7. **No Application-Level Rate Limiting (`frontend/src/app/api/v1/tools/[tool]/route.ts`)**
   - **Evidence:** `POST /api/v1/tools/[tool]` creates a SQLite `Job` row and streams uploads directly to FastAPI with no IP throttling or abuse protection. With `MAX_CONCURRENT_JOBS=2` in `docker-compose.yml`, concurrent large jobs can trigger `503 BusyError`.

8. **DNS Rebinding Risk on `html-to-pdf` URL Mode (`backend/app/services/convert/html_policy.py` & `html_to_pdf.py`)**
   - **Evidence:** `normalize_public_url()` resolves DNS in Python before Playwright launches Chromium, which performs its own DNS resolution. As noted in `html_to_pdf.py` L8–10, network-level egress blocking on the backend container is required to prevent DNS-rebinding SSRF.

9. **Missing Security Headers on HTML Page Routes (`frontend/next.config.ts` L10–22)**
   - **Evidence:** `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options` are configured only for `/api/:path*`, not for page routes (`/`, `/tools`, etc.).

10. **Unused Legacy Build & Dead Assets (`frontend/dist/`, `frontend/public/ads/flower.mp4`)**
    - **Evidence:** `frontend/dist/` holds an obsolete Vite + NestJS SSR build (`dist/nest/main.js`, etc.) unused by Next.js. `frontend/public/ads/flower.mp4` is an orphaned asset from the removed popup ad.

11. **Brand Naming Inconsistency (`bestconvert.site` vs `Converter` vs `Convarter`)**
    - **Evidence:** Live domain is `bestconvert.site`; UI/SEO copy uses `Converter`; internal package names and live download filenames use `convarter-*` (e.g., `convarter-merged.pdf`, `convarter-compressed.pdf`).

---

## 3. Live Website Inspection & Test Results

### 3.1 Endpoints & Infrastructure Checks (Live)
| Endpoint | HTTP Status | Observed Output |
| :--- | :--- | :--- |
| `/` | `200` | Server-rendered HTML, Cloudflare + Next.js cache hit |
| `/robots.txt` | `200` | `User-Agent: * / Allow: / / Sitemap: https://bestconvert.site/sitemap.xml` |
| `/sitemap.xml` | `200` | 28 URLs (8 static/blog index + 14 working tools + 6 blog posts) |
| `/ads.txt` | `200` | `google.com, pub-5871594289590523, DIRECT, f08c47fec0942fa0` |
| `/api/health` | `200` | `{"status":"ok","checks":{"database":true,"converter":true}}` |
| `/healthz` | `200` | `ok` |
| `/api/v1/meta` | `200` | Limits: 25 MB/file, 100 MB total, 20 files, 150 pages, 3600s TTL |
| `/contact` | `404` | Page not found (`noindex, follow`) |

### 3.2 Live Conversion API & Download Tests
Tested with valid generated PDF, JPEG, and HTML payloads against `https://bestconvert.site/api/v1/tools/*` followed by `GET /api/v1/jobs/{id}/download`:
- **PASS (11/11 tested):** `merge` (`convarter-merged.pdf`, 1233 B), `split` (`convarter-split.pdf`, 769 B), `compress` (`convarter-compressed.pdf`, 761 B), `rotate` (`convarter-rotated.pdf`, 770 B), `pdf-to-jpg` (`convarter-page.jpg`, 6120 B), `jpg-to-pdf` (`convarter-images.pdf`, 3742 B), `pdf-to-word` (`a.docx`, 36604 B), `pdf-to-excel` (`a.xlsx`, 4880 B), `pdf-to-powerpoint` (`a.pptx`, 28299 B), `html-to-pdf` file mode (`a.pdf`, 6442 B), `pdf-to-pdfa` (`a-pdfa.pdf`, 6355 B).
- **Not Live-Tested:** `word-to-pdf`, `excel-to-pdf`, `powerpoint-to-pdf` (no `.docx`/`.xlsx`/`.pptx` fixtures uploaded live), and `html-to-pdf` URL mode.

### 3.3 Responsiveness & Console Checks (Live Playwright + Chrome)
- **Viewports tested:** `375x812` (mobile), `768x1024` (tablet), `1280x800` (desktop), `1920x1080` (large screen) on `/`, `/merge-pdf`, `/tools`, and `/blog`.
- **Horizontal Overflow:** `0` overflows detected (`scrollWidth === innerWidth` across all 16 checks).
- **Console / Network Errors:** Only the expected `404` responses when visiting `/contact` and `/nonexistent-test-404`. Zero JS runtime errors on valid routes.
