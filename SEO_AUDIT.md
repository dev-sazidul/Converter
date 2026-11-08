# On-page SEO audit — bestconvert.site

Audit date: 8 November 2026. The public site is https://bestconvert.site/. The interface brand remains Convarter. This file records what was wrong, what changed in the codebase, and what still needs a deploy. It does not claim a Google ranking or that the live site has already been re-crawled.

## Problems discovered

The live site before this change already rendered HTML on the server, with a title, description, canonical URL, Open Graph tags, Twitter card, sitemap, and robots.txt. These gaps were still holding pages back:

- The homepage title was “Home — Convarter”, so it did not say what the product does.
- Tool titles and descriptions were short and similar. Pages had one summary sentence, one H1, and no steps, limits, or questions.
- Coming soon tools (Edit, Watermark, Page numbers, Repair, OCR, Protect, Unlock, Sign) were in the sitemap and were indexable, even though they do not process files.
- Tool pages had a breadcrumb in the page, but the structured data did not match a full Home / All tools / Tool trail, and working tools used a generic WebApplication type without a visible FAQ.
- There was no 1200×630 share image, so Open Graph has no `og:image`.
- Advertisement placeholders did not reserve their real width and height, which can shift the layout when they load.
- `SITE_URL` fell back to a localhost address. A build that forgot the env var would publish localhost canonicals. The current live sitemap already uses https://bestconvert.site, so production env was set, but the fallback was unsafe.

A separate problem showed up while preparing the build. `frontend/tailwind.config.js` and `frontend/init` contained an obfuscated script, and `package.json` ran `node init` before `dev`, `build`, and `start`. That script was removed and is not part of the SEO work. If it ever ran on a machine, review that machine and rotate any credentials that were present. Do not restore those files from an old copy without checking them.

## Changes implemented

- Unique title and meta description for the homepage, all-tools page, convert page, help, about, privacy, terms, and each of the 14 working tools.
- Each working tool page now has one H1, then H2 sections for how it works, how to use it, what to expect, questions, and related tools. Questions use H3.
- FAQ text on the page and FAQ structured data come from the same source. Help uses the same pattern for its three existing questions.
- Working tools use `SoftwareApplication` with a free offer (price 0 USD), plus `BreadcrumbList` for Home / All tools / the tool. No ratings or reviews were added.
- Coming soon pages stay available for people, return HTTP 200, and use `noindex, follow`. They are not in the sitemap and do not use `SoftwareApplication`.
- Unknown URLs stay HTTP 404 with `noindex`.
- Sitemap has 21 URLs: `/`, `/tools`, `/convert-pdf`, `/help`, `/about`, `/privacy`, `/terms`, and the 14 working tools. robots.txt allows crawling and points at `https://bestconvert.site/sitemap.xml`.
- Canonicals, Open Graph, and Twitter cards resolve from `SITE_URL`, which now defaults to `https://bestconvert.site`.
- Homepage copy links to every working tool, `/tools`, and `/convert-pdf`. Each tool links to three related working tools. Breadcrumbs link Home and All tools.
- Ad placeholders set width and height, load lazily, and use low fetch priority so they are less likely to become the largest contentful paint.
- Plus Jakarta Sans still uses `display: swap`.

The colors, header, upload flow, and conversion API were not redesigned. The Python converter code was not changed.

## Pages optimized

| Path | Index | Primary phrase |
| --- | --- | --- |
| `/` | yes | Free PDF converter online |
| `/tools` | yes | All free PDF tools |
| `/convert-pdf` | yes | Convert PDF online |
| `/help` | yes | PDF tool help |
| `/about` | yes | About Convarter PDF tools |
| `/privacy` | yes | Privacy policy |
| `/terms` | yes | Terms of use |
| `/merge-pdf` | yes | Merge PDF online free |
| `/split-pdf` | yes | Split PDF online free |
| `/compress-pdf` | yes | Compress PDF online free |
| `/rotate-pdf` | yes | Rotate PDF pages online |
| `/pdf-to-jpg` | yes | PDF to JPG converter |
| `/jpg-to-pdf` | yes | JPG to PDF converter |
| `/pdf-to-word` | yes | PDF to Word converter |
| `/word-to-pdf` | yes | Word to PDF converter |
| `/pdf-to-excel` | yes | PDF to Excel converter |
| `/excel-to-pdf` | yes | Excel to PDF converter |
| `/pdf-to-powerpoint` | yes | PDF to PowerPoint converter |
| `/powerpoint-to-pdf` | yes | PowerPoint to PDF converter |
| `/html-to-pdf` | yes | HTML to PDF converter |
| `/pdf-to-pdfa` | yes | PDF to PDF/A converter |
| `/edit-pdf`, `/watermark-pdf`, `/page-numbers`, `/repair-pdf`, `/ocr-pdf`, `/protect-pdf`, `/unlock-pdf`, `/sign-pdf` | no | Coming soon. Not targeted as working tools. |

Secondary phrases used in body copy, not stuffed into titles, include page order, page ranges, file size, JPG and JPEG only, DOC/DOCX, XLS/XLSX, PPT/PPTX, public HTML addresses, and PDF/A-1b, 2b, and 3b.

## Technical checks

Production build completed with `SITE_URL=https://bestconvert.site`.

Rendered HTML for every static page was checked:

- One H1 each.
- No duplicate titles.
- No duplicate meta descriptions.
- Canonicals use `https://bestconvert.site`.
- Working tools include the intro, steps, questions, related links, `SoftwareApplication`, `FAQPage`, and `BreadcrumbList` in the server HTML.
- Coming soon pages are `noindex, follow` and are absent from the sitemap.
- Help includes the same FAQ questions in the HTML and in `FAQPage` data.
- Open Graph title and Twitter card are present.

Browser check on the local production server:

- Merge PDF shows the new H1, steps, questions, and related links. The file picker is still there.
- No horizontal overflow at 320, 390, 768, 1280, and 1920 pixels.
- At 1280 the desktop navigation is visible and the hamburger is hidden. At 390 the hamburger is visible.

The converter API was not running on port 8000 during this check, so a new file was not uploaded. The upload screen for Merge PDF still renders. Conversion code was not edited.

## Remaining issues

- https://bestconvert.site still serves the previous HTML until this build is deployed. Deploy with `SITE_URL=https://bestconvert.site`.
- There is no Open Graph image. Add a real 1200×630 image before referencing one. Do not invent a screenshot.
- The hero still says “Usually ready in seconds”. That line was already on the page. New copy does not promise a processing time.
- PDF to PDF/A checks archive markers. It is not a full ISO or veraPDF certification, and the page says so.
- Coming soon URLs still respond with 200. That is intentional so people can read that the tool is not available. They should not be indexed.
- Search Console, Bing Webmaster, and analytics were not connected from this codebase. Submit the sitemap after deploy if those accounts exist. That does not by itself create rankings.
- Tool pages ship about 135 kB of shared JavaScript. The important text is in the first HTML response, so crawlers do not need that script to read the page.

## Recommended next steps

1. Deploy this frontend build. Confirm `https://bestconvert.site/sitemap.xml` no longer lists `/edit-pdf` or `/sign-pdf`, and that `/merge-pdf` shows the new title.
2. In Google Search Console, inspect `/`, `/merge-pdf`, and `/edit-pdf` after deploy. The first two should be indexable. The third should report `noindex`.
3. Add a real share image and set `og:image` only after that file exists.
4. When a coming soon tool ships, remove its noindex rule, add it to the sitemap, and write its own steps and questions before marking it indexable.
