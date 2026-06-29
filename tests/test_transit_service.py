import io
import sys
from pathlib import Path
from urllib.error import HTTPError

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from schemas.transit import (
    PixelCoordinate,
    TransitApertureConfig,
    TransitObservationContext,
    TransitPhotometryRequest,
    TransitTargetContext,
)
from services import transit_service


class FakeWCS:
    def all_world2pix(self, coords, origin):
        results = []
        for ra, dec in coords:
            x = 30.0 + (float(ra) - 100.0) * 500.0
            y = 30.0 + (float(dec) - 20.0) * 500.0
            results.append([x, y])
        return np.asarray(results, dtype=float)


def test_query_tic_stars_filters_out_edge_and_blank_candidates(monkeypatch):
    monkeypatch.setattr(
        transit_service,
        "_query_tic_rows",
        lambda ra, dec, radius: [
            {"ID": 1, "ra": 100.0020, "dec": 20.0020, "Tmag": 11.0, "disposition": None},
            {"ID": 2, "ra": 100.0280, "dec": 20.0280, "Tmag": 11.5, "disposition": None},
            {"ID": 3, "ra": 100.0500, "dec": 20.0000, "Tmag": 12.0, "disposition": None},
        ],
    )

    image = np.zeros((60, 60), dtype=np.float32)
    image[29:32, 29:32] = 10.0
    coverage = np.ones((60, 60), dtype=np.float32)
    coverage[40:60, 40:60] = 0.4

    stars = transit_service._query_tic_stars(
        ra=100.0,
        dec=20.0,
        radius_arcmin=10.0,
        target_tmag=11.5,
        wcs_obj=FakeWCS(),
        reference_image=image,
        finite_coverage=coverage,
    )

    assert [star.tic_id for star in stars] == ["1"]
    assert stars[0].recommended is True


def test_query_tic_stars_deduplicates_target_overlap_and_same_pixel_candidates(monkeypatch):
    monkeypatch.setattr(
        transit_service,
        "_query_tic_rows",
        lambda ra, dec, radius: [
            {"ID": 1, "ra": 100.0001, "dec": 20.0001, "Tmag": 11.0, "disposition": None},
            {"ID": 2, "ra": 100.0040, "dec": 20.0040, "Tmag": 11.5, "disposition": None},
            {"ID": 3, "ra": 100.0040, "dec": 20.0040, "Tmag": 11.7, "disposition": None},
        ],
    )

    image = np.zeros((60, 60), dtype=np.float32)
    image[31:34, 31:34] = 10.0
    coverage = np.ones((60, 60), dtype=np.float32)

    stars = transit_service._query_tic_stars(
        ra=100.0,
        dec=20.0,
        radius_arcmin=10.0,
        target_tmag=11.5,
        wcs_obj=FakeWCS(),
        reference_image=image,
        finite_coverage=coverage,
    )

    assert [star.tic_id for star in stars] == ["2"]
    assert stars[0].recommended is True


