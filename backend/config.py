from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse


def _load_dotenv_file(path: Path) -> None:
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            continue

        name, value = line.split("=", 1)
        key = name.strip()
        if not key or key in os.environ:
            continue

        parsed_value = value.strip()
        if (
            len(parsed_value) >= 2
            and parsed_value[0] == parsed_value[-1]
            and parsed_value[0] in {'"', "'"}
        ):
            parsed_value = parsed_value[1:-1]

        os.environ[key] = parsed_value


_load_dotenv_file(Path(__file__).resolve().with_name(".env"))


def _parse_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _parse_csv(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if raw is None:
        return default
    values = [item.strip() for item in raw.split(",")]
    return [item for item in values if item]


def _parse_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


DEBUG = _parse_bool("EASWA_DEBUG", False)

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
BASE_URL = os.getenv("EASWA_BASE_URL", "http://localhost:5895")
_parsed_base_url = urlparse(BASE_URL)
_is_local_base_url = _parsed_base_url.hostname in {"localhost", "127.0.0.1"}
_uses_dev_runtime_defaults = DEBUG or _is_local_base_url

_session_secret = os.getenv("EASWA_SESSION_SECRET", "").strip()
if _session_secret:
    SESSION_SECRET = _session_secret
elif DEBUG or _is_local_base_url:
    SESSION_SECRET = "easwa-dev-secret-change-me"
else:
    raise RuntimeError(
        "EASWA_SESSION_SECRET must be set when EASWA_DEBUG is disabled."
    )

SESSION_COOKIE_SECURE = _parse_bool(
    "EASWA_SESSION_COOKIE_SECURE",
    _parsed_base_url.scheme == "https",
)
SESSION_COOKIE_SAMESITE = os.getenv(
    "EASWA_SESSION_COOKIE_SAMESITE",
    "lax",
).strip().lower()
if SESSION_COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    SESSION_COOKIE_SAMESITE = "lax"
CORS_ORIGINS = _parse_csv(
    "EASWA_CORS_ORIGINS",
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5895",
        "http://127.0.0.1:5895",
    ],
)

