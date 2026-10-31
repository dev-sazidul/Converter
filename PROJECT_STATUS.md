# Project status

Last updated: 2026-10-31

## Verified

- Backend: 27 pytest tests passed, including Word, Excel, PowerPoint, HTML, and PDF/A downloads.
- Frontend: 9 vitest tests passed and the TypeScript check passed.
- LibreOffice 26.8, Ghostscript 10.08, and Playwright Chromium were used for those conversion tests.
- Docker image builds were not run from this workspace. Docker is not installed here. The Dockerfiles include the conversion packages for the server.

## Done

- Original Convarter interface: navigation, search, categories, tool pages, upload, options, progress, success, and error states.
- Fourteen working tools wired to the API: merge, split, compress, rotate, PDF to JPG, JPG to PDF, PDF to Word, Word to PDF, PDF to Excel, Excel to PDF, PDF to PowerPoint, PowerPoint to PDF, HTML to PDF, and PDF to PDF/A.
- FastAPI backend with content checks, size and page limits, per-job temporary folders, expiring downloads, and startup cleanup.
- Automated backend tests for valid files, invalid files, ranges, limits, downloads, and cleanup.
- Frontend tests for the tool registry, file checks, page lists, and API errors.
- Dockerfiles, Compose, Nginx reverse proxy, health checks, `.env.example`, and deployment notes.
- Coming soon entries for editing, OCR, repair, and security tools. They do not process files.
- Convert PDF page at `/convert-pdf` with Convert to PDF and Convert from PDF. The header labels the landing page Home.
- Reserved ad spaces under the header, on the home page, on content and tool pages, and above the footer. They show demo creatives until AdSense ids are set in the environment. A closable popup returns 20 seconds after it is dismissed and is not an AdSense unit.
- Oracle Cloud deployment files: Compose, Nginx proxy, host data directory, and a GitHub Actions workflow that tests, builds images, and deploys over a restricted SSH command. See DEPLOYMENT.md. A live VM deploy was not run from this workspace.

## Not built

- OCR, editing, watermarks, page numbers, signatures, passwords, and repair
- User accounts, history, quotas, payments, and an admin dashboard
- A separate job queue. Conversions run in a worker thread with a timeout so the API process keeps accepting requests.
- Postgres and Redis. They are reserved in the `full` Compose profile and are not connected.
- Object storage. Files stay on local disk, with the job store isolated so a later S3 path can replace it.

## Limitations

- A text PDF that is already small may not shrink. The compress tool returns a valid PDF and reports that nothing was saved.
- Low compression can downsample pages that contain images. High quality does not rasterize the page.
- Encrypted PDFs are rejected.
- GIF and WebP are not accepted. JPG to PDF accepts JPG and JPEG only.
- PDF to Word, Excel, and PowerPoint keep page order and extractable content. Complex layout, exact fonts, and scanned pages are not reconstructed perfectly. PDF to Excel reads tables. Picture mode for PowerPoint is identified in the result.
- PDF/A is checked for its marker, output intent, page count, and a Ghostscript read. It is not certified with veraPDF.
- HTML addresses that resolve to private or local networks are rejected. Uploaded HTML cannot load other sites or local files.
- Finished downloads are reloaded from `job.json` after a restart. Incomplete uploads are still removed.
- Conversions stop after `CONVERSION_TIMEOUT_SECONDS`.
- PyMuPDF 2 is the installed rendering library. Its package also installs the dependencies it declares, including image and layout libraries. That makes the backend environment larger than a minimal PyMuPDF 1.x install.
- Docker is not installed in the environment where this was built, so `docker compose up` has not been executed here. The Compose files are in place for the server.

## Next step

Add OCR only with a converter that is installed in this environment, and cover it with a test that checks the output file. Do not mark it Ready before that test passes.

## How to continue

1. Run `make test`.
2. Run `make backend` and `make frontend`.
3. Read `docs/DEPLOYMENT.md` before pointing a domain at the server.