def test_run_transit_photometry_uses_request_context_without_archive_lookup(monkeypatch):
    def fail_target_lookup(*args, **kwargs):
        raise AssertionError("archive target lookup should not be called")

    def fail_observation_lookup(*args, **kwargs):
        raise AssertionError("archive observation lookup should not be called")

    monkeypatch.setattr(transit_service, "_require_target", fail_target_lookup)
    monkeypatch.setattr(transit_service, "_require_observation", fail_observation_lookup)
    monkeypatch.setattr(
        transit_service,
        "_load_cutout_dataset",
        lambda *args, **kwargs: transit_service.CutoutDataset(
            target_id="wasp_52_b",
            observation_id="wasp_52_b_sector_0042",
            sector=42,
            camera=2,
            ccd=3,
            size_px=35,
            cutout_url="",
            times=np.asarray([1.0, 2.0, 3.0], dtype=np.float64),
            flux_cube=np.ones((3, 20, 20), dtype=np.float32),
            target_position=PixelCoordinate(x=10.5, y=10.5),
            quality_flags=np.zeros(3, dtype=np.int64),
        ),
    )

    captured: dict[str, object] = {}

    def fake_measure_apertures(dataset, apertures, indices):
        captured["apertures"] = apertures
        # First aperture = target (bright), the rest = comparisons (flat).
        return [
            np.asarray([10.0, 11.0, 12.0], dtype=np.float64)
            if slot == 0
            else np.asarray([5.0, 5.0, 5.0], dtype=np.float64)
            for slot, _ in enumerate(apertures)
        ]

    monkeypatch.setattr(transit_service, "_measure_apertures_chunked", fake_measure_apertures)

    response = transit_service.run_transit_photometry(
        TransitPhotometryRequest(
            target_id="wasp_52_b",
            observation_id="wasp_52_b_sector_0042",
            cutout_size_px=35,
            target_context=TransitTargetContext(ra=348.4947931, dec=8.7610793, period_days=1.7497798),
            observation_context=TransitObservationContext(sector=42, camera=2, ccd=3),
            target_position=PixelCoordinate(x=3.5, y=3.5),
            comparison_positions=[PixelCoordinate(x=5.5, y=5.5)],
            aperture_radius=2.5,
            inner_annulus=4.0,
            outer_annulus=6.0,
            target_aperture=TransitApertureConfig(
                position=PixelCoordinate(x=3.5, y=3.5),
                aperture_radius=2.0,
                inner_annulus=3.5,
                outer_annulus=5.5,
            ),
            comparison_apertures=[
                TransitApertureConfig(
                    position=PixelCoordinate(x=5.5, y=5.5),
                    aperture_radius=3.0,
                    inner_annulus=4.5,
                    outer_annulus=6.5,
                )
            ],
        )
    )

    assert response.sector == 42
    assert response.frame_count == 3
    assert response.comparison_count == 1
    assert response.light_curve.period_days == 1.7497798
    assert len(response.light_curve.points) == 3
    assert len(response.comparison_diagnostics) == 1
    assert response.comparison_diagnostics[0].label == "C1"
    target_aperture, comparison_aperture = captured["apertures"]
    assert (
        target_aperture.position.x,
        target_aperture.aperture_radius,
        target_aperture.inner_annulus,
        target_aperture.outer_annulus,
    ) == (3.5, 2.0, 3.5, 5.5)
    assert (
        comparison_aperture.position.x,
        comparison_aperture.aperture_radius,
        comparison_aperture.inner_annulus,
        comparison_aperture.outer_annulus,
    ) == (5.5, 3.0, 4.5, 6.5)


def test_run_transit_photometry_reports_real_progress(monkeypatch):
    def fake_load_cutout_dataset(*args, progress_callback=None, **kwargs):
        if progress_callback is not None:
            progress_callback(0.5, "Loading cutout dataset.")
        return transit_service.CutoutDataset(
            target_id="wasp_52_b",
            observation_id="wasp_52_b_sector_0042",
            sector=42,
            camera=2,
            ccd=3,
            size_px=35,
            cutout_url="",
            times=np.asarray([1.0, 2.0, 3.0], dtype=np.float64),
            flux_cube=np.ones((3, 20, 20), dtype=np.float32),
            target_position=PixelCoordinate(x=10.5, y=10.5),
            quality_flags=np.zeros(3, dtype=np.int64),
        )

    monkeypatch.setattr(transit_service, "_load_cutout_dataset", fake_load_cutout_dataset)
    monkeypatch.setattr(
        transit_service,
        "_measure_apertures_chunked",
        lambda dataset, apertures, indices: [
            np.asarray([10.0, 11.0, 12.0], dtype=np.float64) for _ in apertures
        ],
    )

    events: list[tuple[float, str]] = []
    response = transit_service.run_transit_photometry(
        TransitPhotometryRequest(
            target_id="wasp_52_b",
            observation_id="wasp_52_b_sector_0042",
            cutout_size_px=35,
            target_context=TransitTargetContext(
                ra=348.4947931,
                dec=8.7610793,
                period_days=1.7497798,
            ),
            observation_context=TransitObservationContext(sector=42, camera=2, ccd=3),
            target_position=PixelCoordinate(x=3.5, y=3.5),
            comparison_positions=[PixelCoordinate(x=5.5, y=5.5)],
        ),
        progress_callback=lambda pct, message: events.append((pct, message)),
    )

    assert response.frame_count == 3
    assert len(events) >= 4
    assert events[0][1] == "Resolving target and observation context."
    assert any("Loading cutout dataset." in message for _, message in events)
    assert events[-1] == (1.0, "Transit photometry complete.")


