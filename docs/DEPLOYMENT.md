The deployment guide is [DEPLOYMENT.md](../DEPLOYMENT.md).

## Adding a tool later

1. Add a function under `backend/app/services/pdf/` or `backend/app/services/convert/`.
2. Add a route in `backend/app/api/routes/tools.py` and a catalog entry.
3. Add a `status: "available"` entry in `frontend/src/lib/tools.ts`.
4. Add options in `ToolOptionsForm` and `appendOptions` if the tool needs them.
5. Add an API test that uses a real file and checks the download bytes.
