# API overview

Interactive docs are served by the backend at `/api/docs` when it is running. This page is the short version.

Base URL in local development: `http://127.0.0.1:8000`

The browser app calls the same paths. In development, Vite proxies `/api` to the backend. In Docker, Nginx does the same, so the public site uses a relative `/api` path.

## Health and limits

`GET /api/health`

```json
{ "status": "ok" }
```

Returns 503 when the temporary storage directory is not writable.

`GET /api/v1/meta`

Returns the public limits and the six working tools. It does not include filesystem paths.

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
| JPG to PDF | `POST /api/v1/tools/jpg-to-pdf` | 1 or more JPG/PNG | `page_size` (`fit`, `a4`, `letter`), `orientation` (`portrait`, `landscape`), `margin` (`none`, `small`, `medium`) |

Page numbers are 1-based. A range list looks like `1-3,5`.

`quality=high` keeps as much detail as possible. `medium` recompresses images. `low` also downsamples pages that contain images. If a file cannot be made smaller, the original bytes are returned and `saved_bytes` is 0.

Several outputs are packed into a ZIP. A single output is returned directly.

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
| `unsupported_type` | The bytes are not a PDF, or not a JPG/PNG for the image tool |
| `invalid_pdf` | The PDF header or structure is unreadable |
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
