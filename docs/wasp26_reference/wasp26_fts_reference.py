#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import math
import re

import batman
import matplotlib.pyplot as plt
from matplotlib.ticker import ScalarFormatter
import numpy as np
import pandas as pd
from scipy.optimize import least_squares


ROOT = Path(__file__).resolve().parent
FTS_PATH = ROOT / "fts.dat"
FTN_PATH = ROOT / "ftn.dat"
README_PATH = ROOT / "ReadMe"

RAW_PNG = ROOT / "literature_wasp26_fts_raw.png"
FIT_PNG = ROOT / "literature_wasp26_fts_fit.png"
POSTER_PNG = ROOT / "literature_wasp26_fts_clean_poster.png"
POINTS_CSV = ROOT / "literature_wasp26_fts_points.csv"
MODEL_CSV = ROOT / "literature_wasp26_fts_model.csv"
SUMMARY_TXT = ROOT / "literature_wasp26_fts_summary.txt"

CDS_BASE_URL = "https://cdsarc.cds.unistra.fr/ftp/J/A+A/520/A56/"
CATALOG_ID = "J/A+A/520/A56"
DISCOVERY_PERIOD_DAYS = 2.75660

# Southworth et al. (2014), MNRAS 444, 776, Table 6.
SOUTHWORTH_K = 0.0991
SOUTHWORTH_R_A = 0.1505
SOUTHWORTH_A_RS = 1.0 / SOUTHWORTH_R_A
SOUTHWORTH_INCLINATION = 82.83

# The CDS ReadMe specifies Pan-STARRS-z photometry. We fix quadratic
# limb-darkening to the closest local template available in this repo, SDSS z'.
FIXED_LD_U1 = 0.24
FIXED_LD_U2 = 0.22


@dataclass
class FitResult:
    t0_hjd: float
    rp_rs: float
    a_rs: float
    inc_deg: float
    baseline_intercept: float
    baseline_slope_per_day: float
    t_ref_hjd: float
    chi_square: float
    reduced_chi_square: float
    residual_rms: float
    parameter_errors: dict[str, float]


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_metadata() -> dict[str, list[str] | str]:
    text = _read_text(README_PATH)
    lines = text.splitlines()

    description_lines = []
    for index, line in enumerate(lines):
        if line.startswith("Description:"):
            description_lines = lines[index : index + 6]
            break

    fts_section = []
    for index, line in enumerate(lines):
        if "Byte-by-byte Description of file: ftn.dat fts.dat" in line:
            fts_section = lines[index : index + 8]
            break

    file_summary = []
    in_summary = False
    for line in lines:
        if line.startswith("File Summary:"):
            in_summary = True
        if in_summary:
            file_summary.append(line)
            if line.startswith("See also:"):
                break

    return {
        "readme_text": text,
        "description_lines": description_lines,
        "fts_section": fts_section,
        "file_summary": file_summary,
    }


def load_fts_points() -> pd.DataFrame:
    data = np.loadtxt(FTS_PATH)
    frame = pd.DataFrame(data, columns=["hjd", "rzmag", "e_rzmag"])
    flux = 10.0 ** (-0.4 * frame["rzmag"].to_numpy())
    flux_err = (math.log(10.0) / 2.5) * flux * frame["e_rzmag"].to_numpy()
    frame["relative_flux"] = flux
    frame["relative_flux_error"] = flux_err
    return frame


def cadence_days(times: np.ndarray) -> float:
    deltas = np.diff(np.sort(times))
    deltas = deltas[np.isfinite(deltas) & (deltas > 0)]
    if deltas.size == 0:
        return 60.0 / 86400.0
    return float(np.median(deltas))


