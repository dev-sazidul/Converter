# API overview

Interactive docs are served by the backend at `/api/docs` when it is running. This page is the short version.

Base URL in local development: `http://127.0.0.1:8000`

The browser app calls the same paths. In development, the NestJS server proxies `/api` to the backend. In Docker, Nginx does the same, so the public site uses a relative `/api` path.

## Health and limits

`GET /api/health`

```json
{ "status": "ok" }
```

Returns 503 when the temporary storage directory is not writable.

`GET /api/v1/meta`

Returns the public limits and the working tools. It does not include filesystem paths.

## Processing

All tool routes accept `multipart/form-data`. Send one or more parts named `files`. Options are normal form fields.

A successful response looks like:

```json
{
  "job_id": "uuid",
  "filename": "convarter-merged.pdf",
  "media_type": "application/pdf",
  "size_bytes": 12345,
  "download_url": "/api/v1/jobs/uuid/download",
  "expires_in_seconds": 3600,
  "meta": { "page_count": 4, "output_kind": "pdf" }
}
```

`output_kind` is `pdf`, `jpeg`, or `zip`.

Download the result with `GET /api/v1/jobs/{job_id}/download`. The id must be the UUID from the processing response. The response is an attachment. Unknown, expired, or malformed ids return 404.

## Tools

| Tool | Path | Files | Extra fields |
| --- | --- | --- | --- |
| Merge | `POST /api/v1/tools/merge` | 2 or more PDFs | none |
| Split | `POST /api/v1/tools/split` | 1 PDF | `mode` (`ranges`, `pages`, `interval`), `ranges`, `interval`, `separate` (`true` or `false`) |
| Compress | `POST /api/v1/tools/compress` | 1 or more PDFs | `quality` (`high`, `medium`, `low`) |
| Rotate | `POST /api/v1/tools/rotate` | 1 or more PDFs | `angle` (`90`, `180`, `270`), `pages` (`all` or a range such as `1,3-5`) |
| PDF to JPG | `POST /api/v1/tools/pdf-to-jpg` | 1 PDF | `dpi` (`96`, `150`, `200`), `pages` |
| JPG to PDF | `POST /api/v1/tools/jpg-to-pdf` | 1 or more JPG or JPEG | `page_size` (`fit`, `a4`, `letter`), `orientation` (`portrait`, `landscape`), `margin` (`none`, `small`, `medium`) |
| PDF to Word | `POST /api/v1/tools/pdf-to-word` | 1 PDF | none |
| Word to PDF | `POST /api/v1/tools/word-to-pdf` | 1 DOC or DOCX | none |
| PDF to Excel | `POST /api/v1/tools/pdf-to-excel` | 1 PDF | none |
| Excel to PDF | `POST /api/v1/tools/excel-to-pdf` | 1 XLS or XLSX | none |
| PDF to PowerPoint | `POST /api/v1/tools/pdf-to-powerpoint` | 1 PDF | `mode` (`editable` or `image`) |
| PowerPoint to PDF | `POST /api/v1/tools/powerpoint-to-pdf` | 1 PPT or PPTX | none |
| HTML to PDF | `POST /api/v1/tools/html-to-pdf` | 1 HTML file, or no file when `source` is `url` | `source` (`file` or `url`), `url`, `page_size` (`a4` or `letter`) |
| PDF to PDF/A | `POST /api/v1/tools/pdf-to-pdfa` | 1 PDF | `level` (`1b`, `2b`, or `3b`) |

Page numbers are 1-based. A range list looks like `1-3,5`.

`quality=high` keeps as much detail as possible. `medium` recompresses images. `low` also downsamples pages that contain images. If a file cannot be made smaller, the original bytes are returned and `saved_bytes` is 0.

Several outputs are packed into a ZIP. A single output is returned directly.

PDF to Word copies text, tables, and images. The `note` field says that complex layouts may not match. PDF to Excel puts each detected table on its own sheet. If no table is found, selectable text is written in rows and `mode` is `text`. A PDF with neither tables nor text returns `processing_failed`. PDF to PowerPoint uses `mode=editable` to place selectable text, or `mode=image` to place a picture of each page. The result `mode` is `editable`, `image`, or `mixed`, and `note` says which one was used.

Word, Excel, and PowerPoint conversion uses LibreOffice. HTML file conversion renders the upload with scripts and network access disabled. HTML URL conversion allows only public `http` and `https` addresses and checks every request the page makes. PDF/A conversion uses Ghostscript. A download is returned only after the PDF/A marker, output intent, page count, and a Ghostscript read check succeed. `pdfa_checked` is `yes` in that case. This is not a full ISO veraPDF certification, and `note` says so.

Office and HTML conversions run in a worker thread and stop after `CONVERSION_TIMEOUT_SECONDS`. HTML navigation stops after `HTML_NAVIGATION_TIMEOUT_SECONDS`.

## Errors

Errors use this shape:

```json
{ "error": { "code": "invalid_pdf", "message": "A short explanation." } }
```

| Code | When |
| --- | --- |
| `empty_upload` | No file, or fewer files than the tool requires |
| `too_many_files` | More than the configured file count |
| `file_too_large` | One file exceeds the per-file limit |
| `total_too_large` | The combined upload exceeds the total limit |
| `unsupported_type` | The bytes are not a type this tool accepts |
| `invalid_pdf` | The PDF header or structure is unreadable |
| `invalid_document` | An office file is damaged or has too many internal parts |
| `invalid_image` | The image is damaged or too large |
| `encrypted_pdf` | A password is required |
| `too_many_pages` | The PDF exceeds the page limit |
| `invalid_range` | The page list does not fit the document |
| `invalid_option` | A form value is not one of the allowed choices |
| `processing_failed` | Processing failed. The message does not include server paths or exception text |
| `not_found` | The download is unknown or already removed |

## Example

```bash
curl -s -F "files=@a.pdf" -F "files=@b.pdf" http://127.0.0.1:8000/api/v1/tools/merge
```

Use the `download_url` from the JSON for the second request.

```bash
curl -L -o merged.pdf http://127.0.0.1:8000/api/v1/jobs/JOB_ID/download
```
