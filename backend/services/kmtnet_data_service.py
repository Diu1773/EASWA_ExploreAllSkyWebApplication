"""Helpers for retrieving KMTNet metadata from the public KASI archive API."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from functools import lru_cache
from typing import Any

import httpx

from adapters.kmtnet_archive import archive as kmtnet_archive

_KASI_KMTNET_SEARCH_URL = "https://data.kasi.re.kr/api/KMTNet/search"
_SEARCH_RADIUS_ARCMIN = 60
_REMOTE_LIMIT = 240
_RESULT_LIMIT = 60
logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 15.0


_BUNDLE_DIR = Path(__file__).resolve().parent.parent / "bundled_kmtnet" / "observations"


def _bundled_observations(target_id: str) -> list[dict[str, Any]]:
    """KASI rows downloaded ahead of time and shipped with the app."""
    path = _BUNDLE_DIR / f"{target_id}.json"
    if not path.is_file():
        return []
    try:
        with path.open(encoding="utf-8") as handle:
            rows = json.load(handle).get("observations")
        return rows if isinstance(rows, list) else []
    except (OSError, ValueError):
        return []


def list_target_observations(target_id: str) -> list[dict[str, Any]]:
    target = kmtnet_archive.get_target(target_id)
    if not target:
        return []

    model = target.get("model") or {}
    model_t0 = float(model.get("t0", 0.0)) if isinstance(model, dict) else 0.0

    try:
        remote_rows = _search_kasi_rows(
            target_id,
            float(target["ra"]),
            float(target["dec"]),
            model_t0,
        )
        if remote_rows:
            return remote_rows
    except Exception:
        logger.warning("KASI search failed for %s; falling back to the bundle", target_id)

    # The archive being unreachable used to fall through to generated
    # observations, silently — a learner would then analyse invented data
    # without any sign of it. These bundles are the same KASI rows fetched on
    # 2026-09-06, so the fallback stays real; if there is no bundle either, the
    # caller gets nothing rather than something made up.
    bundled = _bundled_observations(target_id)
    if bundled:
        return bundled
    return []


@lru_cache(maxsize=32)
def _search_kasi_rows(
    target_id: str,
    ra: float,
    dec: float,
    model_t0: float,
) -> list[dict[str, Any]]:
    with httpx.Client(timeout=_TIMEOUT_SECONDS, follow_redirects=True) as client:
        response = client.get(
            _KASI_KMTNET_SEARCH_URL,
            params={
                "ra": ra,
                "dec": dec,
                "rad": _SEARCH_RADIUS_ARCMIN,
                "unit": "arcmin",
                "limit": _REMOTE_LIMIT,
                "band": "I",
                "datatype": "OBJECT",
            },
        )
        response.raise_for_status()
        rows = response.json()

    if not isinstance(rows, list):
        return []

    normalized: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        data_id = str(row.get("DATAID") or "").strip()
        data_url = str(row.get("DATAURL") or "").strip()
        date_obs = str(row.get("DATE-OBS") or "").strip()
        filter_band = str(row.get("FILTER") or "").strip() or "I"
        observatory = str(row.get("OBSERVAT") or "").strip() or "KMTNet"
        hjd = _to_float(row.get("MIDJD"))
        exposure_sec = _to_float(row.get("EXPTIME"))
        airmass = _to_float(row.get("SECZ"))
        if not data_id or not data_url or not date_obs:
            continue
        normalized.append(
            {
                "id": data_id,
                "target_id": target_id,
                "epoch": date_obs,
                "hjd": hjd if hjd is not None else 0.0,
                "filter_band": filter_band,
                "exposure_sec": exposure_sec if exposure_sec is not None else 0.0,
                "thumbnail_url": f"{data_url}.jpg",
                "airmass": airmass if airmass is not None else 0.0,
                "mission": "KMTNet",
                "display_label": observatory,
                "display_subtitle": str(row.get("OBJECT") or "").strip() or None,
                "cutout_url": data_url,
            }
        )

    normalized.sort(
        key=lambda item: (
            abs(item["hjd"] - model_t0) if model_t0 > 0 and item["hjd"] > 0 else 10**9,
            item["epoch"],
        )
    )
    return normalized[:_RESULT_LIMIT]


def _to_float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None
