# Project status

Last updated: 2026-11-04

## Verified

- Backend: 36 pytest tests passed in the backend Docker image (LibreOffice, Ghostscript, and Playwright Chromium installed), including Word, Excel, PowerPoint, HTML, and PDF/A downloads, and the new safety tests in `tests/test_safety.py`.
- Frontend: 19 vitest tests passed and the TypeScript check passed.
- The Compose stack (Next.js and the converter) was built and run locally. Through Next.js: health checks, merge and download, Word to PDF, the request size limit, `/api/docs` not reachable, and the converter rejecting requests without the token.

## Done

- Original Converter interface: navigation, search, categories, tool pages, upload, options, progress, success, and error states.
- Fourteen working tools wired to the API: merge, split, compress, rotate, PDF to JPG, JPG to PDF, PDF to Word, Word to PDF, PDF to Excel, Excel to PDF, PDF to PowerPoint, PowerPoint to PDF, HTML to PDF, and PDF to PDF/A.
- FastAPI converter with content checks, size and page limits, per-job temporary folders, expiring downloads, and startup cleanup. It is internal: only Next.js calls it, optionally with `CONVERTER_TOKEN`.
- Next.js public API under `/api`. It records each job in SQLite through Prisma 7, streams uploads to the converter, and streams downloads back. See docs/DATABASE.md.
- Each conversion runs in its own process, is killed after `CONVERSION_TIMEOUT_SECONDS`, and is limited to `MAX_CONCURRENT_JOBS` at once. Page rendering stays within `MAX_IMAGE_PIXELS`, and repeated page ranges are processed once.
- Next.js rejects requests larger than `MAX_REQUEST_MB` while they stream. Containers have memory limits.
- Automated backend tests for valid files, invalid files, ranges, limits, downloads, and cleanup.
- Frontend tests for the tool registry, file checks, page lists, and API errors.
- Dockerfiles, Compose with named volumes, health checks, `.env.example`, and a GitHub Actions workflow that runs the tests and builds both images.
- Coming soon entries for editing, OCR, repair, and security tools. They do not process files.
- Convert PDF page at `/convert-pdf` with Convert to PDF and Convert from PDF. The header labels the landing page Home.
- Reserved ad spaces under the header, on the home page, on content and tool pages, and above the footer. They show demo creatives until AdSense ids are set in the environment. A closable popup returns 20 seconds after it is dismissed and is not an AdSense unit.

## Not built

- OCR, editing, watermarks, page numbers, signatures, passwords, and repair
- User accounts, history, quotas, payments, and an admin dashboard. The `Job` table and the Next.js routes are where these attach.
- A persistent job queue. A job waits up to `QUEUE_TIMEOUT_SECONDS` for a free slot, then gets a `busy` answer.
- Postgres and Redis. SQLite is used for now. Postgres is reserved in the `full` Compose profile. docs/DATABASE.md lists the move.
- Object storage. Files stay on local disk, with the job store isolated so a later S3 path can replace it.
- Hosting setup. HTTPS, rate limiting, and automatic deploys come from wherever the site is hosted. The Oracle VM scripts and Nginx proxy were removed.

## Limitations

- A text PDF that is already small may not shrink. The compress tool returns a valid PDF and reports that nothing was saved.
- Low compression can downsample pages that contain images. High quality does not rasterize the page.
- Encrypted PDFs are rejected.
- GIF and WebP are not accepted. JPG to PDF accepts JPG and JPEG only.
- PDF to Word, Excel, and PowerPoint keep page order and extractable content. Complex layout, exact fonts, and scanned pages are not reconstructed perfectly. PDF to Excel reads tables. Picture mode for PowerPoint is identified in the result.
- PDF/A is checked for its marker, output intent, page count, and a Ghostscript read. It is not certified with veraPDF.
- HTML addresses that resolve to private or local networks are rejected. Uploaded HTML cannot load other sites or local files. The address check can be bypassed by DNS rebinding, so the server should also block private ranges at the network level (README, Production).
- Finished downloads are reloaded from `job.json` after a restart. Incomplete uploads are still removed.
- Conversions stop after `CONVERSION_TIMEOUT_SECONDS`, plus up to 5 seconds to clean up.
- PyMuPDF 2 is the installed rendering library. Its package also installs the dependencies it declares, including image and layout libraries. That makes the backend environment larger than a minimal PyMuPDF 1.x install.

## Next step

Add accounts (Better Auth with Prisma), then link `Job` rows to users and add daily limits in the `/api/v1/tools/[tool]` route. Payments come after that.

## How to continue

1. Run `make test`. On Windows, run the backend tests in the backend Docker image, and run `npm test` in `frontend/`.
2. Run `make backend` and `make frontend`. `npm run dev` applies database migrations first.
3. Read "Production" in the README before pointing a domain at the server.
