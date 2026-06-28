"""Real KMTNet microlensing light curves from the public ulens database.

Given a KMTNet event id (``kmt-YYYY-blg-NNNN``) this discovers the per-site
I-band pySIS difference-image-photometry files from the event's public ulens
page and returns merged real photometry. Difference imaging is NOT recomputed
live (too heavy) — these are the published pySIS results served as a table.
See memory: project_kmtnet_real_lightcurve.
"""

from __future__ import annotations

import math
import re
from functools import lru_cache

import httpx

from adapters.kmtnet_archive import archive
from schemas.microlensing import MicrolensingLightCurveResponse, MicrolensingPoint

_TIMEOUT = 30.0
_SITE_OF = {"KMTC": "ctio", "KMTS": "saao", "KMTA": "sso"}
_ALL_SITES = ("ctio", "saao", "sso")
_MAX_MAG_ERR = 0.3      # drop noisy points (raw .pysis has scatter)
_MAG_RANGE = (10.0, 23.0)
_PLOT_LIMIT_PER_SITE = 220


def _event_url(target_id: str) -> tuple[str, str, int]:
    match = re.fullmatch(r"kmt-(\d{4})-blg-(\d{3,4})", target_id.strip().lower())
    if not match:
        raise ValueError(f"Not a KMTNet event id: {target_id}")
    year = int(match.group(1))
    code = f"KMT-{year}-BLG-{int(match.group(2)):04d}"
    base = f"https://kmtnet.kasi.re.kr/~ulens/event/{year}"
    return base, code, year


@lru_cache(maxsize=128)
def _discover_site_files(target_id: str) -> tuple[tuple[str, str], ...]:
    """Map site id -> absolute pySIS I-band URL by scraping the event page."""
    base, code, _year = _event_url(target_id)
    with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
        html = client.get(f"{base}/view.php?event={code}").text
    files: dict[str, str] = {}
    for href in sorted(set(re.findall(r"data/KB\d+/pysis/KMT[CSA]\d+_I\.pysis", html))):
        site_code = re.search(r"KMT[CSA]", href).group(0)
        site = _SITE_OF.get(site_code)
        if site and site not in files:
            files[site] = f"{base}/{href}"
    return tuple(files.items())