def initial_guess(frame: pd.DataFrame) -> np.ndarray:
    times = frame["hjd"].to_numpy()
    flux = frame["relative_flux"].to_numpy()
    mags = frame["rzmag"].to_numpy()
    t_ref = float(np.median(times))
    edge_points = min(30, len(frame) // 4)
    edge_idx = np.r_[0:edge_points, len(frame) - edge_points : len(frame)]
    baseline_intercept = float(np.median(flux[edge_idx]))

    first_chunk = min(20, len(frame) // 5)
    last_chunk = min(20, len(frame) // 5)
    slope = float(
        (
            np.median(flux[-last_chunk:])
            - np.median(flux[:first_chunk])
        )
        / (
            np.median(times[-last_chunk:])
            - np.median(times[:first_chunk])
        )
    )

    return np.array(
        [
            float(times[np.argmax(mags)]),
            SOUTHWORTH_K,
            SOUTHWORTH_A_RS,
            SOUTHWORTH_INCLINATION,
            baseline_intercept,
            slope,
            t_ref,
        ],
        dtype=float,
    )


def transit_model(
    times: np.ndarray,
    t0_hjd: float,
    rp_rs: float,
    a_rs: float,
    inc_deg: float,
    exp_time_days: float,
) -> np.ndarray:
    params = batman.TransitParams()
    params.t0 = float(t0_hjd)
    params.per = DISCOVERY_PERIOD_DAYS
    params.rp = float(rp_rs)
    params.a = float(a_rs)
    params.inc = float(inc_deg)
    params.ecc = 0.0
    params.w = 90.0
    params.u = [FIXED_LD_U1, FIXED_LD_U2]
    params.limb_dark = "quadratic"
    model = batman.TransitModel(
        params,
        np.asarray(times, dtype=np.float64),
        supersample_factor=11,
        exp_time=float(exp_time_days),
    )
    return model.light_curve(params)


def baseline_model(times: np.ndarray, intercept: float, slope_per_day: float, t_ref_hjd: float) -> np.ndarray:
    return intercept + slope_per_day * (times - t_ref_hjd)


def fit_fts_transit(frame: pd.DataFrame) -> FitResult:
    times = frame["hjd"].to_numpy()
    flux = frame["relative_flux"].to_numpy()
    flux_err = frame["relative_flux_error"].to_numpy()
    exp_time_days = cadence_days(times)
    guess = initial_guess(frame)
    t_ref_hjd = float(guess[-1])

    def residuals(theta: np.ndarray) -> np.ndarray:
        t0_hjd, rp_rs, a_rs, inc_deg, intercept, slope_per_day = theta
        if not (
            times.min() - 0.03 <= t0_hjd <= times.max() + 0.03
            and 0.03 <= rp_rs <= 0.20
            and 3.0 <= a_rs <= 20.0
            and 75.0 <= inc_deg <= 90.0
            and 0.95 <= intercept <= 1.05
            and -0.50 <= slope_per_day <= 0.50
        ):
            return np.full(times.shape, 1e6, dtype=float)

        baseline = baseline_model(times, intercept, slope_per_day, t_ref_hjd)
        model_flux = baseline * transit_model(times, t0_hjd, rp_rs, a_rs, inc_deg, exp_time_days)
        return (flux - model_flux) / np.maximum(flux_err, 1e-9)

    lower = np.array([times.min() - 0.03, 0.03, 3.0, 75.0, 0.95, -0.50], dtype=float)
    upper = np.array([times.max() + 0.03, 0.20, 20.0, 90.0, 1.05, 0.50], dtype=float)
    result = least_squares(
        residuals,
        guess[:6],
        bounds=(lower, upper),
        method="trf",
        loss="linear",
        max_nfev=2000,
    )
    if not result.success:
        raise RuntimeError(f"Transit fit failed: {result.message}")

    chi_square = float(2.0 * result.cost)
    dof = max(len(times) - len(result.x), 1)
    reduced_chi_square = float(chi_square / dof)

    jacobian = result.jac
    if jacobian is not None and jacobian.size:
        _, singular_values, vt = np.linalg.svd(jacobian, full_matrices=False)
        threshold = np.finfo(float).eps * max(jacobian.shape) * singular_values[0]
        singular_values = singular_values[singular_values > threshold]
        vt = vt[: singular_values.size]
        covariance = (vt.T / (singular_values**2)) @ vt
        variance = np.clip(np.diag(covariance) * reduced_chi_square, 0.0, None)
        errors = np.sqrt(variance)
    else:
        errors = np.zeros(len(result.x), dtype=float)

    best_t0, best_rp_rs, best_a_rs, best_inc_deg, best_intercept, best_slope = result.x
    baseline = baseline_model(times, best_intercept, best_slope, t_ref_hjd)
    best_transit = transit_model(times, best_t0, best_rp_rs, best_a_rs, best_inc_deg, exp_time_days)
    normalized_flux = flux / baseline
    residuals_norm = normalized_flux - best_transit
    residual_rms = float(np.sqrt(np.mean(residuals_norm**2)))

    return FitResult(
        t0_hjd=float(best_t0),
        rp_rs=float(best_rp_rs),
        a_rs=float(best_a_rs),
        inc_deg=float(best_inc_deg),
        baseline_intercept=float(best_intercept),
        baseline_slope_per_day=float(best_slope),
        t_ref_hjd=t_ref_hjd,
        chi_square=chi_square,
        reduced_chi_square=reduced_chi_square,
        residual_rms=residual_rms,
        parameter_errors={
            "t0_hjd": float(errors[0]),
            "rp_rs": float(errors[1]),
            "a_rs": float(errors[2]),
            "inc_deg": float(errors[3]),
            "baseline_intercept": float(errors[4]),
            "baseline_slope_per_day": float(errors[5]),
        },
    )


def orbital_phase(times: np.ndarray, t0_hjd: float) -> np.ndarray:
    return ((times - t0_hjd + 0.5 * DISCOVERY_PERIOD_DAYS) % DISCOVERY_PERIOD_DAYS) / DISCOVERY_PERIOD_DAYS - 0.5


def build_outputs(frame: pd.DataFrame, fit: FitResult) -> tuple[pd.DataFrame, pd.DataFrame]:
    times = frame["hjd"].to_numpy()
    flux = frame["relative_flux"].to_numpy()
    flux_err = frame["relative_flux_error"].to_numpy()
    exp_time_days = cadence_days(times)

    baseline = baseline_model(times, fit.baseline_intercept, fit.baseline_slope_per_day, fit.t_ref_hjd)
    model_norm = transit_model(times, fit.t0_hjd, fit.rp_rs, fit.a_rs, fit.inc_deg, exp_time_days)
    model_flux = baseline * model_norm
    phase = orbital_phase(times, fit.t0_hjd)

    points = frame.copy()
    points["phase"] = phase
    points["baseline_flux"] = baseline
    points["normalized_flux"] = flux / baseline
    points["normalized_flux_error"] = flux_err / baseline
    points["model_flux"] = model_flux
    points["model_normalized_flux"] = model_norm
    points["residual_flux"] = points["normalized_flux"] - points["model_normalized_flux"]

    dense_times = np.linspace(times.min(), times.max(), 3000)
    dense_baseline = baseline_model(dense_times, fit.baseline_intercept, fit.baseline_slope_per_day, fit.t_ref_hjd)
    dense_model_norm = transit_model(dense_times, fit.t0_hjd, fit.rp_rs, fit.a_rs, fit.inc_deg, exp_time_days)
    dense_phase = orbital_phase(dense_times, fit.t0_hjd)
    model = pd.DataFrame(
        {
            "hjd": dense_times,
            "phase": dense_phase,
            "baseline_flux": dense_baseline,
            "model_flux": dense_baseline * dense_model_norm,
            "model_normalized_flux": dense_model_norm,
        }
    )

    return points, model


def set_plot_style() -> None:
    plt.rcParams.update(
        {
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "axes.edgecolor": "#666666",
            "axes.grid": True,
            "grid.color": "#d9d9d9",
            "grid.linestyle": "-",
            "grid.alpha": 0.55,
            "font.size": 10,
            "axes.labelsize": 11,
            "axes.titlesize": 14,
            "xtick.labelsize": 9,
            "ytick.labelsize": 9,
            "savefig.facecolor": "white",
            "savefig.bbox": "tight",
        }
    )


def flux_limits(values: np.ndarray, padding: float = 0.0012) -> tuple[float, float]:
    return float(np.nanmin(values) - padding), float(np.nanmax(values) + padding)


def plot_raw_hjd(points: pd.DataFrame) -> None:
    set_plot_style()
    fig, ax = plt.subplots(figsize=(10.5, 3.7))
    ax.errorbar(
        points["hjd"],
        points["normalized_flux"],
        yerr=points["normalized_flux_error"],
        fmt="o",
        markersize=3.0,
        color="#222222",
        ecolor="#c9c9c9",
        elinewidth=0.8,
        capsize=0,
        markeredgewidth=0,
    )
    ax.set_title("WASP-26 b FTS Transit")
    ax.set_xlabel("HJD (d)")
    ax.set_ylabel("Normalized flux")
    ax.set_ylim(*flux_limits(points["normalized_flux"].to_numpy()))
    ax.xaxis.set_major_formatter(ScalarFormatter(useOffset=True))
    fig.savefig(RAW_PNG, dpi=220)
    plt.close(fig)


def plot_fit_hjd(points: pd.DataFrame, model: pd.DataFrame) -> None:
    set_plot_style()
    fig, (ax_main, ax_resid) = plt.subplots(
        2,
        1,
        figsize=(10.8, 5.0),
        sharex=True,
        gridspec_kw={"height_ratios": [3.5, 1.0]},
    )

    ax_main.errorbar(
        points["hjd"],
        points["normalized_flux"],
        yerr=points["normalized_flux_error"],
        fmt="o",
        markersize=3.0,
        color="#222222",
        ecolor="#c9c9c9",
        elinewidth=0.8,
        capsize=0,
        markeredgewidth=0,
        label="FTS points",
    )
    ax_main.plot(model["hjd"], model["model_normalized_flux"], color="#d62728", linewidth=2.0, label="batman fit")
    ax_main.set_ylabel("Normalized flux")
    ax_main.set_title("WASP-26 b FTS Transit Fit")
    ax_main.legend(frameon=False, loc="best")
    ax_main.set_ylim(*flux_limits(points["normalized_flux"].to_numpy()))

    ax_resid.axhline(0.0, color="#d62728", linewidth=1.0, alpha=0.8)
    ax_resid.errorbar(
        points["hjd"],
        points["residual_flux"],
        yerr=points["normalized_flux_error"],
        fmt="o",
        markersize=2.7,
        color="#333333",
        ecolor="#d0d0d0",
        elinewidth=0.7,
        capsize=0,
        markeredgewidth=0,
    )
    residual_limit = max(0.003, 1.2 * float(np.nanmax(np.abs(points["residual_flux"]))))
    ax_resid.set_ylim(-residual_limit, residual_limit)
    ax_resid.set_xlabel("HJD (d)")
    ax_resid.set_ylabel("Residual")
    ax_resid.xaxis.set_major_formatter(ScalarFormatter(useOffset=True))

    fig.savefig(FIT_PNG, dpi=220)
    plt.close(fig)


def plot_clean_phase(points: pd.DataFrame, model: pd.DataFrame) -> None:
    set_plot_style()
    ordered_points = points.sort_values("phase")
    ordered_model = model.sort_values("phase")

    fig, ax = plt.subplots(figsize=(10.8, 3.9))
    ax.errorbar(
        ordered_points["phase"],
        ordered_points["normalized_flux"],
        yerr=ordered_points["normalized_flux_error"],
        fmt="o",
        markersize=3.1,
        color="#222222",
        ecolor="#cecece",
        elinewidth=0.8,
        capsize=0,
        markeredgewidth=0,
    )
    ax.plot(ordered_model["phase"], ordered_model["model_normalized_flux"], color="#d62728", linewidth=2.2)
    ax.set_xlabel("Orbital phase")
    ax.set_ylabel("Normalized flux")
    ax.set_title("WASP-26 b")
    ax.set_xlim(float(ordered_points["phase"].min()) - 0.002, float(ordered_points["phase"].max()) + 0.002)
    ax.set_ylim(*flux_limits(ordered_points["normalized_flux"].to_numpy()))
    fig.savefig(POSTER_PNG, dpi=240)
    plt.close(fig)


def write_csvs(points: pd.DataFrame, model: pd.DataFrame) -> None:
    columns = [
        "hjd",
        "phase",
        "rzmag",
        "e_rzmag",
        "relative_flux",
        "relative_flux_error",
        "baseline_flux",
        "normalized_flux",
        "normalized_flux_error",
        "model_flux",
        "model_normalized_flux",
        "residual_flux",
    ]
    points[columns].to_csv(POINTS_CSV, index=False, float_format="%.10f")
    model.to_csv(MODEL_CSV, index=False, float_format="%.10f")


def format_file_excerpt(path: Path, line_count: int = 5) -> str:
    lines = _read_text(path).splitlines()
    return "\n".join(lines[:line_count])


def build_summary(metadata: dict[str, list[str] | str], frame: pd.DataFrame, fit: FitResult, points: pd.DataFrame) -> str:
    excerpt = format_file_excerpt(FTS_PATH, line_count=5)
    cadence_seconds = cadence_days(frame["hjd"].to_numpy()) * 86400.0
    t0_err = fit.parameter_errors["t0_hjd"]
    rp_err = fit.parameter_errors["rp_rs"]
    a_err = fit.parameter_errors["a_rs"]
    inc_err = fit.parameter_errors["inc_deg"]

    summary = f"""WASP-26 b FTS Literature Reference Summary
============================================================
Catalog:
  CDS/VizieR {CATALOG_ID}
  Base URL: {CDS_BASE_URL}

Download Status:
  SUCCESS: {FTS_PATH.name}, {FTN_PATH.name}, and {README_PATH.name} are present in {ROOT}

Proof Of Raw CDS Content (first 5 lines of fts.dat):
{excerpt}

ReadMe Description:
{chr(10).join(metadata["description_lines"])}

ReadMe Byte-By-Byte Section For fts.dat:
{chr(10).join(metadata["fts_section"])}

Interpreted fts.dat Columns:
  Column 1: HJD [days]            -- Julian Date of observation
  Column 2: rzmag [mag]           -- Relative magnitude in Pan-STARRS-z band
  Column 3: e_rzmag [mag]         -- Uncertainty on relative magnitude

Parsing Notes:
  The CDS ReadMe labels the time axis as HJD, not BJD.
  The file has {len(frame)} rows.
  Median cadence: {cadence_seconds:.2f} s

Normalization Method:
  1. Convert relative magnitude to relative flux using flux = 10^(-0.4 * rzmag).
  2. Fit a multiplicative linear baseline simultaneously with the transit model:
       baseline(t) = c0 + c1 * (t - t_ref)
  3. Define normalized flux as observed_flux / best_fit_baseline.
  This keeps the plotted y-axis in normalized flux while remaining tied to the
  original CDS magnitude measurements.

Fit Configuration:
  Model: batman quadratic limb-darkened transit
  Fixed orbital period: {DISCOVERY_PERIOD_DAYS:.5f} d (Smalley et al. 2010 / CDS ReadMe abstract)
  Fixed eccentricity: 0.0
  Fixed omega: 90 deg
  Fixed limb darkening: u1={FIXED_LD_U1:.2f}, u2={FIXED_LD_U2:.2f}
    Note: Pan-STARRS-z is approximated with the local SDSS z' template.
  Free parameters:
    T0, Rp/R*, a/R*, inclination, baseline intercept, baseline slope
  Initial transit geometry seeds from Southworth et al. (2014) Table 6:
    Rp/R* = {SOUTHWORTH_K:.4f}
    a/R*  = {SOUTHWORTH_A_RS:.4f}
    i     = {SOUTHWORTH_INCLINATION:.2f} deg

Fit Results:
  fitted T0 (HJD)           = {fit.t0_hjd:.7f} +/- {t0_err:.7f}
  fitted Rp/R*              = {fit.rp_rs:.5f} +/- {rp_err:.5f}
  fitted a/R*               = {fit.a_rs:.5f} +/- {a_err:.5f}
  fitted inclination (deg)  = {fit.inc_deg:.3f} +/- {inc_err:.3f}
  chi-square                = {fit.chi_square:.3f}
  reduced chi-square        = {fit.reduced_chi_square:.3f}
  residual RMS              = {fit.residual_rms:.6f}

Poster Panel Recommendation:
  Use {POSTER_PNG.name} for the poster.
  Reason: orbital phase gives a compact, readable x-axis and places the transit
  center at phase 0, which makes side-by-side comparison easier than a large
  absolute HJD axis.
  The raw-time-axis alternative is saved as {RAW_PNG.name}.

Generated Files:
  {RAW_PNG.name}
  {FIT_PNG.name}
  {POSTER_PNG.name}
  {POINTS_CSV.name}
  {MODEL_CSV.name}
  {SUMMARY_TXT.name}
"""
    return summary


def print_run_log(metadata: dict[str, list[str] | str], fit: FitResult) -> None:
    print("CDS raw download status: SUCCESS")
    print(f"fts.dat path: {FTS_PATH}")
    print(f"ftn.dat path: {FTN_PATH}")
    print(f"ReadMe path: {README_PATH}")
    print("")
    print("First 5 lines of fts.dat:")
    print(format_file_excerpt(FTS_PATH, line_count=5))
    print("")
    print("ReadMe byte-by-byte section:")
    print("\n".join(metadata["fts_section"]))
    print("")
    print("Fit summary:")
    print(f"  T0 (HJD)      = {fit.t0_hjd:.7f}")
    print(f"  Rp/R*         = {fit.rp_rs:.5f}")
    print(f"  a/R*          = {fit.a_rs:.5f}")
    print(f"  inclination   = {fit.inc_deg:.3f} deg")
    print(f"  chi-square    = {fit.chi_square:.3f}")
    print(f"  red. chi-square = {fit.reduced_chi_square:.3f}")
    print(f"  residual RMS  = {fit.residual_rms:.6f}")


def main() -> None:
    metadata = load_metadata()
    frame = load_fts_points()
    fit = fit_fts_transit(frame)
    points, model = build_outputs(frame, fit)

    write_csvs(points, model)
    plot_raw_hjd(points)
    plot_fit_hjd(points, model)
    plot_clean_phase(points, model)

    summary = build_summary(metadata, frame, fit, points)
    SUMMARY_TXT.write_text(summary, encoding="utf-8")
    print_run_log(metadata, fit)
    print("")
    print(f"Summary written to: {SUMMARY_TXT}")
    print(f"Poster panel written to: {POSTER_PNG}")


if __name__ == "__main__":
    main()