def test_run_transit_photometry_reuses_preview_dataset_token(monkeypatch):
    transit_service._preview_dataset_tokens.clear()

    dataset = transit_service.CutoutDataset(
        target_id="wasp_52_b",
        observation_id="wasp_52_b_sector_0042",
        sector=42,
        camera=2,
        ccd=3,
        size_px=35,
        cutout_url="",
        times=np.asarray([1.0, 2.0, 3.0], dtype=np.float64),
        flux_cube=np.ones((3, 20, 20), dtype=np.float32),
        target_position=PixelCoordinate(x=10.5, y=10.5),
        quality_flags=np.zeros(3, dtype=np.int64),
    )
    token = transit_service._store_preview_dataset_token(dataset)

    def fail_load_cutout_dataset(*args, **kwargs):
        raise AssertionError("cutout download should not run when preview dataset token is valid")

    monkeypatch.setattr(transit_service, "_load_cutout_dataset", fail_load_cutout_dataset)
    monkeypatch.setattr(
        transit_service,
        "_measure_apertures_chunked",
        lambda dataset, apertures, indices: [
            np.asarray([10.0, 11.0, 12.0], dtype=np.float64) for _ in apertures
        ],
    )

    events: list[tuple[float, str]] = []
    response = transit_service.run_transit_photometry(
        TransitPhotometryRequest(
            target_id="wasp_52_b",
            observation_id="wasp_52_b_sector_0042",
            cutout_size_px=35,
            preview_dataset_token=token,
            target_context=TransitTargetContext(
                ra=348.4947931,
                dec=8.7610793,
                period_days=1.7497798,
            ),
            observation_context=TransitObservationContext(sector=42, camera=2, ccd=3),
            target_position=PixelCoordinate(x=3.5, y=3.5),
            comparison_positions=[PixelCoordinate(x=5.5, y=5.5)],
        ),
        progress_callback=lambda pct, message: events.append((pct, message)),
    )

    assert response.frame_count == 3
    assert any("Reusing cutout already loaded in step 1." in message for _, message in events)


def test_run_transit_photometry_reuses_recent_preview_dataset_without_token(monkeypatch):
    transit_service._preview_dataset_tokens.clear()

    dataset = transit_service.CutoutDataset(
        target_id="wasp_52_b",
        observation_id="wasp_52_b_sector_0042",
        sector=42,
        camera=2,
        ccd=3,
        size_px=35,
        cutout_url="",
        times=np.asarray([1.0, 2.0, 3.0], dtype=np.float64),
        flux_cube=np.ones((3, 20, 20), dtype=np.float32),
        target_position=PixelCoordinate(x=10.5, y=10.5),
        quality_flags=np.zeros(3, dtype=np.int64),
    )
    transit_service._store_preview_dataset_token(dataset)

    def fail_load_cutout_dataset(*args, **kwargs):
        raise AssertionError("cutout download should not run when a recent preview dataset is available")

    monkeypatch.setattr(transit_service, "_load_cutout_dataset", fail_load_cutout_dataset)
    monkeypatch.setattr(
        transit_service,
        "_measure_apertures_chunked",
        lambda dataset, apertures, indices: [
            np.asarray([10.0, 11.0, 12.0], dtype=np.float64) for _ in apertures
        ],
    )

    events: list[tuple[float, str]] = []
    response = transit_service.run_transit_photometry(
        TransitPhotometryRequest(
            target_id="wasp_52_b",
            observation_id="wasp_52_b_sector_0042",
            cutout_size_px=35,
            target_context=TransitTargetContext(
                ra=348.4947931,
                dec=8.7610793,
                period_days=1.7497798,
            ),
            observation_context=TransitObservationContext(sector=42, camera=2, ccd=3),
            target_position=PixelCoordinate(x=3.5, y=3.5),
            comparison_positions=[PixelCoordinate(x=5.5, y=5.5)],
        ),
        progress_callback=lambda pct, message: events.append((pct, message)),
    )

    assert response.frame_count == 3
    assert any("Reusing cutout already loaded in step 1." in message for _, message in events)