@lru_cache(maxsize=256)
def _fetch_site_points(url: str) -> tuple[tuple[float, float, float], ...]:
    """Parse a .pysis file → cleaned (HJD, I-mag, mag_err) rows.

    Columns: HJD(-2450000), delta_flux, flux_err, mag, mag_err, fwhm, sky, secz.
    """
    with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
        text = client.get(url).text
    points: list[tuple[float, float, float]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        try:
            hjd = float(parts[0]) + 2450000.0
            mag = float(parts[3])
            err = float(parts[4])
        except ValueError:
            continue
        if mag != mag or err != err:  # NaN
            continue
        if err <= 0 or err > _MAX_MAG_ERR:
            continue
        if mag < _MAG_RANGE[0] or mag > _MAG_RANGE[1]:
            continue
        points.append((hjd, mag, err))
    points.sort(key=lambda row: row[0])
    return tuple(points)


def _amp(t: float, t0: float, u0: float, tE: float) -> float:
    tau = (t - t0) / tE
    u = math.sqrt(u0 * u0 + tau * tau)
    return (u * u + 2.0) / (u * math.sqrt(u * u + 4.0))


def _clean_and_baseline(points, t0, u0, tE):
    """Reject instrumental outliers and estimate this site's magnitude baseline.

    Fits only a magnitude baseline to the fixed (t0, u0, tE) shape, drops points
    whose residual is far beyond the robust scatter (cosmic-ray / bad-subtraction
    spikes), and returns (cleaned_points, baseline). Each KMTNet site has its own
    instrumental zeropoint, so the baseline is later used to align sites onto a
    common scale before merging. (Single-lens shape only; a planetary anomaly
    deviates, so this is skipped for ML-P events.)
    """
    if len(points) < 8 or not tE:
        return points, None
    shape = [-2.5 * math.log10(_amp(h, t0, u0, tE)) for (h, _m, _e) in points]
    offsets = sorted(m - s for (_h, m, _e), s in zip(points, shape))
    base = offsets[len(offsets) // 2]
    residuals = [m - (base + s) for (_h, m, _e), s in zip(points, shape)]
    abs_res = sorted(abs(r) for r in residuals)
    mad = abs_res[len(abs_res) // 2] or 0.05
    tol = max(0.6, 6.0 * mad)
    cleaned = [pt for pt, r in zip(points, residuals) if abs(r) <= tol]
    if len(cleaned) >= 8:
        shape2 = [-2.5 * math.log10(_amp(h, t0, u0, tE)) for (h, _m, _e) in cleaned]
        offs2 = sorted(m - s for (_h, m, _e), s in zip(cleaned, shape2))
        base = offs2[len(offs2) // 2]
    return cleaned, base


def _downsample(points: tuple, limit: int) -> list:
    if len(points) <= limit:
        return list(points)
    step = len(points) / limit
    return [points[int(i * step)] for i in range(limit)]


def get_lightcurve(
    target_id: str,
    site: str | None = None,
    mode: str = "quick",
    include_sites: list[str] | None = None,
    reference_frame_index: int | None = None,  # unused (real published table)
) -> MicrolensingLightCurveResponse:
    target_id = target_id.strip().lower()
    site_files = dict(_discover_site_files(target_id))
    if not site_files:
        raise ValueError(f"No public KMTNet light curve found for {target_id}")

    if site:
        wanted = [site]
    elif include_sites:
        wanted = [s for s in include_sites if s in _ALL_SITES]
    else:
        wanted = list(_ALL_SITES)

    event = archive.get_target(target_id) or {}
    model = event.get("model") or {}
    t0 = float(model.get("t0") or 0.0)
    u0 = float(model.get("u0") or 0.0)
    tE = float(model.get("tE") or 0.0)
    clip_ok = model.get("type") != "planetary" and t0 and tE  # single-lens shape

    # Pass 1: clean each site and estimate its instrumental baseline.
    site_clean: dict[str, list] = {}
    site_base: dict[str, float | None] = {}
    included: list[str] = []
    missing: list[str] = []
    for site_id in wanted:
        url = site_files.get(site_id)
        raw = _fetch_site_points(url) if url else ()
        if not raw:
            missing.append(site_id)
            continue
        if clip_ok:
            cleaned, base = _clean_and_baseline(list(raw), t0, u0, tE)
        else:
            cleaned, base = list(raw), None
        if not cleaned:
            missing.append(site_id)
            continue
        site_clean[site_id] = cleaned
        site_base[site_id] = base
        included.append(site_id)

    # Common baseline: align each site's zeropoint so the merged curve is one scale.
    bases = [b for b in site_base.values() if b is not None]
    common = sum(bases) / len(bases) if bases else None

    points: list[MicrolensingPoint] = []
    sampled_ids: dict[str, list[str]] = {}
    for site_id in included:
        base = site_base.get(site_id)
        shift = (common - base) if (common is not None and base is not None) else 0.0
        for hjd, mag, err in _downsample(site_clean[site_id], _PLOT_LIMIT_PER_SITE):
            points.append(
                MicrolensingPoint(hjd=hjd, site=site_id, magnitude=mag + shift, mag_error=err)
            )
        sampled_ids[site_id] = []

    points.sort(key=lambda point: point.hjd)
    return MicrolensingLightCurveResponse(
        target_id=target_id,
        points=points,
        x_label="HJD",
        y_label="I-band magnitude (KMTNet pySIS difference photometry)",
        extraction_mode=mode,
        requested_sites=wanted,
        included_sites=included,
        missing_sites=missing,
        sampled_observation_ids=sampled_ids,
        is_complete=len(missing) == 0 and len(included) > 0,
        ref_t0=t0 or None,
        ref_u0=u0 or None,
        ref_te=tE or None,
    )
