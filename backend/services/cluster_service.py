"""Open-cluster color-magnitude-diagram (CMD) data service.

Queries ESA Gaia DR3 (gaiadr3.gaia_source) via the Gaia TAP service for
astrometrically selected cluster members and returns photometry (Gaia G,
BP-RP) for plotting a color-magnitude diagram. Mirrors the live-data pattern
used by the TESS/transit feature: external public data fetched on demand and
memoized with an LRU cache so repeated requests for the same cluster are
instant.

Reference distance, log(age) and A_V per cluster are taken verbatim from
Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1;
columns DistPc, AgeNN, AVNN), re-queried 2026-09-05. ref_distance_modulus is
5·log10(DistPc)−5 and ref_age_gyr is 10**AgeNN / 1e9. The parallax / proper
motion selection windows (plx_min…pm_tol) are the app's own working cuts, not
catalog values.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from schemas.cluster import (
    ClusterCMDResponse,
    ClusterInfo,
    ClusterListResponse,
    ClusterMember,
)

_CATALOG: dict[str, dict] = {
    "ngc2632": {
        "name": "Praesepe (NGC 2632 / M44)",
        "name_ko": "프레세페 (NGC 2632, M44)",
        "ra": 130.05, "dec": 19.67, "search_radius_deg": 1.2,
        "ref_distance_pc": 183.0, "ref_distance_modulus": 6.31, "ref_age_gyr": 0.68,
        "ref_logage": 8.83, "ref_av": 0.00,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "가까운 산개성단. 주계열 맞추기로 거리 추정에 적합.",
        "note_en": "Nearby open cluster; well suited to main-sequence fitting for distance.",
        "plx_min": 4.6, "plx_max": 6.4, "pmra_c": -35.9, "pmdec_c": -12.9, "pm_tol": 3.0,
    },
    "m45": {
        "name": "Pleiades (M45)",
        "name_ko": "플레이아데스 (M45)",
        "ra": 56.60, "dec": 24.11, "search_radius_deg": 1.8,
        "ref_distance_pc": 128.0, "ref_distance_modulus": 5.54, "ref_age_gyr": 0.08,
        "ref_logage": 7.89, "ref_av": 0.18,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "젊은 산개성단. 주계열이 뚜렷하게 나타난다.",
        "note_en": "Young open cluster with a well-defined main sequence.",
        "plx_min": 6.5, "plx_max": 8.5, "pmra_c": 20.0, "pmdec_c": -45.5, "pm_tol": 4.0,
    },
    "melotte25": {
        "name": "Hyades (Melotte 25)",
        "name_ko": "히아데스 (Melotte 25)",
        "ra": 66.75, "dec": 15.87, "search_radius_deg": 6.0,
        "ref_distance_pc": 47.0, "ref_distance_modulus": 3.36, "ref_age_gyr": 0.79,
        "ref_logage": 8.90, "ref_av": 0.00,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "가장 가까운 산개성단. 하늘에서 넓게 퍼져 보인다.",
        "note_en": "Nearest open cluster; spread widely across the sky.",
        "plx_min": 18.0, "plx_max": 26.0, "pmra_c": 104.0, "pmdec_c": -28.0, "pm_tol": 12.0,
    },
    "ngc2168": {
        "name": "M35 (NGC 2168)",
        "name_ko": "M35 (NGC 2168)",
        "ra": 92.27, "dec": 24.33, "search_radius_deg": 0.5,
        "ref_distance_pc": 906.0, "ref_distance_modulus": 9.79, "ref_age_gyr": 0.15,
        "ref_logage": 8.17, "ref_av": 0.46,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "젊은 산개성단. 교과서의 성단 나이 비교 활동 대상.",
        "note_en": "Young open cluster; used in textbook age-comparison activities.",
        "plx_min": 0.9, "plx_max": 1.5, "pmra_c": 2.3, "pmdec_c": -2.9, "pm_tol": 1.5,
    },
    "ngc2158": {
        "name": "NGC 2158",
        "name_ko": "NGC 2158",
        "ra": 91.86, "dec": 24.10, "search_radius_deg": 0.22,
        "ref_distance_pc": 4298.0, "ref_distance_modulus": 13.17, "ref_age_gyr": 1.55,
        "ref_logage": 9.19, "ref_av": 1.44,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "오래되고 먼 산개성단. M35와의 나이 비교 대상.",
        "note_en": "Old, distant open cluster; age-comparison counterpart to M35.",
        "plx_min": 0.15, "plx_max": 0.45, "pmra_c": -0.2, "pmdec_c": -2.0, "pm_tol": 1.0,
    },
    "ngc2682": {
        "name": "M67 (NGC 2682)",
        "name_ko": "M67 (NGC 2682)",
        "ra": 132.83, "dec": 11.81, "search_radius_deg": 0.4,
        "ref_distance_pc": 889.0, "ref_distance_modulus": 9.74, "ref_age_gyr": 4.27,
        "ref_logage": 9.63, "ref_av": 0.07,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "태양과 비슷한 금속함량의 오래된 기준 성단.",
        "note_en": "Old, solar-metallicity benchmark cluster.",
        "plx_min": 0.9, "plx_max": 1.4, "pmra_c": -10.9, "pmdec_c": -2.9, "pm_tol": 1.5,
    },
    "ngc752": {
        "name": "NGC 752",
        "name_ko": "NGC 752",
        "ra": 29.22, "dec": 37.85, "search_radius_deg": 0.9,
        "ref_distance_pc": 483.0, "ref_distance_modulus": 8.42, "ref_age_gyr": 1.17,
        "ref_logage": 9.07, "ref_av": 0.07,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "가까운 중년 산개성단. 뚜렷한 전향점으로 나이 추정에 좋다.",
        "note_en": "Nearby intermediate-age open cluster with a clear turn-off, good for age estimates.",
        "plx_min": 1.9, "plx_max": 2.6, "pmra_c": 9.8, "pmdec_c": -11.8, "pm_tol": 2.5,
    },
    "ic2602": {
        "name": "IC 2602 (Southern Pleiades)",
        "name_ko": "IC 2602 (남쪽 플레이아데스)",
        "ra": 160.60, "dec": -64.40, "search_radius_deg": 1.0,
        "ref_distance_pc": 149.0, "ref_distance_modulus": 5.87, "ref_age_gyr": 0.04,
        "ref_logage": 7.56, "ref_av": 0.03,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "매우 젊고 가까운 남천 산개성단.",
        "note_en": "Very young, nearby southern open cluster.",
        "plx_min": 6.0, "plx_max": 7.2, "pmra_c": -17.6, "pmdec_c": 11.0, "pm_tol": 3.0,
    },
    "melotte111": {
        "name": "Coma Berenices (Melotte 111)",
        "name_ko": "머리털자리 성단 (Melotte 111)",
        "ra": 186.0, "dec": 25.85, "search_radius_deg": 4.0,
        "ref_distance_pc": 85.0, "ref_distance_modulus": 4.65, "ref_age_gyr": 0.65,
        "ref_logage": 8.81, "ref_av": 0.00,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "매우 가까운 산개성단. 하늘에 넓게 퍼져 보인다.",
        "note_en": "Very nearby open cluster, spread widely across the sky.",
        "plx_min": 10.5, "plx_max": 13.0, "pmra_c": -12.1, "pmdec_c": -8.9, "pm_tol": 4.0,
    },
    "ngc2516": {
        "name": "NGC 2516 (Southern Beehive)",
        "name_ko": "NGC 2516 (남쪽 벌집성단)",
        "ra": 119.52, "dec": -60.75, "search_radius_deg": 0.6,
        "ref_distance_pc": 423.0, "ref_distance_modulus": 8.13, "ref_age_gyr": 0.24,
        "ref_logage": 8.38, "ref_av": 0.11,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "밝고 구성원이 많은 남천 산개성단.",
        "note_en": "Bright, rich southern open cluster.",
        "plx_min": 2.1, "plx_max": 2.8, "pmra_c": -4.7, "pmdec_c": 11.2, "pm_tol": 3.0,
    },
    "ngc3532": {
        "name": "NGC 3532 (Wishing Well)",
        "name_ko": "NGC 3532 (소원의 우물 성단)",
        "ra": 166.41, "dec": -58.75, "search_radius_deg": 0.6,
        "ref_distance_pc": 498.0, "ref_distance_modulus": 8.49, "ref_age_gyr": 0.40,
        "ref_logage": 8.60, "ref_av": 0.00,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "구성원이 매우 많은 밝은 남천 산개성단.",
        "note_en": "Very rich, bright southern open cluster.",
        "plx_min": 1.8, "plx_max": 2.4, "pmra_c": -10.4, "pmdec_c": 5.3, "pm_tol": 3.0,
    },
    "ngc6475": {
        "name": "M7 (NGC 6475, Ptolemy Cluster)",
        "name_ko": "M7 (NGC 6475, 프톨레마이오스 성단)",
        "ra": 268.45, "dec": -34.79, "search_radius_deg": 0.8,
        "ref_distance_pc": 285.0, "ref_distance_modulus": 7.27, "ref_age_gyr": 0.22,
        "ref_logage": 8.35, "ref_av": 0.30,
        "reference": "Cantat-Gaudin et al. (2020), A&A 640, A1, Table 1 (VizieR J/A+A/640/A1)",
        "note_ko": "맨눈으로도 보이는 밝고 가까운 산개성단.",
        "note_en": "Bright, nearby naked-eye open cluster.",
        "plx_min": 2.9, "plx_max": 3.8, "pmra_c": 2.9, "pmdec_c": -4.9, "pm_tol": 3.0,
    },
}

_PUBLIC_FIELDS = (
    "name", "name_ko", "ra", "dec", "search_radius_deg",
    "ref_distance_pc", "ref_distance_modulus", "ref_age_gyr", "ref_logage", "ref_av",
    "reference", "note_ko", "note_en",
    "plx_min", "plx_max", "pmra_c", "pmdec_c", "pm_tol",
)


def _cluster_info(cluster_id: str) -> ClusterInfo:
    raw = _CATALOG[cluster_id]
    return ClusterInfo(id=cluster_id, **{key: raw[key] for key in _PUBLIC_FIELDS})


def list_clusters() -> ClusterListResponse:
    return ClusterListResponse(clusters=[_cluster_info(cid) for cid in _CATALOG])


def _to_float(value) -> float | None:
    try:
        if value is None:
            return None
        number = float(value)
        return number if number == number else None  # drop NaN
    except (TypeError, ValueError):
        return None


# How much wider than the recommended window the server fetches. Enough field
# stars to make "loosen the criteria" visibly messy, not so many that the
# payload or the Gaia query grows unreasonable.
WIDEN_PARALLAX = 1.5
WIDEN_PROPER_MOTION = 4.0

_BUNDLE_DIR = Path(__file__).resolve().parent.parent / "bundled_clusters"


def _bundled_fetched_on(cluster_id: str) -> str | None:
    path = _BUNDLE_DIR / f"{cluster_id}.json"
    if not path.is_file():
        return None
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle).get("fetched")
    except (OSError, ValueError):
        return None


def _bundled_members(cluster_id: str) -> tuple | None:
    """Members downloaded from Gaia ahead of time and shipped with the app.

    The live TAP query takes 6-9 s per cluster on a warm server and starts over
    whenever the process restarts (the cache below is in-memory only, and the
    free hosting tier sleeps). That wait sat in the middle of Step 4, where the
    learner is meant to be reading a diagram. These files were produced by the
    same ADQL on 2026-09-05; delete one and the live path below takes over.
    """
    path = _BUNDLE_DIR / f"{cluster_id}.json"
    if not path.is_file():
        return None
    try:
        with path.open(encoding="utf-8") as handle:
            payload = json.load(handle)
        return tuple(tuple(row) for row in payload["members"])
    except (OSError, ValueError, KeyError):
        return None


@lru_cache(maxsize=64)
def _query_gaia_members(cluster_id: str) -> tuple:
    bundled = _bundled_members(cluster_id)
    if bundled:
        return bundled

    raw = _CATALOG[cluster_id]
    try:
        from astroquery.gaia import Gaia
    except Exception as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "astroquery is not installed. Run: pip install -r backend/requirements.txt"
        ) from exc

    def build(plx_min: float, plx_max: float, tol: float | None, top: int) -> str:
        pm = ""
        if tol is not None:
            pm = (
                f" AND pmra BETWEEN {raw['pmra_c'] - tol} AND {raw['pmra_c'] + tol}"
                f" AND pmdec BETWEEN {raw['pmdec_c'] - tol} AND {raw['pmdec_c'] + tol}"
            )
        return (
            f"SELECT TOP {top} source_id, phot_g_mean_mag, bp_rp, parallax, pmra, pmdec, "
            "parallax_error, phot_g_mean_flux_over_error "
            "FROM gaiadr3.gaia_source "
            "WHERE 1=CONTAINS(POINT('ICRS', ra, dec), "
            f"CIRCLE('ICRS', {raw['ra']}, {raw['dec']}, {raw['search_radius_deg']})) "
            f"AND parallax BETWEEN {plx_min} AND {plx_max} "
            "AND bp_rp IS NOT NULL AND phot_g_mean_mag IS NOT NULL "
            "AND ruwe < 1.4"
            f"{pm}"
        )

    # Two queries, not one. Step 3 needs field stars to show what loosening the
    # criteria does, so the second query reaches well past the recommended
    # window — but a single wide query hits the row cap in dense fields and the
    # archive drops whatever it likes, which removed every real member of
    # NGC 3532 and M7 (measured 2026-09-06). Asking for the recommended set
    # first makes the cap fall only on field stars.
    #
    # ADQL ORDER BY would have been the tidier fix; the Gaia async endpoint
    # answers 500 to any "SELECT TOP n … ORDER BY", with or without the
    # expression, so ordering is not available here.
    plx_span = raw["plx_max"] - raw["plx_min"]
    queries = [
        build(raw["plx_min"], raw["plx_max"], raw.get("pm_tol"), 4000),
        build(
            max(0.02, raw["plx_min"] - plx_span * WIDEN_PARALLAX),
            raw["plx_max"] + plx_span * WIDEN_PARALLAX,
            None if raw.get("pm_tol") is None else raw["pm_tol"] * WIDEN_PROPER_MOTION,
            12000,
        ),
    ]

    seen: set[str] = set()
    members: list[tuple] = []
    for adql in queries:
        table = Gaia.launch_job_async(adql).get_results()
        colmap = {name.lower(): name for name in table.colnames}

        def column(row, key):
            actual = colmap.get(key)
            return row[actual] if actual is not None else None

        for row in table:
            source_id = column(row, "source_id")
            g_mag = _to_float(column(row, "phot_g_mean_mag"))
            bp_rp = _to_float(column(row, "bp_rp"))
            if source_id is None or g_mag is None or bp_rp is None:
                continue
            key = str(int(source_id))
            if key in seen:
                continue
            seen.add(key)
            members.append((
                key,
                g_mag,
                bp_rp,
                _to_float(column(row, "parallax")),
                _to_float(column(row, "pmra")),
                _to_float(column(row, "pmdec")),
                _to_float(column(row, "parallax_error")),
                _to_float(column(row, "phot_g_mean_flux_over_error")),
            ))
    return tuple(members)


def get_cluster_cmd(cluster_id: str) -> ClusterCMDResponse:
    key = cluster_id.strip().lower()
    if key not in _CATALOG:
        raise ValueError(f"Unknown cluster id: {cluster_id}")

    rows = _query_gaia_members(key)
    if not rows:
        raise RuntimeError(f"No Gaia members returned for cluster {cluster_id}")

    members = [
        ClusterMember(
            source_id=row[0],
            g_mag=row[1],
            bp_rp=row[2],
            parallax=row[3],
            pmra=row[4],
            pmdec=row[5],
            parallax_error=row[6] if len(row) > 6 else None,
            g_flux_snr=row[7] if len(row) > 7 else None,
        )
        for row in rows
    ]

    return ClusterCMDResponse(
        cluster=_cluster_info(key),
        member_count=len(members),
        color_label="Gaia BP - RP",
        mag_label="Gaia G",
        members=members,
        data_source=(
            f"ESA Gaia DR3 (gaiadr3.gaia_source) via TAP · {fetched_on} 내려받아 앱에 포함"
            if (fetched_on := _bundled_fetched_on(key))
            else "ESA Gaia DR3 (gaiadr3.gaia_source) via TAP · 지금 조회"
        ),
        selection_note_ko="시차·고유운동·측광 품질(RUWE<1.4) 기준의 천문측량 구성원 선별",
        selection_note_en="Astrometric member selection by parallax, proper motion, and photometric quality (RUWE<1.4)",
    )
