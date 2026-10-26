# Deployment

Convarter is meant to run on your own server behind HTTPS. Local development and production use the same code and different environment variables.

## Containers

`docker compose up -d --build` starts:

- `backend` on `127.0.0.1:8000`
- `frontend` on port `8080`, proxying `/api` to the backend

Open `http://SERVER:8080` only while you are testing. For a public site, put Caddy or Nginx in front and do not expose the backend port.

Postgres and Redis are defined but not used by this release. Start them later with:

```bash
docker compose --profile full up -d
```

Change `POSTGRES_PASSWORD` before you do that. The application will not connect to them until accounts and job history are built.

Temporary PDFs live in the `pdf-storage` volume. They are deleted after `JOB_TTL_SECONDS` and again when the backend process starts.

If you raise `MAX_TOTAL_SIZE_MB` above 100, also raise `client_max_body_size` in `frontend/nginx.conf`.

## HTTPS with Caddy

Point the domain's DNS at the server, then run Caddy on the host:

```caddy
pdf.example.com {
    encode gzip
    reverse_proxy 127.0.0.1:8080
}
```

Caddy requests a certificate automatically. Set `CORS_ORIGINS=https://pdf.example.com` if any browser will call the API on a different origin. The normal Docker setup is same-origin, so CORS is only needed for local Vite.

## HTTPS with host Nginx

```nginx
server {
    listen 443 ssl;
    server_name pdf.example.com;
    client_max_body_size 120m;

    # ssl_certificate and ssl_certificate_key from your certificate provider

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 180s;
    }
}
```

Redirect port 80 to HTTPS. Do not publish Postgres or Redis on a public interface.

## Production build without Docker

```bash
cd frontend
VITE_API_URL=https://pdf.example.com npm run build
```

Serve `frontend/dist` as static files and proxy `/api` to Uvicorn. If the site and API share a domain, leave `VITE_API_URL` empty and proxy `/api` instead. That is what the included Nginx config does.

Run Uvicorn behind the proxy:

```bash
cd backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Use a process manager such as systemd. Send logs to the journal. Do not log uploaded filenames if they might be sensitive; the app already avoids document text and shortens download paths in request logs.

## Health checks

- Backend: `GET /api/health`
- Frontend container: `GET /healthz`

## Operations

- Logs: `docker compose logs -f backend`
- Disk: the storage volume grows only with in-progress and unexpired jobs. Restarting the backend deletes leftovers.
- Secrets: keep `.env` on the server. Commit `.env.example` only.
- Backups: there is no document database to back up. Back up the deployment config, not the temporary PDF volume.

## Adding a tool later

1. Add a function under `backend/app/services/pdf/`.
2. Add a route in `backend/app/api/routes/tools.py` and a catalog entry.
3. Add a `status: "available"` entry in `frontend/src/lib/tools.ts`.
4. Add options in `ToolOptionsForm` and `appendOptions` if the tool needs them.
5. Add an API test that uses a real file and checks the download bytes.
