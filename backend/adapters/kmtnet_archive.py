"""KMTNet microlensing event archive — real public KMTNet bulge events.

Event coordinates and published (t0, u0, tE) parameters come from the public
KMTNet ulens database; per-site light curves are fetched live from the ulens
pySIS files (services/kmtnet_lightcurve_service), and the per-frame images the
difference-imaging screen shows come from the KASI archive via
services/kmtnet_data_service. Nothing here is generated: the synthetic
observation generator that used to stand in when the archive was unreachable was
removed on 2026-09-06 and replaced by bundled real rows.
"""

from __future__ import annotations

import math
import random
from typing import Any

# Approximate HJD for peak of each galactic bulge season (June)
_YEAR_T0: dict[int, float] = {
    2016: 2457600.0,
    2017: 2457950.0,
    2018: 2458300.0,
    2019: 2458650.0,
    2020: 2458998.0,
    2021: 2459363.0,
    2022: 2459728.0,
    2023: 2460093.0,
}

_SITES = {
    "ctio": {"lon_frac": 0.0},
    "saao": {"lon_frac": 0.33},
    "sso":  {"lon_frac": 0.67},
}

# Column layout:
#   (id, year, ra, dec, event_type, t0_offset, u0, tE, mag_base
#    [, planet_dt, planet_dur, planet_depth])
# t0_offset = days from year's season peak
# planet_dt = planet_t0 relative to event t0
_RAW_EVENTS: list[tuple] = [
    # Real public KMTNet 2019 bulge events (ulens DB). Coordinates and (t0, u0, tE)
    # are published values; t0_offset = t0(HJD) - season peak (2458650.0). mag_base is
    # nominal — the real baseline comes from the .pysis light curve at runtime. Event
    # type derived from u0 (u0 <= 0.12 → high magnification). Per-site light curves are
    # fetched live from the ulens pySIS files by services/kmtnet_lightcurve_service.
    ("kmt-2019-blg-0003", 2019, 262.1299, -30.0977, "ML",    -108.408, 0.356, 44.52, 19.0),
    ("kmt-2019-blg-0028", 2019, 268.2009, -31.0457, "ML",    -100.639, 0.449,  3.39, 19.0),
    ("kmt-2019-blg-0080", 2019, 267.5838, -30.9340, "ML",     -60.673, 0.632, 64.77, 19.0),
    ("kmt-2019-blg-0106", 2019, 269.5002, -33.7115, "ML",       3.487, 0.998, 14.60, 19.0),
    ("kmt-2019-blg-0113", 2019, 268.4735, -29.8791, "ML",     -83.949, 0.662, 34.87, 19.0),
    ("kmt-2019-blg-0128", 2019, 269.8946, -29.0638, "ML",       1.054, 0.262, 62.59, 19.0),
    ("kmt-2019-blg-0182", 2019, 266.1490, -24.3553, "ML",     -50.093, 0.197, 115.40, 19.0),
    ("kmt-2019-blg-0227", 2019, 271.7784, -26.1622, "ML-HM",  -28.692, 0.104, 48.30, 19.0),
    ("kmt-2019-blg-0273", 2019, 265.6653, -26.0063, "ML",     -60.185, 1.000, 18.47, 19.0),
]


def _a_max(u0: float) -> float:
    u2 = u0 * u0
    return (u2 + 2.0) / (u0 * math.sqrt(u2 + 4.0))


def _mag_peak(mag_base: float, u0: float) -> float:
    return mag_base - 2.5 * math.log10(_a_max(u0))


