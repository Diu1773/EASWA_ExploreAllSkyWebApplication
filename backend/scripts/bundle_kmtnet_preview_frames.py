"""Render the Step 3 difference-imaging frames ahead of time.

Step 3 asks the learner to look at how a brightness measurement is actually
produced: the observed frame, the same frame aligned onto a reference, the
reference itself, and what is left after subtraction. Doing that live costs
37 s for the first frame and ~20 s for each further one (measured 2026-09-06,
localhost against the KASI archive), which is not usable inside a class.

This script runs the identical computation on the identical real frames and
writes the result to disk. Nothing here invents an image: every pixel comes
from a KMTNet FITS cutout downloaded from archive.kasi.re.kr.

Three frames per site, all from the event's own season: the one closest to the
published peak time, one about a timescale away, and one at the far end of the
season. Events whose archive cutouts come from other years are skipped — their
frames never saw the brightening. What each frame shows in the difference image
is for the learner to read, so nothing here is labelled as the answer.

    python -X utf8 backend/scripts/bundle_kmtnet_preview_frames.py --sites ctio
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import kmtnet_actual_service as actual  # noqa: E402
from services import microlensing_service  # noqa: E402

OUT_DIR = BACKEND_DIR / "bundled_kmtnet" / "preview_bundle"
SIZE_PX = 96


COVERAGE_WINDOW_DAYS = 60.0
MIN_SPAN_DAYS = 10.0
CANDIDATE_LIMIT = 8
MIN_REGISTRATION_CORRELATION = 0.6
KEEP_FRAMES = 3


def pick_frames(target_id: str, site: str) -> tuple[list[int], int] | None:
    """Candidate frames to try, plus the frame to subtract them against.

    Returns None when the public archive has nothing usable for this event.
    Only frames from the event's own season are eligible: for most of the nine
    events the archive holds cutouts from other years only, and those show the
    field, not the event (checked 2026-09-06 — six of nine have no frame within
    20 days of t0 at any site).

    The reference is pinned to the frame farthest from the published peak.
    Letting the service choose it put the reference 7.6 days before t0 for
    kmt-2019-blg-0080, and since these events have tE around 63 days the
    reference was itself magnified — the subtraction then cancelled most of the
    signal along with the constant stars (measured magnification 0.95 at the
    peak frame, i.e. no event at all).
    """
    rows = actual._list_rows(target_id, site)
    if len(rows) < 3:
        return None
    hjds = [float(row.get("hjd") or 0.0) for row in rows]

    lc = microlensing_service.get_lightcurve(target_id, site=site)
    if lc.ref_t0 is None:
        return None
    t0 = float(lc.ref_t0)

    in_season = [i for i, h in enumerate(hjds) if abs(h - t0) <= COVERAGE_WINDOW_DAYS]
    if len(in_season) < 3:
        return None
    span = max(hjds[i] for i in in_season) - min(hjds[i] for i in in_season)
    if span < MIN_SPAN_DAYS:
        # Consecutive nights only: three near-identical frames teach nothing.
        return None

    reference_index = max(in_season, key=lambda i: abs(hjds[i] - t0))
    remaining = [i for i in in_season if i != reference_index]
    if not remaining:
        return None
    # More candidates than needed: some archive frames never line up with the
    # reference (different pointing, cloud), and those are dropped after the
    # correlation comes back. Ordered nearest-to-peak first so a good peak frame
    # survives even if several candidates fail.
    ordered = sorted(remaining, key=lambda i: abs(hjds[i] - t0))
    spread = sorted(remaining, key=lambda i: -abs(hjds[i] - t0))
    candidates: list[int] = []
    for index in [*ordered[:CANDIDATE_LIMIT // 2], *spread[:CANDIDATE_LIMIT]]:
        if index not in candidates:
            candidates.append(index)
        if len(candidates) >= CANDIDATE_LIMIT:
            break
    return candidates, reference_index


def bundle_one(target_id: str, site: str, *, force: bool) -> bool:
    out_path = OUT_DIR / f"{target_id}__{site}.json"
    if out_path.is_file() and not force:
        print(f"  skip {target_id} {site} (already bundled)")
        return True

    picked = pick_frames(target_id, site)
    if picked is None:
        print(f"  none {target_id} {site}: no usable frames")
        return False
    candidates, reference_index = picked

    kept: list[dict] = []
    seen_indices: set[int] = set()
    for index in candidates:
        if len(kept) >= KEEP_FRAMES:
            break
        started = time.time()
        try:
            preview = actual.get_preview(
                target_id,
                site=site,
                frame_index=index,
                size_px=SIZE_PX,
                reference_frame_index=reference_index,
            )
        except Exception as error:  # noqa: BLE001 - one bad frame must not stop the run
            print(f"  fail {target_id} {site} frame {index}: {error}")
            continue
        # get_preview may step to a neighbouring frame when a cutout has poor
        # coverage; record where it actually landed.
        if preview.frame_index in seen_indices:
            continue
        seen_indices.add(preview.frame_index)
        meta = preview.frame_metadata
        correlation = preview.registration_correlation
        verdict = "keep" if correlation >= MIN_REGISTRATION_CORRELATION else "drop"
        print(f"  {verdict} {target_id} {site} frame {index}->{preview.frame_index} "
              f"({time.time() - started:.1f}s, corr {correlation:.2f}, mag {meta.magnitude}, A {meta.magnification})")
        if correlation >= MIN_REGISTRATION_CORRELATION:
            kept.append(json.loads(preview.model_dump_json()))

    if len(kept) < 2:
        print(f"  none {target_id} {site}: fewer than two frames aligned with the reference")
        return False

    kept.sort(key=lambda item: item["frame_metadata"]["hjd"])
    resolved_indices = [item["frame_index"] for item in kept]
    payload = {
        "target_id": target_id,
        "site": site,
        "fetched": time.strftime("%Y-%m-%d"),
        "source": "archive.kasi.re.kr KMTNet cutouts, registered and subtracted by kmtnet_actual_service",
        "bundle": {
            "target_id": target_id,
            "site": site,
            "focus_frame_index": resolved_indices[-1],
            "reference_frame_index": kept[0]["reference_frame_index"],
            "bundle_frame_indices": resolved_indices,
            "previews": kept,
        },
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    mags = [item["frame_metadata"]["magnitude"] for item in kept]
    print(f"  wrote {out_path.name} ({out_path.stat().st_size / 1e6:.1f} MB) "
          f"{len(kept)} frames, mag spread {max(mags) - min(mags):.2f}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sites", default="ctio", help="comma-separated site keys")
    parser.add_argument("--targets", default="", help="comma-separated target ids (default: all bundled)")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if args.targets:
        target_ids = [t.strip() for t in args.targets.split(",") if t.strip()]
    else:
        obs_dir = BACKEND_DIR / "bundled_kmtnet" / "observations"
        target_ids = sorted(p.stem for p in obs_dir.glob("*.json"))

    sites = [s.strip() for s in args.sites.split(",") if s.strip()]
    started = time.time()
    for target_id in target_ids:
        for site in sites:
            print(f"{target_id} / {site}")
            bundle_one(target_id, site, force=args.force)
    print(f"done in {time.time() - started:.0f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