def test_load_cutout_dataset_reuses_recent_oversized_cutout(monkeypatch):
    transit_service._cutout_cache.clear()
    transit_service._hot_cutout_cache.clear()
    monkeypatch.setattr(transit_service, "_CUTOUT_CACHE_MAX_BYTES", 1)
    monkeypatch.setattr(transit_service, "_HOT_CUTOUT_CACHE_MAX_ITEMS", 1)

    cache_key = ("wasp_52_b", "wasp_52_b_sector_0042", 42, 60)
    dataset = transit_service.CutoutDataset(
        target_id="wasp_52_b",
        observation_id="wasp_52_b_sector_0042",
        sector=42,
        camera=2,
        ccd=3,
        size_px=60,
        cutout_url="",
        times=np.asarray([1.0, 2.0, 3.0], dtype=np.float64),
        flux_cube=np.ones((3, 60, 60), dtype=np.float32),
        target_position=PixelCoordinate(x=30.5, y=30.5),
        quality_flags=np.zeros(3, dtype=np.int64),
    )

    transit_service._store_cutout_dataset(cache_key, dataset)

    assert cache_key not in transit_service._cutout_cache
    assert cache_key in transit_service._hot_cutout_cache

    def fail_urlopen(*args, **kwargs):
        raise AssertionError("urlopen should not be called when oversized cutout is reusable")

    monkeypatch.setattr(transit_service, "urlopen", fail_urlopen)

    reused = transit_service._load_cutout_dataset(
        target_id="wasp_52_b",
        observation_id="wasp_52_b_sector_0042",
        ra=348.4947931,
        dec=8.7610793,
        sector=42,
        camera=2,
        ccd=3,
        cutout_url="",
        size_px=60,
    )

    assert reused is dataset


def test_load_cutout_dataset_staging_keeps_fits_and_removes_zip(monkeypatch, tmp_path):
    transit_service._cutout_cache.clear()
    transit_service._hot_cutout_cache.clear()

    # Staging on, persistent cache off — the Render configuration.
    monkeypatch.setattr(transit_service, "_is_staging_enabled", lambda: True)
    monkeypatch.setattr(transit_service, "_is_disk_cutout_cache_enabled", lambda: False)
    monkeypatch.setattr(transit_service, "_TRANSIT_STAGE_DIR", tmp_path)

    # Network bytes "streamed" into the temp ZIP — no-op leaves an empty file.
    monkeypatch.setattr(transit_service, "_stream_cutout_response", lambda *a, **k: None)

    created_fits: dict[str, Path] = {}

    def fake_extract_temp_fits(zip_path):
        fits_path = tmp_path / "extracted.fits"
        fits_path.write_bytes(b"FITS")
        created_fits["path"] = fits_path
        return fits_path

    monkeypatch.setattr(transit_service, "_extract_temp_fits_from_zip", fake_extract_temp_fits)

    seen: dict[str, object] = {}

    def fake_dataset_from_fits_path(*, fits_path, **kwargs):
        seen["fits_path"] = fits_path
        # FITS must still exist while it is being read.
        assert Path(fits_path).exists()
        return transit_service.CutoutDataset(
            target_id="t",
            observation_id="o",
            sector=1,
            camera=1,
            ccd=1,
            size_px=30,
            cutout_url="",
            times=np.asarray([1.0], dtype=np.float64),
            flux_cube=np.ones((1, 5, 5), dtype=np.float32),
            target_position=PixelCoordinate(x=2.5, y=2.5),
            quality_flags=np.zeros(1, dtype=np.int64),
        )

    monkeypatch.setattr(transit_service, "_dataset_from_fits_path", fake_dataset_from_fits_path)

    dataset = transit_service._load_cutout_dataset(
        target_id="t",
        observation_id="o",
        ra=10.0,
        dec=20.0,
        sector=1,
        camera=1,
        ccd=1,
        cutout_url="",
        size_px=30,
    )

    assert dataset.size_px == 30
    assert seen["fits_path"] == created_fits["path"]
    # The staged FITS is retained — the lazy dataset reads it on demand later
    # (the staging-dir TTL prune reclaims it). Only the consumed ZIP is removed.
    assert created_fits["path"].exists()
    assert list(tmp_path.glob("*.zip")) == []