def _build_description(ev_type: str, u0: float, tE: float,
                        planet_dur: float | None = None) -> str:
    if ev_type == "ML-HM":
        delta = _a_max(u0)
        return (
            f"고증폭 단일 렌즈 이벤트. u₀ ≈ {u0:.3f}, "
            f"피크 증폭 A_max ≈ {delta:.1f}배 ({2.5 * math.log10(delta):.1f} mag). "
            f"tE ≈ {tE:.0f} d. 아인슈타인 링에 근접하며 행성 이상신호 탐색에 민감."
        )
    if ev_type == "ML-P":
        return (
            f"행성 이상신호를 포함한 미시중력렌즈 이벤트. "
            f"u₀ ≈ {u0:.2f}, tE ≈ {tE:.0f} d. "
            f"단일 렌즈 곡선 위에 약 {planet_dur:.1f}일간의 추가 증폭이 겹쳐 "
            f"행성의 신호로 해석됨. 연속 감시망 없이는 포착 불가."
        )
    return (
        f"표준 단일 렌즈 이벤트. u₀ ≈ {u0:.2f}, tE ≈ {tE:.0f} d. "
        f"CTIO·SAAO·SSO 연속 감시로 피크 전후를 완전히 포착."
    )


def _build_events() -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for row in _RAW_EVENTS:
        event_id, year, ra, dec, ev_type = row[:5]
        t0_offset, u0, tE, mag_base = row[5], row[6], row[7], row[8]
        t0 = _YEAR_T0[year] + t0_offset

        peak = _mag_peak(mag_base, u0)
        mag_range = f"I = {peak:.1f} – {mag_base:.1f}"

        if ev_type == "ML-P":
            planet_dt, planet_dur, planet_depth = row[9], row[10], row[11]
            model: dict[str, Any] = {
                "type": "planetary",
                "t0": t0, "u0": u0, "tE": tE, "mag_base": mag_base,
                "planet_t0": t0 + planet_dt,
                "planet_dur": planet_dur,
                "planet_depth": planet_depth,
            }
            desc = _build_description(ev_type, u0, tE, planet_dur)
        else:
            model = {"type": "single", "t0": t0, "u0": u0, "tE": tE, "mag_base": mag_base}
            desc = _build_description(ev_type, u0, tE)

        events.append({
            "id": event_id,
            "name": event_id.upper(),
            "ra": ra,
            "dec": dec,
            "constellation": "Sagittarius",
            "type": ev_type,
            "period_days": None,
            "magnitude_range": mag_range,
            "description": desc,
            "topic_id": "microlensing",
            "model": model,
        })
    return events


KMT_EVENTS: list[dict[str, Any]] = _build_events()


# ── physics ───────────────────────────────────────────────────────────────────

def _paczynski_amplification(u: float) -> float:
    if u < 1e-6:
        u = 1e-6
    u2 = u * u
    return (u2 + 2.0) / (u * math.sqrt(u2 + 4.0))


def _single_lens_mag(hjd: float, model: dict) -> float:
    tau = (hjd - model["t0"]) / model["tE"]
    u = math.sqrt(model["u0"] ** 2 + tau ** 2)
    return model["mag_base"] - 2.5 * math.log10(_paczynski_amplification(u))


def _planetary_mag(hjd: float, model: dict) -> float:
    base_mag = _single_lens_mag(hjd, model)
    dt = hjd - model["planet_t0"]
    half = model["planet_dur"] / 2.0
    if abs(dt) < half:
        extra = model["planet_depth"] * (1.0 - (dt / half) ** 2)
        base_mag -= extra
    return base_mag


class KmtnetArchive:
    """In-memory KMTNet microlensing event store (event coordinates and published model parameters)."""

    def __init__(self) -> None:
        self._events = KMT_EVENTS
        self._observations: dict[str, list[dict]] = {}

    def list_targets(self, topic_id: str | None = None) -> list[dict[str, Any]]:
        if topic_id and topic_id != "microlensing":
            return []
        return self._events

    def get_target(self, target_id: str) -> dict[str, Any] | None:
        return next((e for e in self._events if e["id"] == target_id), None)

    def list_observations(self, target_id: str) -> list[dict]:
        return self._observations.get(target_id, [])

    def get_observation(self, obs_id: str) -> dict | None:
        for obs_list in self._observations.values():
            for obs in obs_list:
                if obs["id"] == obs_id:
                    return obs
        return None


archive = KmtnetArchive()
