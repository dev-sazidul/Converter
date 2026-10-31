# Deploy Convarter on an Oracle Cloud VM

This repository runs as three containers on one virtual machine: the Python API, the React site, and an Nginx proxy. Nginx publishes ports 80 and 443, routes `/api/` to the API, and serves the site from the same origin. Uploaded PDFs stay in a host directory, not in the container filesystem.

GitHub Actions runs the tests, builds the three images, and then SSHes to the VM as a restricted user. The SSH key can only run deploy, rollback, verify, and logs.

## Initial setup

Create an Ubuntu VM on the Always Free Ampere or AMD shape. Give it a public IP. In the VCN security list, allow inbound TCP 22, 80, and 443 from the internet. Do not open 8000 or the Postgres port.

Point a DNS `A` record at that public IP before requesting a certificate.

On the VM, install Git and clone the repository somewhere temporary, then run the bootstrap script as your operator user (the account that can `sudo`):

```bash
git clone git@github.com:OWNER/Convarter.git
cd Convarter
./deploy/oracle/bootstrap.sh git@github.com:OWNER/Convarter.git
```

Bootstrap installs Docker Engine and the Compose plugin if they are missing, clones the app to `/opt/convarter/app`, and creates:

- `/opt/convarter/data/storage` for PDFs, owned by uid `10001` (the API user inside the image)
- `/opt/convarter/data/certbot` for Let's Encrypt files
- `/opt/convarter/data/meta` for the current and previous commit ids
- `/opt/convarter/bin` for the only commands the deploy key may run
- a `deploy` user with no password and a sudo rule limited to those commands

Oracle Ubuntu images also filter ports with iptables. Insert accept rules. Do not flush the table, or you can lock yourself out of SSH:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

Create the server environment file as root. Start from the example and keep the real file only on the VM:

```bash
sudo cp /opt/convarter/app/.env.example /opt/convarter/app/.env
sudoedit /opt/convarter/app/.env
```

Set at least:

```bash
DOMAIN=pdf.example.com
HTTP_PORT=80
HTTPS_PORT=443
DATA_DIR=/opt/convarter/data
CERTBOT_EMAIL=you@example.com
CORS_ORIGINS=https://pdf.example.com
```

`DATA_DIR` must stay outside `/opt/convarter/app`. The deploy script refuses a data path inside the git checkout.

The server also needs permission to `git fetch` that repository. Use a read-only GitHub deploy key on the VM. That key is separate from the key GitHub Actions uses to log in.

Create an ed25519 key pair for Actions on your own computer. Do not commit either half. Put the public key on one line in `/home/deploy/.ssh/authorized_keys`:

```text
restrict,command="/opt/convarter/bin/ssh-dispatch.sh" ssh-ed25519 AAAA... github-actions
```

`restrict` disables port forwarding, agent forwarding, and a normal shell. The forced command is the only thing the key can start.

Confirm password authentication is already off in `sshd`. Leave the rest of `sshd` alone.

Start the stack once, from the app directory, so Nginx can answer the certificate challenge:

```bash
sudo docker compose --project-directory /opt/convarter/app -f /opt/convarter/app/docker-compose.yml up -d --build
sudo /opt/convarter/app/deploy/issue-cert.sh
```

`issue-cert.sh` reads `DOMAIN` and `CERTBOT_EMAIL` from `.env`, requests the certificate into `/opt/convarter/data/certbot`, and recreates only the proxy container. After that, port 80 redirects to HTTPS except for the ACME challenge path.

## Docker commands

From `/opt/convarter/app` on the server:

```bash
sudo docker compose ps
sudo docker compose logs --tail=200
sudo docker compose up -d --build --remove-orphans
sudo docker compose exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/health').read())"
```

Images:

- `backend/Dockerfile` installs Python 3.12, PyMuPDF's runtime libraries (`libglib2.0-0`, `libgl1`, `libgomp1`), LibreOffice Writer, Calc, and Impress, Ghostscript, and Playwright's Chromium. It runs Uvicorn as uid `10001`. Chromium is started with `--no-sandbox` because the container already drops new privileges. The image is larger because those converters are included. Set `CONVERSION_TIMEOUT_SECONDS` if a conversion should stop sooner than 120 seconds. `PDFA_ICC_PATH` can point at an sRGB profile; otherwise Ghostscript's own profile is used.
- `frontend/Dockerfile` builds the Vite app and serves it with Nginx, including `GET /healthz` and `/api/` proxying.
- `deploy/proxy/Dockerfile` is the public Nginx. It terminates TLS when the certificate files exist and proxies `/api/` to the API with a 120 MB body limit and a 180 second read timeout.

Health checks:

- API container: `GET /api/health` must return `{"status":"ok"}`. It returns 503 when the storage directory is not writable.
- Site container and proxy: `GET /healthz` returns `ok`.

Postgres and Redis are behind the Compose profile `full`. This release does not use them. Do not start that profile for a normal deploy.

Local Compose, without a certificate, publishes `http://127.0.0.1:8080` when `HTTP_PORT` is left at `8080`.