def _write_fake_cutout_fits(path, flux):
    from astropy.io import fits

    frames, height, width = flux.shape
    times = np.linspace(1000.0, 1000.0 + frames, frames, dtype=np.float64)
    quality = np.zeros(frames, dtype=np.int32)
    cadence = np.arange(frames, dtype=np.int32)
    pixels = fits.BinTableHDU.from_columns(
        [
            fits.Column(name="TIME", format="D", array=times),
            fits.Column(name="CADENCENO", format="J", array=cadence),
            fits.Column(
                name="FLUX",
                format=f"{height * width}E",
                dim=f"({width},{height})",
                array=flux,
            ),
            fits.Column(name="QUALITY", format="J", array=quality),
        ],
        name="PIXELS",
    )
    aperture = fits.ImageHDU(np.ones((height, width), dtype=np.int32), name="APERTURE")
    fits.HDUList([fits.PrimaryHDU(), pixels, aperture]).writeto(path, overwrite=True)


def test_lazy_dataset_reads_cube_from_disk_in_chunks(tmp_path):
    frames, height, width = 6, 5, 5
    flux = np.arange(frames * height * width, dtype=np.float32).reshape(frames, height, width)
    flux[2, 0, 0] = np.nan  # exercise NaN handling in stats / median fallback
    fits_path = tmp_path / "cutout.fits"
    _write_fake_cutout_fits(fits_path, flux)

    dataset = transit_service._dataset_from_fits_path(
        target_id="t",
        observation_id="o",
        sector=1,
        camera=1,
        ccd=1,
        size_px=5,
        cutout_url="",
        ra=10.0,
        dec=20.0,
        fits_path=fits_path,
    )

    # Lazy mode: cube stays on disk, only the path + metadata are held.
    assert dataset.flux_cube is None
    assert dataset.fits_path == fits_path
    assert transit_service._dataset_is_readable(dataset) is True
    assert transit_service._cutout_shape(dataset) == (frames, height, width)

    # Single-frame read and full chunked reassembly match the source.
    assert np.allclose(transit_service._read_flux_frame(dataset, 0), flux[0])
    collected = np.concatenate(
        [block for _, block in transit_service._iter_flux_chunks(dataset, chunk_frames=4)],
        axis=0,
    )
    assert np.allclose(collected, flux, equal_nan=True)

    # Chunked aperture photometry equals the original whole-cube primitive.
    aperture = transit_service._ResolvedAperture(
        position=PixelCoordinate(x=2.5, y=2.5),
        aperture_radius=1.5,
        inner_annulus=1.6,
        outer_annulus=2.4,
    )
    indices = np.arange(frames)
    lazy_flux = transit_service._measure_apertures_chunked(dataset, [aperture], indices)[0]
    expected_flux = transit_service._extract_net_flux(
        flux,
        aperture.position,
        aperture.aperture_radius,
        aperture.inner_annulus,
        aperture.outer_annulus,
    )
    assert np.allclose(lazy_flux, expected_flux, equal_nan=True)

    # A quality-mask subset selects the matching frames.
    subset = np.array([1, 3, 5])
    lazy_subset = transit_service._measure_apertures_chunked(dataset, [aperture], subset)[0]
    assert np.allclose(lazy_subset, expected_flux[subset], equal_nan=True)


