# Content & On-Page SEO Improvement Plan — BestConvert (`https://bestconvert.site/`)

**Audit Date:** 2026-11-24  
**Summary:** The technical SEO foundation (server-side rendering, canonicals, `robots.txt`, `sitemap.xml`, `noindex` on Coming Soon/404 pages, `SoftwareApplication`/`FAQPage`/`BreadcrumbList`/`BlogPosting` JSON-LD, and 6 long-form blog posts) is solid. However, **brand identity, core static page depth, social metadata (`og:image`), and internal consistency** need significant improvement.

---

## 1. Site-Wide SEO & Content Issues

1. **Generic Brand Name ("Converter") vs Domain (`bestconvert.site`)**
   - **Problem:** Title tags end with `— Converter` (e.g., `Merge PDF Online Free — Converter`), and `Organization` schema uses `name: "Converter"`. Meanwhile, the domain is `bestconvert.site` and downloads are named `convarter-*`.
   - **Recommendation:** Standardize all titles, headings, body copy, JSON-LD, and downloaded filenames to **BestConvert** (e.g., `Merge PDF Online Free — BestConvert`).

2. **Missing Open Graph & Twitter Share Image (`og:image` / `twitter:image`)**
   - **Affected Pages:** All pages (`ogImg=None` confirmed live).
   - **Recommendation:** Design a `1200×630` PNG share image (`/public/og-image.png`), update `pageMetadata()` in `frontend/src/lib/metadata.ts` to include `openGraph.images` and `twitter.images`, and switch `twitter.card` to `"summary_large_image"`.

3. **Unintended Cross-Promotion Clutter (`EcosystemTools`)**
   - **Affected Pages:** `/`, `/about`, `/blog`, `/blog/[slug]`, and global `Footer`.
   - **Recommendation:** Reduce `EcosystemTools` prominence on `/` and `/blog/*` so the page focus remains 100% on BestConvert's own PDF tools and guides.

---

## 2. Page-by-Page Content & SEO Audit

| Page URL | Current State (Live & Code) | Content & SEO Issues | Recommended Improvements |
| :--- | :--- | :--- | :--- |
| **`/` (Homepage)** | `H1`: "Every PDF task, clearly done." + tool grid + ~220 words of body copy + `EcosystemTools`. | Hero H1 is poetic rather than keyword-focused; body copy is brief and mostly a list of links; claims "Usually ready in seconds" (risky for large files). | Keep the clean hero, add a clear value proposition subheading ("Free online PDF converter & editor"), expand the bottom section with a **Security & Privacy** explanation, **Supported Formats Matrix**, and **3–5 Homepage FAQs**. |
| **`/tools`** | `H1`: "All PDF tools" + 1-sentence intro + search/filter grid. | Thin content (~40 words excluding tool cards); includes 8 non-functional "Coming soon" tools. | Add brief category summaries (Organize, Optimize, Convert), a comparison table of working tools & file limits, and remove or visually separate unbuilt tools. |
| **`/convert-pdf`** | `H1`: "Convert PDF" + 1-sentence intro + 2 link columns. | Very thin page (~45 words); high overlap with `/tools` and `/`. | Add a **Format Conversion Guide** (Office vs Image vs PDF/A), layout preservation expectations, and a short FAQ to differentiate search intent from `/tools`. |
| **`/about`** | `H1`: "A simpler place to work with PDFs" + 3 short paragraphs (~120 words) + `EcosystemTools`. | Too thin for an About page; no team/company background, no physical/jurisdictional info, no contact link, and no trust/architecture details. | Expand to 350–500 words: explain who operates BestConvert (FutureSolutionAI), how temporary file processing works, why the service is free, and link to `/contact` and `/privacy`. |
| **`/contact`** | **HTTP 404** (Does not exist). | Critical missing trust page. | Create `/contact` (`index, follow`, added to `sitemap.xml`) with a support email, response time expectations, bug-reporting instructions, and DMCA/legal inquiry contact. |
| **`/help`** | `H1`: "How Converter works" + 3-step list + 10 limit bullets + 3 FAQs. | Good factual limits, but only 3 FAQs and lacks troubleshooting (e.g., encrypted PDFs, LibreOffice font substitution, scanned PDFs). | Expand FAQs to 8–10 practical troubleshooting questions and link directly to relevant tools and blog guides. |
| **`/privacy`** | `H1`: "Your documents are temporary" + 5 short paragraphs. | Outdated text ("demo images", "separate popup"); omits Google Analytics (`G-WGB9EGCRD6`); no cookie/opt-out section; no effective date or contact email. | Rewrite into a complete, accurate Privacy Policy covering: file handling & 1-hour deletion, server logs, Google Analytics, Google AdSense & personalized ads opt-out (`adssettings.google.com`), GDPR/CCPA rights, and contact email. |
| **`/terms`** | `H1`: "Use the tools for files you can share" + 4 short paragraphs. | Very brief (~140 words); references "closing a popup ad" (removed feature); lacks governing law, DMCA/copyright, and liability clauses. | Rewrite into standard, clear Terms of Service with acceptable use, intellectual property, disclaimer of warranties, limitation of liability, and effective date. |
| **14 Working Tool Pages** (`/[slug]`) | Each has `H1`, summary, limits, workspace, `How this tool works`, `How to use it`, `What to expect`, 3 FAQs, 3 related tools, JSON-LD. | Well-structured! However, all 14 share the exact same template and `How this tool works` is only 2 sentences (~35 words). `ImageToolTip` promotes `imagecustomize.site`. | Enrich each tool's `intro` with real use cases, format-specific tips, and link to relevant `/blog/*` guides (e.g., link `/compress-pdf` to `/blog/compress-pdf-under-100kb-200kb`) to strengthen internal topic clusters. |
| **8 Coming Soon Pages** (`/edit-pdf`, etc.) | `HTTP 200`, `noindex, follow`, excluded from `sitemap.xml`. | Good that they are `noindex`, but they still dilute UX when linked from the main grid. | Keep `noindex, follow` until built; remove `<AdSlot>` from these pages. |
| **`/blog` & 6 Blog Posts** | 6 original articles (797–1,145 words each) with `BlogPosting` + `FAQPage` + `BreadcrumbList` JSON-LD. | Strongest content on the site. Minor issue: all 6 posts share the same `publishedAt` (`2026-11-15`) and generic author (`Converter Technical Team`), and `BlogPostPage.tsx` only parses markdown links (no bold/inline code). | Stagger/maintain accurate dates, add a real author/editorial bio, add `og:image` per post or site-wide, and expand markdown renderer if needed. |