## GitHub secrets

Add these repository secrets. Actions will not print the private key on purpose, and the workflow does not write it into the repository.

| Secret | Value |
| --- | --- |
| `SSH_HOST` | VM public IP or DNS name |
| `SSH_USER` | `deploy` |
| `SSH_PORT` | `22`, or your custom port |
| `SSH_PRIVATE_KEY` | Private half of the Actions key, including the BEGIN and END lines |
| `SSH_KNOWN_HOSTS` | One line from `ssh-keyscan -H YOUR_HOST` |

Do not put `.env`, the certificate private key, or AdSense values in GitHub. Those stay in `/opt/convarter/app/.env` and `/opt/convarter/data/certbot`.

## CI/CD

`.github/workflows/deploy.yml` runs on pull requests and pushes to `main`.

1. **Test.** Python 3.12 runs `pytest`. Node 22 runs the typecheck and Vitest.
2. **Build.** The runner builds the backend, frontend, and proxy images. This proves the Dockerfiles build. Images are not pushed to a registry.
3. **Deploy.** Only a push to `main` continues. The job SSHes to the VM and sends the command `deploy`.

On the VM that command runs `/opt/convarter/bin/remote-deploy.sh` as root through the sudo rule. The script:

1. Records the current commit in `/opt/convarter/data/meta/previous-release.txt`.
2. Fast-forwards `/opt/convarter/app` to `origin/main`. Untracked `.env` is left alone. The script does not run `git clean`.
3. Runs `docker compose up -d --build --remove-orphans`.
4. Runs `deploy/verify.sh`.
5. Copies the new scripts into `/opt/convarter/bin` for the next connection.

It does not run `docker compose down -v`, `docker volume rm`, `docker system prune --volumes`, or `rm` on the data directory.

## Verification and logs

`deploy/verify.sh` checks `/healthz` and `/api/health`, merges two one-page PDFs through the public proxy, and checks that the download starts with `%PDF`. A normal deploy runs this before it reports success. Run it again with:

```bash
ssh -i actions_key deploy@YOUR_HOST verify
```

Logs:

```bash
ssh -i actions_key deploy@YOUR_HOST logs
```

That prints the last 200 lines from all three services. On the VM, `sudo docker compose logs -f backend` follows the API log. The API does not log document text.

## Rollback

The commit from before the latest deploy is stored at `/opt/convarter/data/meta/previous-release.txt`.

```bash
ssh -i actions_key deploy@YOUR_HOST rollback
```

Rollback checks out that commit, rebuilds the containers, and runs the same verification. It does not delete `/opt/convarter/data/storage`, `.env`, or certificates.

Roll back only to a commit that already contains this Compose layout. The first deploy records whatever commit was checked out before the update. If that older commit has no proxy service, rebuild it by checking out `main` again with `deploy` after you fix the bad commit.

A second rollback does not walk further back. It returns to the same recorded commit until a newer deploy replaces `previous-release.txt`.

## What a deploy leaves in place

- `/opt/convarter/data/storage`, including finished downloads that have not expired
- `/opt/convarter/app/.env`
- `/opt/convarter/data/certbot`

Finished jobs are stored with a `job.json` file beside the PDF. Replacing the API container reloads unexpired jobs. Incomplete directories and files that are not valid jobs are still removed when the API starts, and expired jobs are still deleted after `JOB_TTL_SECONDS`. Restarting the API does not delete the storage directory.

## Troubleshooting

**`/api/health` returns 503.** The storage directory is missing or not writable by uid `10001`. Check `ls -ldn /opt/convarter/data/storage` and run the chown from `remote-deploy.sh` again. Do not delete the directory.

**The site loads and `/api` returns 502.** The API container is unhealthy. Read `sudo docker compose logs --tail=100 backend`. A missing shared library for PyMuPDF shows up there. The backend image already installs `libglib2.0-0`, `libgl1`, and `libgomp1`.

**Uploads fail at the proxy.** Nginx allows 120 MB. The application still enforces `MAX_FILE_SIZE_MB` and `MAX_TOTAL_SIZE_MB` from `.env`. Raise both together if you change the product limit, including `client_max_body_size` in `frontend/nginx.conf` and `deploy/proxy/https.conf.template`.

**Certificate request fails.** DNS must already point at this VM, ports 80 must be open in both the security list and iptables, and the proxy must be running so `/.well-known/acme-challenge/` is served. Then rerun `sudo /opt/convarter/app/deploy/issue-cert.sh`.

**SSH from Actions fails immediately.** Check `SSH_KNOWN_HOSTS` with `ssh-keyscan -H`, the forced command on the authorized key, and that `SSH_USER` is `deploy`. A normal shell is supposed to be refused.

**Port 80 is open in the security list but still times out.** The VM iptables rules are still rejecting it. Insert the accept rules above. Do not flush the chain.

**A deploy stopped halfway.** The previous commit id is already saved. Run `rollback` if the new release is bad. If the failure was only verification, fix the problem and push again. Neither path removes uploads.
