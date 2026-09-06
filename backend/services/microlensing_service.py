"""Paczyński microlensing model fitting service."""

from __future__ import annotations


import numpy as np
from scipy.optimize import curve_fit

from schemas.microlensing import (
    MicrolensingLightCurveResponse,
    MicrolensingFitRequest,
    MicrolensingFitResponse,
    MicrolensingModelPoint,
    MicrolensingPreviewBundleResponse,
    MicrolensingPreviewResponse,
)
from services import kmtnet_actual_service, kmtnet_lightcurve_service

_SITE_LABELS = {
    "ctio": "CTIO (칠레)",
    "saao": "SAAO (남아프리카)",
    "sso": "SSO (호주)",
}
_PREVIEW_IMAGE_SIZE_PX = 320
_DEFAULT_PREVIEW_CUTOUT_SIZE_PX = 64
_MIN_PREVIEW_CUTOUT_SIZE_PX = 48
_MAX_PREVIEW_CUTOUT_SIZE_PX = 96


def get_lightcurve(
    target_id: str,
    site: str | None = None,
    mode: str = "quick",
    include_sites: list[str] | None = None,
    reference_frame_index: int | None = None,
) -> MicrolensingLightCurveResponse:
    # Real published KMTNet pySIS light curves (per site), served as a table.
    # Live difference imaging is too heavy for classroom use; see
    # kmtnet_lightcurve_service / memory project_kmtnet_real_lightcurve.
    return kmtnet_lightcurve_service.get_lightcurve(
        target_id,
        site=site,
        mode=mode,
        include_sites=include_sites,
        reference_frame_index=reference_frame_index,
    )


def get_preview(
    target_id: str,
    site: str,
    frame_index: int | None = None,
    size_px: int = _DEFAULT_PREVIEW_CUTOUT_SIZE_PX,
    reference_frame_index: int | None = None,
) -> MicrolensingPreviewResponse:
    return kmtnet_actual_service.get_preview(
        target_id,
        site=site,
        frame_index=frame_index,
        size_px=size_px,
        reference_frame_index=reference_frame_index,
    )


def list_bundled_preview_strips() -> list[tuple[str, str]]:
    return kmtnet_actual_service.list_bundled_preview_strips()


def get_preview_bundle(
    target_id: str,
    site: str,
    focus_frame_index: int | None = None,
    size_px: int = _DEFAULT_PREVIEW_CUTOUT_SIZE_PX,
    reference_frame_index: int | None = None,
) -> MicrolensingPreviewBundleResponse:
    return kmtnet_actual_service.get_preview_bundle(
        target_id,
        site=site,
        focus_frame_index=focus_frame_index,
        size_px=size_px,
        reference_frame_index=reference_frame_index,
    )


def _paczynski_mag(t: np.ndarray, t0: float, u0: float, tE: float, mag_base: float) -> np.ndarray:
    u0 = max(abs(u0), 1e-5)
    tE = max(abs(tE), 0.1)
    tau = (t - t0) / tE
    u = np.sqrt(u0 ** 2 + tau ** 2)
    A = (u ** 2 + 2.0) / (u * np.sqrt(u ** 2 + 4.0))
    return mag_base - 2.5 * np.log10(A)


_FIT_PARAM_NAMES = ("t0", "u0", "tE", "mag_base")


def _parameters_at_bounds(
    popt: np.ndarray,
    bounds: tuple[list[float], list[float]],
    rel_tol: float = 1e-3,
) -> list[str]:
    """Which fitted parameters stopped at the edge of their allowed range.

    curve_fit reports no error when a bounded fit converges onto a bound, and
    the resulting curve can look like a sharp real feature. Two of the nine
    bundled events do this (0106: u0 at the 2.0 ceiling; 0273: u0 at the ceiling
    and tE at the 0.5 d floor), and the spike it draws was read as a planetary
    anomaly on 2026-09-06.
    """
    hits: list[str] = []
    for name, value, low, high in zip(_FIT_PARAM_NAMES, popt, bounds[0], bounds[1]):
        span = float(high) - float(low)
        if span <= 0:
            continue
        margin = span * rel_tol
        if float(value) - float(low) <= margin or float(high) - float(value) <= margin:
            hits.append(name)
    return hits


def fit_paczynski(req: MicrolensingFitRequest) -> MicrolensingFitResponse:
    hjd = np.array([p.hjd for p in req.points])
    mag = np.array([p.magnitude for p in req.points])
    err = np.array([p.mag_error for p in req.points])

    if len(hjd) < 5:
        raise ValueError("최소 5개 이상의 데이터 포인트가 필요합니다.")

    # Initial guesses
    peak_idx = int(np.argmin(mag))
    t0_guess = req.t0_init if req.t0_init is not None else float(hjd[peak_idx])
    u0_guess = req.u0_init if req.u0_init is not None else 0.3
    tE_guess = req.tE_init if req.tE_init is not None else 20.0
    mag_base_guess = float(np.percentile(mag, 90))

    p0 = [t0_guess, u0_guess, tE_guess, mag_base_guess]
    bounds = (
        [float(hjd.min()), 1e-4, 0.5, mag_base_guess - 4.0],
        [float(hjd.max()), 2.0, 200.0, mag_base_guess + 1.0],
    )

    try:
        popt, pcov = curve_fit(
            _paczynski_mag, hjd, mag,
            p0=p0, sigma=err, bounds=bounds,
            maxfev=8000, absolute_sigma=True,
        )
        perr = np.sqrt(np.diag(pcov))
    except Exception as exc:
        raise ValueError(f"모델 적합 실패: {exc}") from exc

    t0_fit, u0_fit, tE_fit, mag_base_fit = popt
    t0_err, u0_err, tE_err, mag_base_err = perr

    # Model curve for overlay (300 points)
    t_model = np.linspace(float(hjd.min()), float(hjd.max()), 300)
    mag_model = _paczynski_mag(t_model, *popt)
    model_curve = [
        MicrolensingModelPoint(hjd=float(t), magnitude=float(m))
        for t, m in zip(t_model, mag_model)
    ]

    # Reduced chi-squared
    residuals = (mag - _paczynski_mag(hjd, *popt)) / err
    chi2_dof = float(np.sum(residuals ** 2) / max(len(hjd) - 4, 1))

    return MicrolensingFitResponse(
        t0=round(float(t0_fit), 4),
        u0=round(float(u0_fit), 5),
        tE=round(float(tE_fit), 3),
        mag_base=round(float(mag_base_fit), 4),
        t0_err=round(float(t0_err), 4),
        u0_err=round(float(u0_err), 5),
        tE_err=round(float(tE_err), 3),
        mag_base_err=round(float(mag_base_err), 4),
        chi2_dof=round(chi2_dof, 3),
        bounds_hit=_parameters_at_bounds(popt, bounds),
        model_curve=model_curve,
    )