TRANSIT_RATE_LIMIT_WINDOW_SECONDS = _parse_int("EASWA_TRANSIT_RATE_LIMIT_WINDOW_SECONDS", 60)
TRANSIT_PREVIEW_INLINE_LIMIT = _parse_int("EASWA_TRANSIT_PREVIEW_INLINE_LIMIT", 90)
TRANSIT_PREVIEW_JOB_LIMIT = _parse_int("EASWA_TRANSIT_PREVIEW_JOB_LIMIT", 8)
TRANSIT_PHOTOMETRY_LIMIT = _parse_int("EASWA_TRANSIT_PHOTOMETRY_LIMIT", 6)
TRANSIT_PREVIEW_JOB_MAX_ITEMS = _parse_int("EASWA_TRANSIT_PREVIEW_JOB_MAX_ITEMS", 24)
TRANSIT_PREVIEW_JOB_TTL_SECONDS = _parse_int(
    "EASWA_TRANSIT_PREVIEW_JOB_TTL_SECONDS",
    15 * 60,
)
TRANSIT_PREVIEW_WORKERS = max(
    1,
    _parse_int("EASWA_TRANSIT_PREVIEW_WORKERS", 2 if _uses_dev_runtime_defaults else 1),
)
TRANSIT_FRAME_COUNT_WORKERS = max(
    1,
    _parse_int("EASWA_TRANSIT_FRAME_COUNT_WORKERS", 4 if _uses_dev_runtime_defaults else 1),
)
# Lazy datasets keep the cube on disk, so a cached entry is only ~KB of metadata.
# Caching several is essentially free and lets preview->photometry reuse the
# cutout reliably (the byte limit + oversized->hot-cache path still guard the
# rare in-memory-fallback case where a full cube is held).
TRANSIT_CUTOUT_MEMORY_CACHE_MAX_ITEMS = max(
    0,
    _parse_int("EASWA_TRANSIT_CUTOUT_MEMORY_CACHE_MAX_ITEMS", 8),
)
TRANSIT_CUTOUT_MEMORY_CACHE_MAX_BYTES = max(
    0,
    _parse_int(
        "EASWA_TRANSIT_CUTOUT_MEMORY_CACHE_MAX_BYTES",
        96 * 1024 * 1024 if _uses_dev_runtime_defaults else 16 * 1024 * 1024,
    ),
)
TRANSIT_CUTOUT_HOT_CACHE_MAX_ITEMS = max(
    0,
    _parse_int(
        "EASWA_TRANSIT_CUTOUT_HOT_CACHE_MAX_ITEMS",
        1 if _uses_dev_runtime_defaults else 0,
    ),
)
TRANSIT_MAX_CUTOUT_SIZE_PX = max(
    30,
    _parse_int(
        "EASWA_TRANSIT_MAX_CUTOUT_SIZE_PX",
        99 if _uses_dev_runtime_defaults else 50,
    ),
)
# Persistent FITS cache: keep cutouts on disk across requests for reuse.
# Pointless on Render free (ephemeral disk wiped on restart) → defaults off there.
TRANSIT_CUTOUT_DISK_CACHE_ENABLED = _parse_bool(
    "EASWA_TRANSIT_CUTOUT_DISK_CACHE_ENABLED",
    _uses_dev_runtime_defaults,
)
# Stream the TESSCut ZIP/FITS through a temp file during loading instead of
# holding them in RAM (BytesIO). Independent of the persistent cache above:
# the temp files are deleted right after the request, so this is safe even on
# ephemeral disks and is what keeps the load step from spiking memory.
# Defaults ON everywhere — this is the primary OOM guard on Render free.
TRANSIT_CUTOUT_STAGE_TO_DISK = _parse_bool(
    "EASWA_TRANSIT_CUTOUT_STAGE_TO_DISK",
    True,
)
# Hard ceiling on the TESSCut ZIP download size (bytes). Guards the ephemeral
# disk used for staging on small hosts: an oversized cutout fails fast with a
# clear message instead of filling the disk. 0 = unlimited (default).
TRANSIT_CUTOUT_MAX_DOWNLOAD_BYTES = max(
    0,
    _parse_int("EASWA_TRANSIT_CUTOUT_MAX_DOWNLOAD_BYTES", 0),
)
TRANSIT_CUTOUT_DISK_CACHE_DIR = os.getenv(
    "EASWA_TRANSIT_CUTOUT_DISK_CACHE_DIR",
    "",
).strip()
TRANSIT_CUTOUT_STAGE_DIR = os.getenv(
    "EASWA_TRANSIT_CUTOUT_STAGE_DIR",
    "",
).strip()
# Global (IP-independent) concurrency caps for the CPU-bound NDJSON stream
# endpoints. Rationale: docs/LOAD_TEST_2026-07.md — 12+ concurrent MCMC fits
# killed the 512 MB Render free instance (502), and the per-IP rate limiter is
# defeated behind the Render proxy (proxy IPs fragment the buckets). These caps
# apply regardless of client IP. Both the EASWA_-prefixed and bare env names
# are accepted; the prefixed name wins if both are set.
FIT_MAX_CONCURRENCY = max(
    1,
    _parse_int("EASWA_FIT_MAX_CONCURRENCY", _parse_int("FIT_MAX_CONCURRENCY", 3)),
)
PHOTOMETRY_MAX_CONCURRENCY = max(
    1,
    _parse_int(
        "EASWA_PHOTOMETRY_MAX_CONCURRENCY",
        _parse_int("PHOTOMETRY_MAX_CONCURRENCY", 8),
    ),
)
# How long a queued stream request may wait for a slot before it is rejected
# with a clear error event.
STREAM_QUEUE_WAIT_SECONDS = max(
    1,
    _parse_int("EASWA_STREAM_QUEUE_WAIT_SECONDS", 90),
)
# Transit fit engine: emcee MCMC refinement is opt-in. The always-on 32x1500
# MCMC is what made a solo fit ~70 s on Render (docs/LOAD_TEST_2026-07.md);
# the default is the least-squares solution + Jacobian uncertainties.
# A request can override via its `refine_mcmc` field.
FIT_MCMC_DEFAULT = _parse_bool(
    "EASWA_FIT_MCMC_DEFAULT",
    _parse_bool("FIT_MCMC_DEFAULT", False),
)
FIT_MCMC_WALKERS = max(
    4,
    _parse_int("EASWA_FIT_MCMC_WALKERS", _parse_int("FIT_MCMC_WALKERS", 16)),
)
FIT_MCMC_STEPS = max(
    100,
    _parse_int("EASWA_FIT_MCMC_STEPS", _parse_int("FIT_MCMC_STEPS", 500)),
)
RECORD_REQUIRE_LOGIN = _parse_bool("EASWA_RECORD_REQUIRE_LOGIN", True)
ADMIN_EMAILS: frozenset[str] = frozenset(
    email for email in (
        item.strip().lower()
        for item in os.getenv("EASWA_ADMIN_EMAILS", "").split(",")
    )
    if email
)
RECORD_SUBMISSION_LIMIT = _parse_int("EASWA_RECORD_SUBMISSION_LIMIT", 10)
RECORD_MAX_CONTEXT_BYTES = _parse_int("EASWA_RECORD_MAX_CONTEXT_BYTES", 32 * 1024)
RECORD_MAX_ANSWERS_BYTES = _parse_int("EASWA_RECORD_MAX_ANSWERS_BYTES", 32 * 1024)
RECORD_MAX_TITLE_LENGTH = _parse_int("EASWA_RECORD_MAX_TITLE_LENGTH", 160)
RECORD_MAX_OBSERVATION_IDS = _parse_int("EASWA_RECORD_MAX_OBSERVATION_IDS", 8)
