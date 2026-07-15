"""Pre-fetch demo TESS cutout FITS into backend/bundled_cutouts/ at image build time.

Shipping an always-ready practice cutout inside the Docker image lets classroom
demos load instantly with no runtime MAST dependency, and it survives Render free
spin-downs (it is part of the image, not the ephemeral /tmp staging).

The primary demo cutout (WASP-6 b) is committed to the repo, so this script is a
no-op for it (the file already exists and is skipped). For any *additional* demo
cutout not yet committed, it fetches from MAST and FAILS THE BUILD if it cannot —
so a deploy can never silently ship a missing practice cutout.

Filename convention matches transit_service._bundled_cutout_path():
    {target_id}__{observation_id}__s{sector:04d}__{size_px}px.fits
where size_px is the *requested* (normalized) size the app will ask for.
"""
from __future__ import annotations

import io
import json
import sys
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen

_TESSCUT_URL = "https://mast.stsci.edu/tesscut/api/v0.1/astrocut"

# (target_id, observation_id, ra, dec, sector, size_px)
_DEMO_CUTOUTS: list[tuple[str, str, float, float, int, int]] = [
    ("wasp_6_b", "wasp_6_b_sector_0002", 348.1571282, -22.6741248, 2, 50),
]

_OUT_DIR = Path(__file__).resolve().parent.parent / "bundled_cutouts"


def _fetch_fits(ra: float, dec: float, sector: int, size_px: int) -> bytes:
    payload = json.dumps(
        {"ra": ra, "dec": dec, "x": size_px, "y": size_px, "units": "px", "sector": sector}
    ).encode("utf-8")
    request = Request(
        _TESSCUT_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=180) as response:
        zip_bytes = response.read()
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
        fits_name = next(n for n in archive.namelist() if n.lower().endswith(".fits"))
        return archive.read(fits_name)


def main() -> int:
    _OUT_DIR.mkdir(parents=True, exist_ok=True)
    failures: list[str] = []
    for target_id, observation_id, ra, dec, sector, size_px in _DEMO_CUTOUTS:
        out_path = _OUT_DIR / f"{target_id}__{observation_id}__s{sector:04d}__{size_px}px.fits"
        # A committed cutout (WASP-6 b) is already present -> skip, no MAST call.
        if out_path.exists() and out_path.stat().st_size > 0:
            print(f"[bundled-cutouts] already present, skipping: {out_path.name}")
            continue
        # Retry a few times: MAST tesscut can be briefly flaky at build time.
        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                data = _fetch_fits(ra, dec, sector, size_px)
                out_path.write_bytes(data)
                print(f"[bundled-cutouts] saved {out_path.name} ({len(data) / 1024 / 1024:.1f} MB)")
                last_error = None
                break
            except Exception as error:  # noqa: BLE001
                last_error = error
                print(
                    f"[bundled-cutouts] attempt {attempt}/3 failed for {out_path.name}: {error}",
                    file=sys.stderr,
                )
        if last_error is not None:
            failures.append(out_path.name)
    if failures:
        # Fail the build loudly rather than silently shipping a missing demo cutout.
        print(
            f"[bundled-cutouts] ERROR: could not obtain {failures} — failing build.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
