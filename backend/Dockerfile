FROM python:3.12-slim AS packages

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build
COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STORAGE_DIR=/data/storage

# PyMuPDF needs libglib, libgl, and libgomp. Office conversion needs LibreOffice,
# PDF/A needs Ghostscript, and HTML to PDF needs Chromium from Playwright.
# These are the conversion engines. They make the image larger on purpose.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
        libgomp1 \
        ghostscript \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-spa \
        tesseract-ocr-fra \
        tesseract-ocr-deu \
        tesseract-ocr-ita \
        tesseract-ocr-por \
        fonts-liberation \
        fontconfig \
        libreoffice-writer \
        libreoffice-calc \
        libreoffice-impress \
        libxinerama1 \
        libxrender1 \
        libxext6 \
        libsm6 \
        libice6 \
        libcairo2 \
        libcups2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=packages /install /usr/local
RUN python -m playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright

RUN adduser --disabled-password --gecos "" --uid 10001 appuser \
    && mkdir -p /data/storage \
    && chown appuser:appuser /data/storage

WORKDIR /app
COPY app ./app

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
