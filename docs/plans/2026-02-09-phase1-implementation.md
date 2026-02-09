# Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship 4 tools (image compress, background removal, video compress, video-to-gif) with a unified Python backend on Azure Container Apps, targeting ~379,700/mo search volume.

**Architecture:** Separate neatoolkit-api (Python FastAPI) deployed to its own Azure Resource Group under the shared subscription. Frontend (Next.js on Vercel) calls API endpoints. All media processing happens server-side: Pillow for images, rembg for background removal, ffmpeg for video. No ffmpeg.wasm, no COOP/COEP issues.

**Tech Stack:** Python 3.11, FastAPI, Pillow + pillow-heif, rembg[cpu], ffmpeg (system binary), Docker, Azure Container Apps. Frontend: Next.js 16, Tailwind v4, next-intl.

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Azure Resource Architecture](#azure-resource-architecture)
3. [API Design](#api-design)
4. [Task 1: Backend Project Scaffold](#task-1-backend-project-scaffold)
5. [Task 2: Image Compress Endpoint](#task-2-image-compress-endpoint)
6. [Task 3: Image Compress Frontend](#task-3-image-compress-frontend)
7. [Task 4: Background Removal Endpoint](#task-4-background-removal-endpoint)
8. [Task 5: Background Removal Frontend](#task-5-background-removal-frontend)
9. [Task 6: Video Compress Endpoint](#task-6-video-compress-endpoint)
10. [Task 7: Video Compress Frontend](#task-7-video-compress-frontend)
11. [Task 8: Video to GIF Endpoint](#task-8-video-to-gif-endpoint)
12. [Task 9: Video to GIF Frontend](#task-9-video-to-gif-frontend)
13. [Task 10: Azure Deployment](#task-10-azure-deployment)
14. [Task 11: Navigation & Homepage Update](#task-11-navigation-homepage-update)
15. [Task 12: SEO & i18n for All Tools](#task-12-seo-i18n-for-all-tools)
16. [Execution Order](#execution-order)

---

## Infrastructure Overview

```
Azure Subscription (shared free credits, expires 2026/6/1)
├── Resource Group: airesumeadvisor-rg (existing, DO NOT TOUCH)
│   └── Container Apps Environment → azure_container (AIResumeAdvisor)
│
└── Resource Group: neatoolkit-rg (NEW)
    └── Container Apps Environment
        └── Container App: neatoolkit-api
            ├── Image: neatoolkitacr.azurecr.io/neatoolkit-api:latest
            ├── CPU: 2 vCPU
            ├── Memory: 4 GB
            ├── Min replicas: 0 (scale to zero when idle)
            └── Max replicas: 1 (single instance for free tier)

Vercel (existing, $0)
└── neatoolkit.com → Next.js frontend
    └── Calls: https://neatoolkit-api.<env>.azurecontainerapps.io
```

### Cost Strategy

| Phase | Infra | Cost |
|-------|-------|------|
| Now - 2026/6/1 | Azure free credit | $0 |
| Post 6/1 (has traffic) | Hetzner CAX21 ARM 4vCPU/8GB | EUR 6.79/mo |
| Post 6/1 (no traffic) | Shut down | $0 |
| Future option | Mac Mini M4 + Cloudflare Tunnel | One-time ~$600 |

### Relocation Strategy

The entire backend is a single Docker image. Migration to any provider:

```bash
# Hetzner / any VPS
docker pull <registry>/neatoolkit-api:latest
docker run -p 8000:8000 --env-file .env neatoolkit-api:latest

# Mac Mini
docker compose up -d
# + Cloudflare Tunnel for HTTPS
```

No cloud-specific SDKs. No Azure SDK dependencies. Pure HTTP API + Docker.

---

## Azure Resource Architecture

```
neatoolkit-rg/
├── Container Apps Environment: neatoolkit-env
│   └── Container App: neatoolkit-api
├── Container Registry: neatoolkitacr (Basic tier, ~$5/mo from free credit)
└── Log Analytics Workspace: neatoolkit-logs (free tier)
```

### Container App Config

| Setting | Value | Reason |
|---------|-------|--------|
| CPU | 2 vCPU | ffmpeg encoding + u2net need parallel CPU |
| Memory | 4 GB | u2net model ~1.2GB peak + ffmpeg ~500MB + overhead |
| Min replicas | 0 | Scale to zero = $0 when idle |
| Max replicas | 1 | Free credit budget, single instance enough for early traffic |
| Ingress | External, port 8000 | Public HTTPS endpoint |
| Health probe | /health (HTTP GET) | Liveness check |

---

## API Design

### Base URL

- Production: `https://neatoolkit-api.<env>.azurecontainerapps.io`
- Local dev: `http://localhost:8000`

### Endpoints

| Method | Path | Input | Output | Timeout |
|--------|------|-------|--------|---------|
| GET | `/health` | - | `{"status": "ok"}` | 5s |
| POST | `/api/image/compress` | multipart (image + options) | compressed image (binary) | 30s |
| POST | `/api/image/remove-bg` | multipart (image) | PNG with transparent bg | 60s |
| POST | `/api/video/compress` | multipart (video + options) | compressed video (binary) | 300s |
| POST | `/api/video/to-gif` | multipart (video + options) | GIF (binary) | 300s |

### Common Headers

```
Request:
  Content-Type: multipart/form-data

Response:
  Content-Type: image/jpeg | image/png | image/webp | video/mp4 | image/gif
  Content-Disposition: attachment; filename="result.jpg"
  X-Original-Size: 1234567      (bytes)
  X-Compressed-Size: 234567     (bytes)
  X-Processing-Time: 1.23       (seconds)
```

### Error Response Format

```json
{
  "error": "file_too_large",
  "message": "File size exceeds 10MB limit",
  "max_size_mb": 10
}
```

### Rate Limiting (simple, in-memory)

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/image/* | 30 req | per minute per IP |
| /api/video/* | 10 req | per minute per IP |

### File Size Limits

| Endpoint | Max Upload | Reason |
|----------|-----------|--------|
| image/compress | 10 MB | Covers 99% of user images |
| image/remove-bg | 10 MB | u2net can handle larger but slow |
| video/compress | 200 MB | Practical limit for 4GB RAM |
| video/to-gif | 100 MB | GIF output can be huge, limit input |

---

## Task 1: Backend Project Scaffold

**Goal:** Create the neatoolkit-api project with FastAPI, Docker, health endpoint, CORS, and local dev setup.

**Files:**

- Create: `~/GitHub/neatoolkit-api/` (new repo)
- Create: `~/GitHub/neatoolkit-api/src/main.py`
- Create: `~/GitHub/neatoolkit-api/src/config.py`
- Create: `~/GitHub/neatoolkit-api/src/routers/__init__.py`
- Create: `~/GitHub/neatoolkit-api/src/routers/health.py`
- Create: `~/GitHub/neatoolkit-api/requirements.txt`
- Create: `~/GitHub/neatoolkit-api/Dockerfile`
- Create: `~/GitHub/neatoolkit-api/docker-compose.yml`
- Create: `~/GitHub/neatoolkit-api/.env.example`
- Create: `~/GitHub/neatoolkit-api/.gitignore`
- Create: `~/GitHub/neatoolkit-api/.dockerignore`
- Test: `~/GitHub/neatoolkit-api/tests/test_health.py`

**Step 1: Initialize project and install dependencies**

```bash
mkdir -p ~/GitHub/neatoolkit-api/src/routers ~/GitHub/neatoolkit-api/tests
cd ~/GitHub/neatoolkit-api
git init
python3 -m venv .venv
source .venv/bin/activate
```

**Step 2: Create requirements.txt**

```
# Web framework
fastapi==0.115.0
uvicorn[standard]==0.34.0
python-multipart==0.0.18

# Image processing
Pillow==11.1.0
pillow-heif==0.21.0

# Background removal
rembg[cpu]==2.0.57

# Video processing (ffmpeg installed via Dockerfile, not pip)

# Testing
pytest==8.3.4
pytest-asyncio==0.25.0
httpx==0.28.1

# Config
python-dotenv==1.0.1
```

**Step 3: Create src/config.py**

```python
import os
from dotenv import load_dotenv

load_dotenv()

ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "https://neatoolkit.com,https://www.neatoolkit.com,http://localhost:3000"
).split(",")

MAX_IMAGE_SIZE_MB = int(os.getenv("MAX_IMAGE_SIZE_MB", "10"))
MAX_VIDEO_SIZE_MB = int(os.getenv("MAX_VIDEO_SIZE_MB", "200"))
MAX_GIF_INPUT_SIZE_MB = int(os.getenv("MAX_GIF_INPUT_SIZE_MB", "100"))

RATE_LIMIT_IMAGE = int(os.getenv("RATE_LIMIT_IMAGE", "30"))  # per minute
RATE_LIMIT_VIDEO = int(os.getenv("RATE_LIMIT_VIDEO", "10"))  # per minute

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
```

**Step 4: Create src/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import ALLOWED_ORIGINS, ENVIRONMENT
from src.routers import health

app = FastAPI(
    title="Neatoolkit API",
    version="0.1.0",
    docs_url="/docs" if ENVIRONMENT == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=[
        "X-Original-Size",
        "X-Compressed-Size",
        "X-Processing-Time",
    ],
)

app.include_router(health.router)
```

**Step 5: Create src/routers/health.py**

```python
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/health")
async def health_check():
    return JSONResponse({"status": "ok"})
```

**Step 6: Create src/routers/__init__.py**

```python
# Router package
```

**Step 7: Write the failing test**

```python
# tests/test_health.py
import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app

@pytest.mark.asyncio
async def test_health_returns_ok():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 8: Run test to verify it passes**

```bash
cd ~/GitHub/neatoolkit-api
PYTHONPATH=. pytest tests/test_health.py -v
```

Expected: PASS

**Step 9: Create Dockerfile**

```dockerfile
# Stage 1: Build
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim

WORKDIR /app

# Install ffmpeg (for video processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY src/ src/
COPY .env.example .env

# Create non-root user
RUN useradd -m -r appuser && \
    mkdir -p /app/tmp && \
    chown -R appuser:appuser /app
USER appuser

# Temp directory for file processing
ENV TMPDIR=/app/tmp
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

**Step 10: Create docker-compose.yml**

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - ENVIRONMENT=development
    volumes:
      - ./src:/app/src  # hot reload in dev
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

**Step 11: Create .env.example**

```
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
MAX_IMAGE_SIZE_MB=10
MAX_VIDEO_SIZE_MB=200
MAX_GIF_INPUT_SIZE_MB=100
RATE_LIMIT_IMAGE=30
RATE_LIMIT_VIDEO=10
```

**Step 12: Create .gitignore and .dockerignore**

`.gitignore`:
```
.venv/
__pycache__/
*.pyc
.env
.pytest_cache/
tmp/
*.egg-info/
dist/
```

`.dockerignore`:
```
.venv/
__pycache__/
.git/
.pytest_cache/
tests/
*.md
.env
docker-compose.yml
```

**Step 13: Verify Docker build**

```bash
cd ~/GitHub/neatoolkit-api
docker compose build
docker compose up -d
curl http://localhost:8000/health
# Expected: {"status":"ok"}
docker compose down
```

**Step 14: Commit**

```bash
git add -A
git commit -m "feat: scaffold neatoolkit-api with FastAPI, Docker, health endpoint"
```

---

## Task 2: Image Compress Endpoint

**Goal:** POST /api/image/compress — accepts image upload, returns compressed image with quality/resize options.

**Files:**

- Create: `~/GitHub/neatoolkit-api/src/routers/image.py`
- Create: `~/GitHub/neatoolkit-api/src/services/image_service.py`
- Modify: `~/GitHub/neatoolkit-api/src/main.py` (add router)
- Test: `~/GitHub/neatoolkit-api/tests/test_image_compress.py`
- Test fixture: `~/GitHub/neatoolkit-api/tests/fixtures/sample.jpg` (small test image)

### API Spec

```
POST /api/image/compress
Content-Type: multipart/form-data

Fields:
  file: image file (required, max 10MB)
  quality: int 1-100 (optional, default 80)
  max_width: int (optional, no resize if omitted)
  max_height: int (optional, no resize if omitted)
  format: "jpeg" | "png" | "webp" (optional, auto-detect from input)

Response:
  200: compressed image binary
    Content-Type: image/jpeg | image/png | image/webp
    Content-Disposition: attachment; filename="compressed.jpg"
    X-Original-Size: 1234567
    X-Compressed-Size: 234567
    X-Processing-Time: 0.45

  400: {"error": "invalid_format", "message": "..."}
  413: {"error": "file_too_large", "message": "...", "max_size_mb": 10}
```

### Supported Formats

| Input | Output | Library |
|-------|--------|---------|
| JPEG | JPEG (mozjpeg quality) | Pillow |
| PNG | PNG (optimize=True) | Pillow |
| WebP | WebP (quality param) | Pillow |
| HEIC | JPEG (convert + compress) | pillow-heif + Pillow |

**Step 1: Write failing tests**

```python
# tests/test_image_compress.py
import io
import pytest
from PIL import Image
from httpx import ASGITransport, AsyncClient
from src.main import app

def create_test_image(width=800, height=600, format="JPEG") -> bytes:
    img = Image.new("RGB", (width, height), color="red")
    buf = io.BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()

@pytest.mark.asyncio
async def test_compress_jpeg_default_quality():
    image_bytes = create_test_image()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/image/compress",
            files={"file": ("test.jpg", image_bytes, "image/jpeg")},
        )
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert "X-Original-Size" in response.headers
    assert "X-Compressed-Size" in response.headers
    assert int(response.headers["X-Compressed-Size"]) <= int(response.headers["X-Original-Size"])

@pytest.mark.asyncio
async def test_compress_with_resize():
    image_bytes = create_test_image(width=2000, height=1500)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/image/compress",
            files={"file": ("test.jpg", image_bytes, "image/jpeg")},
            data={"max_width": "800"},
        )
    assert response.status_code == 200
    result_img = Image.open(io.BytesIO(response.content))
    assert result_img.width <= 800

@pytest.mark.asyncio
async def test_compress_png():
    image_bytes = create_test_image(format="PNG")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/image/compress",
            files={"file": ("test.png", image_bytes, "image/png")},
        )
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"

@pytest.mark.asyncio
async def test_compress_rejects_oversized_file():
    # Create a ~12MB file (exceeds 10MB limit)
    large_bytes = b"x" * (12 * 1024 * 1024)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/image/compress",
            files={"file": ("big.jpg", large_bytes, "image/jpeg")},
        )
    assert response.status_code == 413

@pytest.mark.asyncio
async def test_compress_rejects_non_image():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/image/compress",
            files={"file": ("test.txt", b"not an image", "text/plain")},
        )
    assert response.status_code == 400
```

**Step 2: Run tests to verify they fail**

```bash
PYTHONPATH=. pytest tests/test_image_compress.py -v
```

Expected: FAIL (no route /api/image/compress)

**Step 3: Implement image_service.py**

```python
# src/services/image_service.py
import io
import time
from PIL import Image

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "HEIF", "HEIC"}
FORMAT_CONTENT_TYPE = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}
FORMAT_EXTENSION = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}

def compress_image(
    file_bytes: bytes,
    quality: int = 80,
    max_width: int | None = None,
    max_height: int | None = None,
    output_format: str | None = None,
) -> dict:
    start = time.monotonic()
    original_size = len(file_bytes)

    img = Image.open(io.BytesIO(file_bytes))

    # Detect and normalize format
    src_format = img.format or "JPEG"
    if src_format in ("HEIF", "HEIC"):
        src_format = "JPEG"  # convert HEIC to JPEG

    out_format = (output_format or src_format).upper()
    if out_format not in FORMAT_CONTENT_TYPE:
        out_format = "JPEG"

    # Convert RGBA to RGB for JPEG
    if out_format == "JPEG" and img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Resize if requested (maintain aspect ratio)
    if max_width or max_height:
        w, h = img.size
        target_w = max_width or w
        target_h = max_height or h
        ratio = min(target_w / w, target_h / h)
        if ratio < 1:
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)

    # Compress
    buf = io.BytesIO()
    save_kwargs = {}
    if out_format == "JPEG":
        save_kwargs = {"quality": quality, "optimize": True}
    elif out_format == "PNG":
        save_kwargs = {"optimize": True}
    elif out_format == "WEBP":
        save_kwargs = {"quality": quality}

    img.save(buf, format=out_format, **save_kwargs)
    compressed_bytes = buf.getvalue()

    elapsed = time.monotonic() - start

    return {
        "data": compressed_bytes,
        "content_type": FORMAT_CONTENT_TYPE[out_format],
        "extension": FORMAT_EXTENSION[out_format],
        "original_size": original_size,
        "compressed_size": len(compressed_bytes),
        "processing_time": round(elapsed, 2),
    }
```

**Step 4: Implement image router**

```python
# src/routers/image.py
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response

from src.config import MAX_IMAGE_SIZE_MB
from src.services.image_service import compress_image

router = APIRouter(prefix="/api/image", tags=["image"])

@router.post("/compress")
async def compress(
    file: UploadFile = File(...),
    quality: int = Form(80),
    max_width: int | None = Form(None),
    max_height: int | None = Form(None),
    format: str | None = Form(None),
):
    # Validate content type
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        return JSONResponse(
            status_code=400,
            content={"error": "invalid_format", "message": "File must be an image"},
        )

    # Read and validate size
    file_bytes = await file.read()
    max_bytes = MAX_IMAGE_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        return JSONResponse(
            status_code=413,
            content={
                "error": "file_too_large",
                "message": f"File size exceeds {MAX_IMAGE_SIZE_MB}MB limit",
                "max_size_mb": MAX_IMAGE_SIZE_MB,
            },
        )

    # Clamp quality
    quality = max(1, min(100, quality))

    try:
        result = compress_image(
            file_bytes=file_bytes,
            quality=quality,
            max_width=max_width,
            max_height=max_height,
            output_format=format,
        )
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "processing_failed", "message": "Could not process image"},
        )

    return Response(
        content=result["data"],
        media_type=result["content_type"],
        headers={
            "Content-Disposition": f'attachment; filename="compressed{result["extension"]}"',
            "X-Original-Size": str(result["original_size"]),
            "X-Compressed-Size": str(result["compressed_size"]),
            "X-Processing-Time": str(result["processing_time"]),
        },
    )
```

**Step 5: Register router in main.py**

Add to `src/main.py`:
```python
from src.routers import health, image

app.include_router(image.router)
```

**Step 6: Run tests**

```bash
PYTHONPATH=. pytest tests/test_image_compress.py -v
```

Expected: ALL PASS

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add image compress endpoint with Pillow"
```

---

## Task 3: Image Compress Frontend

**Goal:** Create `/image/compress` page on neatoolkit.com with drag-drop upload, quality slider, before/after preview, download.

**Files:**

- Create: `~/GitHub/neatoolkit/src/app/[locale]/image/compress/page.tsx`
- Create: `~/GitHub/neatoolkit/src/components/image-compress/ImageCompress.tsx`
- Create: `~/GitHub/neatoolkit/src/lib/api.ts` (shared API client)
- Modify: `~/GitHub/neatoolkit/messages/zh-TW.json` (add ImageCompress keys)
- Modify: `~/GitHub/neatoolkit/messages/en.json` (add ImageCompress keys)
- Modify: `~/GitHub/neatoolkit/src/components/layout/Header.tsx` (link to image tools)
- Modify: `~/GitHub/neatoolkit/src/components/layout/MobileNav.tsx` (link to image tools)

### UI Spec

```
/image/compress

+-- H1: Image Compress Tool -------------------------+
|  subtitle: Compress JPG, PNG, WebP images online    |
+-------------------------------------------------+

+-- Tool Area ------------------------------------+
|                                                  |
|  +-- Upload Zone (drag & drop) ---------------+ |
|  |                                             | |
|  |   Drag & drop image here or click to upload | |
|  |   Supports JPG, PNG, WebP, HEIC. Max 10MB  | |
|  |                                             | |
|  +---------------------------------------------+ |
|                                                  |
|  +-- Options (visible after upload) ----------+ |
|  |  Quality: [====O========] 80%              | |
|  |  Max width: [    ] px  (optional)          | |
|  |  Output format: ( ) Auto  ( ) JPG  ( ) PNG | |
|  +---------------------------------------------+ |
|                                                  |
|  +-- Result (visible after compress) ---------+ |
|  |                                             | |
|  |  Before: 2.4 MB  →  After: 340 KB (-86%)  | |
|  |                                             | |
|  |  [Preview image]                            | |
|  |                                             | |
|  |  [Download Compressed Image]                | |
|  |  [Compress Another]                         | |
|  +---------------------------------------------+ |
+-------------------------------------------------+

+-- SEO Content ----------------------------------+
|  H2: How to compress images?                     |
|  H2: Supported formats (JPG, PNG, WebP, HEIC)   |
|  H2: FAQ                                        |
+-------------------------------------------------+

+-- Related Tools --------------------------------+
|  Remove Background | Font Generator | FB Formatter|
+-------------------------------------------------+
```

### SEO Keywords (from research)

| Keyword | Volume | KD | Placement |
|---------|--------|----|-----------|
| image compress (zh: Image Compress) | 28,513 | 7 | H1, title |
| jpg compress (zh: jpg Compress) | 12,529 | 9 | H2 section |
| photo compress (zh: Photo Compress) | 10,316 | 4 | Subtitle |
| png compress (zh: png Compress) | 4,648 | 10 | H2 section |
| image resize (zh: Image Resize) | 3,232 | 8 | Feature mention |

### i18n Keys to Add

```json
{
  "Metadata": {
    "imageCompressTitle": "Image Compress - Free Online JPG PNG WebP Compression | Neatoolkit",
    "imageCompressDescription": "Free online image compress tool. Compress JPG, PNG, WebP, HEIC images with adjustable quality. Fast, no registration required."
  },
  "ImageCompress": {
    "title": "Image Compress Tool",
    "subtitle": "Compress JPG, PNG, WebP images, adjustable quality, one-click download",
    "uploadHint": "Drag and drop image here or click to upload",
    "uploadFormats": "Supports JPG, PNG, WebP, HEIC. Max 10MB",
    "quality": "Quality",
    "maxWidth": "Max width (px)",
    "format": "Output format",
    "formatAuto": "Auto",
    "compress": "Compress",
    "compressing": "Compressing...",
    "before": "Before",
    "after": "After",
    "reduction": "Reduced",
    "download": "Download Compressed Image",
    "compressAnother": "Compress Another",
    "error": "Compression failed, please try again",
    "fileTooLarge": "File exceeds 10MB limit",
    "howToTitle": "How to compress images?",
    "step1": "Upload your image (JPG, PNG, WebP or HEIC format)",
    "step2": "Adjust compression quality (default 80% for best balance)",
    "step3": "Click compress and download the result",
    "formatsTitle": "Supported Formats",
    "jpgSection": "JPG Compression",
    "jpgContent": "JPEG is the most common photo format. Our tool uses optimized compression to significantly reduce file size while maintaining visual quality.",
    "pngSection": "PNG Compression",
    "pngContent": "PNG supports transparency and is ideal for graphics and screenshots. Our tool optimizes PNG files without losing quality.",
    "webpSection": "WebP Compression",
    "webpContent": "WebP is a modern format developed by Google with superior compression. Converting to WebP can reduce file sizes by 25-35% compared to JPEG.",
    "faqTitle": "FAQ",
    "faq1q": "Will compressing images lose quality?",
    "faq1a": "At 80% quality, the visual difference is nearly imperceptible but file size is reduced by 60-80%. You can adjust the quality slider to find the best balance.",
    "faq2q": "What is the maximum file size?",
    "faq2a": "The upload limit is 10MB per image. This covers the vast majority of photos and graphics.",
    "faq3q": "Is my image saved on the server?",
    "faq3a": "No. Images are processed and immediately discarded. We do not store any uploaded files.",
    "faq4q": "Can I compress multiple images at once?",
    "faq4a": "Currently we support one image at a time. For batch processing, you can compress images one after another.",
    "faq5q": "What is the difference between JPG, PNG, and WebP?",
    "faq5a": "JPG is best for photos, PNG for graphics with transparency, and WebP offers superior compression for both. Choose based on your use case.",
    "relatedToolsTitle": "Related Tools"
  }
}
```

> Note: zh-TW translations should be written separately with proper Traditional Chinese. The English keys above serve as reference.

### API Client (shared)

```typescript
// src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function compressImage(
  file: File,
  options: { quality?: number; maxWidth?: number; format?: string }
): Promise<{ blob: Blob; headers: Record<string, string> }> {
  const formData = new FormData();
  formData.append("file", file);
  if (options.quality) formData.append("quality", String(options.quality));
  if (options.maxWidth) formData.append("max_width", String(options.maxWidth));
  if (options.format) formData.append("format", options.format);

  const res = await fetch(`${API_BASE}/api/image/compress`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Compression failed");
  }

  return {
    blob: await res.blob(),
    headers: {
      originalSize: res.headers.get("X-Original-Size") || "0",
      compressedSize: res.headers.get("X-Compressed-Size") || "0",
      processingTime: res.headers.get("X-Processing-Time") || "0",
    },
  };
}
```

### Component Pattern

Follow existing pattern from FontGenerator.tsx:
- Client component with `"use client"`
- Local useState for all state
- useTranslations for i18n
- Tailwind classes matching design system (cream/ink/accent colors)
- Mobile-first responsive layout

**Step 1: Create API client, component, page, i18n keys**

(Implement all files listed above)

**Step 2: Add `NEXT_PUBLIC_API_URL` to .env.local**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 3: Verify locally**

```bash
# Terminal 1: Backend
cd ~/GitHub/neatoolkit-api && docker compose up

# Terminal 2: Frontend
cd ~/GitHub/neatoolkit && npm run dev
# Open http://localhost:3000/zh-TW/image/compress
```

**Step 4: Run frontend tests**

```bash
cd ~/GitHub/neatoolkit && npx vitest run
```

**Step 5: Commit**

```bash
cd ~/GitHub/neatoolkit
git add -A
git commit -m "feat: add image compress tool page with upload, preview, download"
```

---

## Task 4: Background Removal Endpoint

**Goal:** POST /api/image/remove-bg — accepts image, returns PNG with transparent background.

**Files:**

- Create: `~/GitHub/neatoolkit-api/src/services/rembg_service.py`
- Modify: `~/GitHub/neatoolkit-api/src/routers/image.py` (add remove-bg route)
- Test: `~/GitHub/neatoolkit-api/tests/test_remove_bg.py`

### API Spec

```
POST /api/image/remove-bg
Content-Type: multipart/form-data

Fields:
  file: image file (required, max 10MB)

Response:
  200: PNG image with transparent background
    Content-Type: image/png
    Content-Disposition: attachment; filename="no-bg.png"
    X-Original-Size: 1234567
    X-Processing-Time: 3.45

  400: {"error": "invalid_format", "message": "..."}
  413: {"error": "file_too_large", "message": "...", "max_size_mb": 10}
```

### rembg Service

```python
# src/services/rembg_service.py
import io
import time
from rembg import remove
from PIL import Image

def remove_background(file_bytes: bytes) -> dict:
    start = time.monotonic()
    original_size = len(file_bytes)

    input_img = Image.open(io.BytesIO(file_bytes))
    output_img = remove(input_img)

    buf = io.BytesIO()
    output_img.save(buf, format="PNG")
    result_bytes = buf.getvalue()

    elapsed = time.monotonic() - start

    return {
        "data": result_bytes,
        "content_type": "image/png",
        "original_size": original_size,
        "result_size": len(result_bytes),
        "processing_time": round(elapsed, 2),
    }
```

### Key Detail: u2net Model Download

rembg downloads u2net model (~176MB) on first use. In Docker, this should happen at build time or on first request (cached in ~/.u2net/). For production, pre-download in Dockerfile:

```dockerfile
# Add to Dockerfile after pip install
RUN python -c "from rembg import new_session; new_session('u2net')"
```

**Step 1: Write failing tests**

```python
# tests/test_remove_bg.py
import io
import pytest
from PIL import Image
from httpx import ASGITransport, AsyncClient
from src.main import app

def create_test_image() -> bytes:
    img = Image.new("RGB", (200, 200), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()

@pytest.mark.asyncio
async def test_remove_bg_returns_png():
    image_bytes = create_test_image()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/image/remove-bg",
            files={"file": ("test.jpg", image_bytes, "image/jpeg")},
        )
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert "X-Processing-Time" in response.headers
    # Verify it's a valid PNG with alpha channel
    result_img = Image.open(io.BytesIO(response.content))
    assert result_img.mode == "RGBA"

@pytest.mark.asyncio
async def test_remove_bg_rejects_non_image():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/image/remove-bg",
            files={"file": ("test.txt", b"not an image", "text/plain")},
        )
    assert response.status_code == 400
```

**Step 2-6: Implement, test, commit** (same pattern as Task 2)

```bash
git commit -m "feat: add background removal endpoint with rembg"
```

---

## Task 5: Background Removal Frontend

**Goal:** Create `/image/remove-background` page with upload, processing animation, before/after comparison, download.

**Files:**

- Create: `~/GitHub/neatoolkit/src/app/[locale]/image/remove-background/page.tsx`
- Create: `~/GitHub/neatoolkit/src/components/remove-background/RemoveBackground.tsx`
- Modify: `~/GitHub/neatoolkit/src/lib/api.ts` (add removeBackground function)
- Modify: `~/GitHub/neatoolkit/messages/zh-TW.json` (add RemoveBackground keys)
- Modify: `~/GitHub/neatoolkit/messages/en.json`

### UI Spec

```
/image/remove-background

+-- H1: Background Removal Tool ------------------+
|  subtitle: AI auto-detect, one-click remove bg   |
+-------------------------------------------------+

+-- Tool Area ------------------------------------+
|                                                  |
|  +-- Upload Zone (drag & drop) ---------------+ |
|  |   Drag & drop image or click to upload      | |
|  |   Supports JPG, PNG, WebP. Max 10MB         | |
|  +---------------------------------------------+ |
|                                                  |
|  +-- Processing (visible during process) -----+ |
|  |   [spinner] Removing background...           | |
|  |   AI is processing your image                | |
|  +---------------------------------------------+ |
|                                                  |
|  +-- Result (visible after process) ----------+ |
|  |                                             | |
|  |  +-- Before --+  +-- After (checkered) --+ | |
|  |  | [original] |  | [transparent bg]      | | |
|  |  +------------+  +-----------------------+ | |
|  |                                             | |
|  |  Processing time: 3.2s                      | |
|  |                                             | |
|  |  [Download PNG]  [Remove Another]           | |
|  +---------------------------------------------+ |
+-------------------------------------------------+

+-- SEO Content ----------------------------------+
|  H2: How to use the background removal tool?     |
|  H2: Features                                    |
|  H2: FAQ (5 questions)                           |
+-------------------------------------------------+
```

### SEO Keywords

| Keyword (zh-TW) | Volume | Placement |
|---------|--------|-----------|
| remove background (zh: qu bei) | 199,635 | H1, title |
| online remove background (zh: online qu bei) | 36,881 | Subtitle |
| image remove background (zh: image qu bei) | 26,565 | SEO section |
| remove background (zh: qu bei jing) | 18,684 | SEO section |
| free online remove background (zh: free online qu bei) | 3,674 | Meta description |

### Before/After Comparison

Use a simple side-by-side layout (not a slider — simpler to implement and maintain). The "after" panel shows a CSS checkered background to indicate transparency:

```css
.checkered {
  background-image:
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
}
```

**Steps:** Same pattern as Task 3. Create component, page, i18n, update navigation.

```bash
git commit -m "feat: add background removal tool page"
```

---

## Task 6: Video Compress Endpoint

**Goal:** POST /api/video/compress — accepts video upload, returns compressed video using ffmpeg.

**Files:**

- Create: `~/GitHub/neatoolkit-api/src/routers/video.py`
- Create: `~/GitHub/neatoolkit-api/src/services/ffmpeg_service.py`
- Modify: `~/GitHub/neatoolkit-api/src/main.py` (add router)
- Test: `~/GitHub/neatoolkit-api/tests/test_video_compress.py`

### API Spec

```
POST /api/video/compress
Content-Type: multipart/form-data

Fields:
  file: video file (required, max 200MB)
  quality: "high" | "medium" | "low" (optional, default "medium")
  max_resolution: "1080p" | "720p" | "480p" (optional, no resize if omitted)

Response:
  200: compressed video (MP4)
    Content-Type: video/mp4
    Content-Disposition: attachment; filename="compressed.mp4"
    X-Original-Size: ...
    X-Compressed-Size: ...
    X-Processing-Time: ...

  400/413: error JSON
```

### ffmpeg Service

```python
# src/services/ffmpeg_service.py
import os
import subprocess
import tempfile
import time

QUALITY_CRF = {
    "high": "18",
    "medium": "23",
    "low": "28",
}

RESOLUTION_MAP = {
    "1080p": "1920:-2",
    "720p": "1280:-2",
    "480p": "854:-2",
}

def compress_video(
    file_bytes: bytes,
    quality: str = "medium",
    max_resolution: str | None = None,
) -> dict:
    start = time.monotonic()
    original_size = len(file_bytes)
    crf = QUALITY_CRF.get(quality, "23")

    with tempfile.TemporaryDirectory() as tmp:
        input_path = os.path.join(tmp, "input.mp4")
        output_path = os.path.join(tmp, "output.mp4")

        with open(input_path, "wb") as f:
            f.write(file_bytes)

        cmd = [
            "ffmpeg", "-i", input_path,
            "-c:v", "libx264",
            "-crf", crf,
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
        ]

        if max_resolution and max_resolution in RESOLUTION_MAP:
            cmd.extend(["-vf", f"scale={RESOLUTION_MAP[max_resolution]}"])

        cmd.extend(["-y", output_path])

        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=300,
        )

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()[-500:]}")

        with open(output_path, "rb") as f:
            compressed_bytes = f.read()

    elapsed = time.monotonic() - start

    return {
        "data": compressed_bytes,
        "content_type": "video/mp4",
        "original_size": original_size,
        "compressed_size": len(compressed_bytes),
        "processing_time": round(elapsed, 2),
    }


def video_to_gif(
    file_bytes: bytes,
    fps: int = 10,
    width: int = 480,
    start_time: float | None = None,
    duration: float | None = None,
) -> dict:
    start = time.monotonic()
    original_size = len(file_bytes)

    with tempfile.TemporaryDirectory() as tmp:
        input_path = os.path.join(tmp, "input.mp4")
        palette_path = os.path.join(tmp, "palette.png")
        output_path = os.path.join(tmp, "output.gif")

        with open(input_path, "wb") as f:
            f.write(file_bytes)

        # Time selection args
        time_args = []
        if start_time is not None:
            time_args.extend(["-ss", str(start_time)])
        if duration is not None:
            time_args.extend(["-t", str(duration)])

        filters = f"fps={fps},scale={width}:-1:flags=lanczos"

        # Step 1: Generate palette
        cmd_palette = [
            "ffmpeg", *time_args, "-i", input_path,
            "-vf", f"{filters},palettegen=stats_mode=diff",
            "-y", palette_path,
        ]
        subprocess.run(cmd_palette, capture_output=True, timeout=120)

        # Step 2: Generate GIF with palette
        cmd_gif = [
            "ffmpeg", *time_args, "-i", input_path,
            "-i", palette_path,
            "-lavfi", f"{filters} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5",
            "-y", output_path,
        ]
        result = subprocess.run(cmd_gif, capture_output=True, timeout=120)

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()[-500:]}")

        with open(output_path, "rb") as f:
            gif_bytes = f.read()

    elapsed = time.monotonic() - start

    return {
        "data": gif_bytes,
        "content_type": "image/gif",
        "original_size": original_size,
        "result_size": len(gif_bytes),
        "processing_time": round(elapsed, 2),
    }
```

**Steps:** Write tests → implement → register router → test → commit.

```bash
git commit -m "feat: add video compress endpoint with ffmpeg"
```

---

## Task 7: Video Compress Frontend

**Goal:** Create `/video/compress` page.

**Files:**

- Create: `~/GitHub/neatoolkit/src/app/[locale]/video/compress/page.tsx`
- Create: `~/GitHub/neatoolkit/src/components/video-compress/VideoCompress.tsx`
- Modify: `~/GitHub/neatoolkit/src/lib/api.ts` (add compressVideo)
- Modify: `~/GitHub/neatoolkit/messages/zh-TW.json` / `en.json`

### UI Spec

```
/video/compress

+-- H1 -------------------------------------------+
|  Video Compress Tool                              |
|  subtitle: Compress MP4 videos, adjustable quality|
+-------------------------------------------------+

+-- Tool Area ------------------------------------+
|                                                  |
|  Upload zone (drag & drop, max 200MB)            |
|                                                  |
|  Options:                                        |
|    Quality:    (o) High  (o) Medium  (o) Low     |
|    Resolution: (o) Keep  (o) 1080p  (o) 720p     |
|                                                  |
|  [Compress Video]                                |
|                                                  |
|  Progress: Processing... (ffmpeg is working)     |
|                                                  |
|  Result:                                         |
|    Before: 45.2 MB → After: 12.1 MB (-73%)      |
|    [Download] [Compress Another]                 |
+-------------------------------------------------+
```

### SEO Keywords

| Keyword (zh-TW) | Volume | Placement |
|---------|--------|-----------|
| video compress (zh: ying pian ya suo) | 42,946 | H1, title |

**Steps:** Same frontend pattern. Create component, page, i18n, commit.

```bash
git commit -m "feat: add video compress tool page"
```

---

## Task 8: Video to GIF Endpoint

**Goal:** POST /api/video/to-gif — already implemented in ffmpeg_service.py, just need the router endpoint.

**Files:**

- Modify: `~/GitHub/neatoolkit-api/src/routers/video.py` (add to-gif route)
- Test: `~/GitHub/neatoolkit-api/tests/test_video_to_gif.py`

### API Spec

```
POST /api/video/to-gif
Content-Type: multipart/form-data

Fields:
  file: video file (required, max 100MB)
  fps: int 5-30 (optional, default 10)
  width: int 100-1920 (optional, default 480)
  start_time: float seconds (optional)
  duration: float seconds (optional, max 30)

Response:
  200: GIF image
    Content-Type: image/gif
    Content-Disposition: attachment; filename="output.gif"
    X-Original-Size: ...
    X-Processing-Time: ...
```

**Steps:** Write tests → add route → test → commit.

```bash
git commit -m "feat: add video to GIF endpoint"
```

---

## Task 9: Video to GIF Frontend

**Goal:** Create `/video/to-gif` page.

**Files:**

- Create: `~/GitHub/neatoolkit/src/app/[locale]/video/to-gif/page.tsx`
- Create: `~/GitHub/neatoolkit/src/components/video-to-gif/VideoToGif.tsx`
- Modify: `~/GitHub/neatoolkit/src/lib/api.ts` (add videoToGif)
- Modify: `~/GitHub/neatoolkit/messages/zh-TW.json` / `en.json`

### UI Spec

```
/video/to-gif

+-- H1 -------------------------------------------+
|  Video to GIF Converter                           |
|  subtitle: Convert video clips to animated GIF    |
+-------------------------------------------------+

+-- Tool Area ------------------------------------+
|                                                  |
|  Upload zone (drag & drop, max 100MB)            |
|                                                  |
|  Options:                                        |
|    FPS:      [====O====] 10                      |
|    Width:    [====O=======] 480px                |
|    Start:    [  0.0  ] seconds                   |
|    Duration: [  10.0 ] seconds (max 30)          |
|                                                  |
|  [Convert to GIF]                                |
|                                                  |
|  Result:                                         |
|    [GIF preview (auto-play)]                     |
|    Size: 3.2 MB                                  |
|    [Download GIF] [Convert Another]              |
+-------------------------------------------------+
```

### SEO Keywords

| Keyword (zh-TW) | Volume | Placement |
|---------|--------|-----------|
| video to gif (zh: ying pian zhuan gif) | 13,990 | H1, title |
| gif compress (zh: gif ya suo) | 11,378 | Feature / separate page |

**Steps:** Same frontend pattern.

```bash
git commit -m "feat: add video to GIF tool page"
```

---

## Task 10: Azure Deployment

**Goal:** Deploy neatoolkit-api to Azure Container Apps in a new resource group.

**Files:**

- Create: `~/GitHub/neatoolkit-api/deploy.sh`
- Create: `~/GitHub/neatoolkit-api/.github/workflows/deploy.yml` (optional: CI/CD)

### Step-by-step Azure CLI Commands

```bash
# 1. Create resource group
az group create \
  --name neatoolkit-rg \
  --location eastasia

# 2. Create container registry
az acr create \
  --resource-group neatoolkit-rg \
  --name neatoolkitacr \
  --sku Basic

# 3. Build and push image
az acr login --name neatoolkitacr
docker build -t neatoolkitacr.azurecr.io/neatoolkit-api:latest .
docker push neatoolkitacr.azurecr.io/neatoolkit-api:latest

# 4. Create Container Apps environment
az containerapp env create \
  --name neatoolkit-env \
  --resource-group neatoolkit-rg \
  --location eastasia

# 5. Create Container App
az containerapp create \
  --name neatoolkit-api \
  --resource-group neatoolkit-rg \
  --environment neatoolkit-env \
  --image neatoolkitacr.azurecr.io/neatoolkit-api:latest \
  --registry-server neatoolkitacr.azurecr.io \
  --target-port 8000 \
  --ingress external \
  --cpu 2 \
  --memory 4Gi \
  --min-replicas 0 \
  --max-replicas 1 \
  --env-vars \
    ENVIRONMENT=production \
    CORS_ORIGINS="https://neatoolkit.com,https://www.neatoolkit.com"

# 6. Get URL
az containerapp show \
  --name neatoolkit-api \
  --resource-group neatoolkit-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

### Post-deploy

1. Set `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Verify: `curl https://<app-url>/health`
3. Test image compress from production frontend

**Step: Commit deploy script**

```bash
git commit -m "chore: add Azure deployment script"
```

---

## Task 11: Navigation & Homepage Update

**Goal:** Update Header/MobileNav/Footer to include image and video tool categories. Create a proper homepage (currently redirects to fb-post-formatter).

**Files:**

- Modify: `~/GitHub/neatoolkit/src/components/layout/Header.tsx`
- Modify: `~/GitHub/neatoolkit/src/components/layout/MobileNav.tsx`
- Modify: `~/GitHub/neatoolkit/src/app/[locale]/page.tsx` (homepage)
- Modify: `~/GitHub/neatoolkit/messages/zh-TW.json` / `en.json`

### Navigation Structure

```
Header nav:
  Image Tools ▼          Video Tools ▼         Text Tools ▼
  ├── Image Compress      ├── Video Compress     ├── Font Generator
  ├── Remove Background   └── Video to GIF       └── FB Post Formatter
  └── (future: convert)
```

### Homepage Design

```
/

+-- Hero -------------------------------------------+
|  Neatoolkit                                        |
|  Free online tools, no ads, no registration        |
+--------------------------------------------------+

+-- Tool Categories --------------------------------+
|                                                    |
|  +-- Image -----+  +-- Video -----+  +-- Text --+ |
|  | Image Compress|  | Video Compress|  | Font Gen | |
|  | Remove BG    |  | Video to GIF |  | FB Format| |
|  +--------------+  +--------------+  +----------+ |
|                                                    |
+--------------------------------------------------+
```

**Steps:** Update navigation components, create homepage, add i18n keys, commit.

```bash
git commit -m "feat: update navigation and add homepage with tool categories"
```

---

## Task 12: SEO & i18n for All Tools

**Goal:** Ensure all 4 new tool pages have complete SEO (meta, OG, schema markup, FAQ) in both zh-TW and en.

**Files:**

- Modify: All 4 page.tsx files (ensure generateMetadata, FAQPage JSON-LD, HowTo JSON-LD)
- Modify: `~/GitHub/neatoolkit/messages/zh-TW.json` (complete all translations)
- Modify: `~/GitHub/neatoolkit/messages/en.json`

### SEO Checklist Per Page

| Element | Required |
|---------|----------|
| `<title>` with primary keyword | Yes |
| `<meta description>` with secondary keywords | Yes |
| `<h1>` with primary keyword | Yes |
| `<h2>` sections targeting cluster keywords | Yes |
| FAQPage JSON-LD (5 questions) | Yes |
| HowTo JSON-LD (3 steps) | Yes |
| WebApplication JSON-LD | Yes |
| Related tools section (internal links) | Yes |
| Canonical URL | Yes (auto from Next.js) |

### Schema Markup Template

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "...",
  "url": "https://neatoolkit.com/...",
  "description": "...",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TWD"
  }
}
```

**Steps:** Audit each page, add missing schema, verify with Google Rich Results Test, commit.

```bash
git commit -m "feat: complete SEO schema and i18n for all Phase 1 tools"
```

---

## Execution Order

### Parallel Track Strategy

```
Week 1:
├── Track A (Backend):  Task 1 → Task 2 → Task 4 → Task 6 → Task 8 → Task 10
└── Track B (Frontend): (wait for Task 2) → Task 3 → Task 5 → Task 7 → Task 9

Week 2:
├── Task 11 (Navigation & Homepage)
├── Task 12 (SEO & i18n)
└── Final testing & deployment
```

### Recommended Sequential Order (single developer)

| Order | Task | Dependencies |
|-------|------|-------------|
| 1 | **Task 1**: Backend scaffold | None |
| 2 | **Task 2**: Image compress endpoint | Task 1 |
| 3 | **Task 3**: Image compress frontend | Task 2 |
| 4 | **Task 4**: Remove-bg endpoint | Task 1 |
| 5 | **Task 5**: Remove-bg frontend | Task 4 |
| 6 | **Task 6**: Video compress endpoint | Task 1 |
| 7 | **Task 7**: Video compress frontend | Task 6 |
| 8 | **Task 8**: Video-to-gif endpoint | Task 6 (shares ffmpeg_service) |
| 9 | **Task 9**: Video-to-gif frontend | Task 8 |
| 10 | **Task 10**: Azure deployment | Task 1-8 done |
| 11 | **Task 11**: Navigation & homepage | Task 3,5,7,9 done |
| 12 | **Task 12**: SEO & i18n completion | Task 11 done |

### Definition of Done

- [ ] All 4 backend endpoints passing tests
- [ ] All 4 frontend pages functional
- [ ] Docker image builds clean
- [ ] Azure Container App deployed and healthy
- [ ] Vercel production pointing to Azure API
- [ ] All pages have complete SEO (meta, schema, FAQ)
- [ ] zh-TW and en translations complete
- [ ] Navigation updated (header, mobile, homepage)
- [ ] Google Search Console: submit new pages
- [ ] Manual test on mobile (iOS Safari)

---

**Created:** 2026-02-09
**Author:** Claude Code (writing-plans skill)
**Status:** Draft — pending approval
