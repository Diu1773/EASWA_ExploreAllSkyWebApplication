from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path

from config import (
    CORS_ORIGINS,
    DEBUG,
    MAX_FIT_REQUEST_BODY_BYTES,
    MAX_REQUEST_BODY_BYTES,
    SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE,
    SESSION_SECRET,
)
from routers import topics, targets, observations, photometry, lightcurve, transit, auth, records, drafts, kmtnet, cluster
from services.transit_fit_service import get_runtime_dependency_status

app = FastAPI(title="EASWA API", version="0.1.0")


# Registered before CORS/Session on purpose: add_middleware makes the LAST one
# added the outermost, so declaring this first leaves CORS wrapping it and the
# 413 still carries CORS headers (readable cross-origin in local dev).
@app.middleware("http")
async def limit_request_body_size(request: Request, call_next):
    """Reject oversized request bodies from Content-Length, before parsing.

    A multi-hundred-MB JSON body exhausts the 512 MB instance while it is being
    expanded into Python objects — long before Pydantic validation (or any
    downsampling we might add) ever sees it, so the cap has to be applied at the
    header. /transit/fit* carries only ROI points and is the heaviest endpoint,
    so it takes the tighter limit.

    Known gap: a chunked upload sends no Content-Length and slips past. Browsers
    and curl always send it, and the global stream gate still bounds how many
    heavy requests run at once, so this is the cheap 90% guard rather than a
    byte-counting wrapper around the receive channel.
    """
    raw_length = request.headers.get("content-length")
    if raw_length:
        limit = (
            MAX_FIT_REQUEST_BODY_BYTES
            if "/transit/fit" in request.url.path
            else MAX_REQUEST_BODY_BYTES
        )
        try:
            declared = int(raw_length)
        except ValueError:
            declared = -1
        if declared > limit:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": (
                        f"요청 본문이 너무 큽니다 ({declared / 1048576:.1f} MB). "
                        f"상한은 {limit // 1048576} MB입니다."
                    )
                },
            )
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site=SESSION_COOKIE_SAMESITE,
    https_only=SESSION_COOKIE_SECURE,
)

app.include_router(auth.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(targets.router, prefix="/api")
app.include_router(observations.router, prefix="/api")
app.include_router(photometry.router, prefix="/api")
app.include_router(lightcurve.router, prefix="/api")
app.include_router(transit.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(drafts.router, prefix="/api")
app.include_router(kmtnet.router, prefix="/api")
app.include_router(cluster.router, prefix="/api")


def _process_memory() -> dict:
    """Best-effort process memory (MB). Dependency-free; works on Render (Linux)."""
    info: dict = {}
    try:
        with open("/proc/self/status", "r", encoding="utf-8") as status_file:
            for line in status_file:
                if line.startswith("VmRSS:"):
                    info["rss_mb"] = round(int(line.split()[1]) / 1024, 1)
                    break
    except Exception:
        pass
    try:
        import resource

        # ru_maxrss is in KB on Linux (peak resident set size for the process).
        info["peak_rss_mb"] = round(
            resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1
        )
    except Exception:
        pass
    return info


@app.get("/api/health")
def health():
    payload = {
        "status": "ok",
        "dependencies": get_runtime_dependency_status(),
    }
    # Internal runtime stats are exposed only in developer mode, never in production.
    if DEBUG:
        payload["memory"] = _process_memory()
    return payload


# ---------- Serve frontend build ----------
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if DEBUG:
    print(f"[EASWA] Frontend dist path: {FRONTEND_DIST}")
    print(f"[EASWA] Frontend dist exists: {FRONTEND_DIST.exists()}")

if FRONTEND_DIST.exists():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    _FRONTEND_ROOT = FRONTEND_DIST.resolve()

    @app.get("/{path:path}")
    async def serve_spa(request: Request, path: str):
        # Serve the real file when it exists, otherwise index.html (SPA routing).
        #
        # The lookup MUST stay inside the build directory. This handler used to
        # pass `FRONTEND_DIST / path` straight to FileResponse, and `{path:path}`
        # accepts slashes, so `..` segments — raw or percent-encoded — walked out
        # of it and served any file the process could read. Verified 2026-07-18:
        # `GET /../../backend/.env` returned 200 with the Google OAuth client
        # secret and EASWA_SESSION_SECRET in the body, which is enough to forge a
        # session cookie for any account, admin included. StaticFiles does this
        # containment for us on /assets; this hand-rolled route did not.
        def _index() -> FileResponse:
            return FileResponse(
                _FRONTEND_ROOT / "index.html",
                headers={"Cache-Control": "no-store, max-age=0"},
            )

        if not path:
            return _index()

        try:
            # resolve() also collapses symlinks, so containment holds through them.
            candidate = (_FRONTEND_ROOT / path).resolve()
            candidate.relative_to(_FRONTEND_ROOT)
        except (ValueError, OSError):
            return _index()

        if candidate.is_file():
            return FileResponse(candidate)
        return _index()
else:
    @app.get("/")
    def no_frontend():
        return {"error": "frontend/dist not found", "path": str(FRONTEND_DIST)}