def test_dataset_is_readable_false_when_staged_fits_missing(tmp_path):
    dataset = transit_service.CutoutDataset(
        target_id="t",
        observation_id="o",
        sector=1,
        camera=1,
        ccd=1,
        size_px=5,
        cutout_url="",
        times=np.asarray([1.0], dtype=np.float64),
        target_position=PixelCoordinate(x=2.5, y=2.5),
        fits_path=tmp_path / "gone.fits",
        frame_shape=(1, 5, 5),
    )
    assert transit_service._dataset_is_readable(dataset) is False


def test_stream_cutout_response_rejects_oversized_download(monkeypatch):
    monkeypatch.setattr(transit_service, "TRANSIT_CUTOUT_MAX_DOWNLOAD_BYTES", 1000)

    class FakeResponse:
        headers = {"Content-Length": "5000"}

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def read(self, _size):  # pragma: no cover - should never be reached
            raise AssertionError("download body should not be read once over budget")

    monkeypatch.setattr(transit_service, "urlopen", lambda *a, **k: FakeResponse())

    sink = io.BytesIO()
    try:
        transit_service._stream_cutout_response("request", sink, None)
    except RuntimeError as error:
        assert "too large" in str(error)
    else:
        raise AssertionError("Expected an oversized-download RuntimeError")
    assert sink.getvalue() == b""


def test_disk_cutout_cache_path_disabled_returns_none(monkeypatch):
    monkeypatch.setattr(transit_service, "_is_disk_cutout_cache_enabled", lambda: False)

    path = transit_service._disk_cutout_cache_path(
        ("wasp_52_b", "wasp_52_b_sector_0042", 42, 35)
    )

    assert path is None


def test_urlopen_with_retries_retries_transient_http_errors(monkeypatch):
    attempts: list[int] = []
    sleep_calls: list[float] = []
    response = object()

    def fake_urlopen(request, timeout=0):
        attempts.append(int(timeout))
        if len(attempts) < 3:
            raise HTTPError(
                url="https://mast.stsci.edu/tesscut/api/v0.1/astrocut",
                code=502,
                msg="Bad Gateway",
                hdrs=None,
                fp=None,
            )
        return response

    monkeypatch.setattr(transit_service, "urlopen", fake_urlopen)
    monkeypatch.setattr(transit_service.time, "sleep", lambda seconds: sleep_calls.append(seconds))

    result = transit_service._urlopen_with_retries("request", timeout=12, attempts=3)

    assert result is response
    assert len(attempts) == 3
    assert len(sleep_calls) == 2
    assert sleep_calls[0] < sleep_calls[1]


def test_urlopen_with_retries_does_not_retry_non_retryable_http_errors(monkeypatch):
    attempts: list[int] = []

    def fake_urlopen(request, timeout=0):
        attempts.append(int(timeout))
        raise HTTPError(
            url="https://mast.stsci.edu/tesscut/api/v0.1/astrocut",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=None,
        )

    monkeypatch.setattr(transit_service, "urlopen", fake_urlopen)
    monkeypatch.setattr(transit_service.time, "sleep", lambda seconds: (_ for _ in ()).throw(AssertionError("sleep should not run")))

    try:
        transit_service._urlopen_with_retries("request", timeout=12, attempts=3)
    except HTTPError as error:
        assert error.code == 404
    else:
        raise AssertionError("Expected the original HTTPError to be raised")

    assert len(attempts) == 1
