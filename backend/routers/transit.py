import json
from collections.abc import AsyncGenerator, Callable, Generator
from functools import lru_cache

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import iterate_in_threadpool

import config
from schemas.transit import (
    TransitCutoutPreviewResponse,
    TransitPhotometryRequest,
    TransitPhotometryResponse,
    TransitPreviewJobResponse,
)
from schemas.transit_fit import TransitFitRequest, TransitFitResponse
from services.rate_limit_service import enforce_rate_limit
from services import transit_service
from services.stream_gate import (
    FIT_STREAM_GATE,
    PHOTOMETRY_STREAM_GATE,
    QueueTimeoutError,
    StreamGate,
    wait_turn_events,
)

router = APIRouter(tags=["transit"])


def _ndjson_line(payload: dict) -> str:
    return json.dumps(payload) + "\n"


async def _gated_ndjson_stream(
    gate: StreamGate,
    events_factory: Callable[[], Generator[dict, None, None]],
    *,
    queued_message: str,
) -> AsyncGenerator[str, None]:
    """Run a sync NDJSON event generator behind a global concurrency gate.

    While waiting for a slot, periodically emits ``queued`` progress events in
    the streams' existing progress schema so the frontend can render them with
    its normal progress path. If no slot frees up within
    ``config.STREAM_QUEUE_WAIT_SECONDS``, ends the stream with the streams'
    existing error-event schema. See docs/LOAD_TEST_2026-07.md for why the cap
    must be global (per-IP limits are defeated behind the Render proxy).
    """
    acquired = gate.try_acquire()
    try:
        if not acquired:
            try:
                async for position in wait_turn_events(
                    gate,
                    timeout_seconds=config.STREAM_QUEUE_WAIT_SECONDS,
                ):
                    yield _ndjson_line({
                        "type": "progress",
                        "stage": "queued",
                        "pct": 0.0,
                        "message": (
                            f"{queued_message} 잠시만 기다려 주세요 "
                            f"(대기 {position}번째)."
                        ),
                    })
                acquired = True
            except QueueTimeoutError:
                yield _ndjson_line({
                    "type": "error",
                    "message": (
                        "지금 동시에 실행 중인 분석이 많아 "
                        f"{config.STREAM_QUEUE_WAIT_SECONDS}초 동안 차례가 오지 "
                        "않았습니다. 잠시 후 다시 실행해 주세요."
                    ),
                })
                return
        try:
            async for event in iterate_in_threadpool(events_factory()):
                if event["type"] == "result":
                    yield _ndjson_line({
                        "type": "result",
                        "data": event["data"].model_dump(),
                    })
                else:
                    yield _ndjson_line(event)
        except Exception as error:
            yield _ndjson_line({"type": "error", "message": str(error)})
    finally:
        if acquired:
            gate.release()


@lru_cache(maxsize=1)
def _get_transit_fit_service():
    from services import transit_fit_service

    return transit_fit_service


@router.get(
    "/transit/targets/{target_id}/observations/{observation_id}/preview",
    response_model=TransitCutoutPreviewResponse,
)
def get_cutout_preview(
    request: Request,
    target_id: str,
    observation_id: str,
    size_px: int = Query(default=50, ge=30, le=99),
    frame_index: int | None = Query(default=None, ge=0),
):
    enforce_rate_limit(request, "transit_preview_inline")
    try:
        return transit_service.get_cutout_preview(
            target_id,
            observation_id,
            size_px=size_px,
            frame_index=frame_index,
        )
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to load TESS cutout preview: {error}",
        ) from error


@router.post(
    "/transit/targets/{target_id}/observations/{observation_id}/preview-jobs",
    response_model=TransitPreviewJobResponse,
)
def create_cutout_preview_job(
    request: Request,
    target_id: str,
    observation_id: str,
    size_px: int = Query(default=50, ge=30, le=99),
    frame_index: int | None = Query(default=None, ge=0),
):
    enforce_rate_limit(request, "transit_preview_job")
    try:
        return transit_service.create_preview_job(
            target_id,
            observation_id,
            size_px=size_px,
            frame_index=frame_index,
        )
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except transit_service.PreviewCapacityError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get(
    "/transit/preview-jobs/{job_id}",
    response_model=TransitPreviewJobResponse,
)
def get_cutout_preview_job(job_id: str):
    try:
        return transit_service.get_preview_job(job_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post(
    "/transit/preview-jobs/{job_id}/cancel",
    response_model=TransitPreviewJobResponse,
)
def cancel_cutout_preview_job(job_id: str):
    try:
        return transit_service.cancel_preview_job(job_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post(
    "/transit/photometry",
    response_model=TransitPhotometryResponse,
)
def run_transit_photometry(request: Request, req: TransitPhotometryRequest):
    enforce_rate_limit(request, "transit_photometry")
    try:
        return transit_service.run_transit_photometry(req)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Transit photometry failed: {error}",
        ) from error


@router.post("/transit/photometry-stream")
def run_transit_photometry_stream(request: Request, req: TransitPhotometryRequest):
    enforce_rate_limit(request, "transit_photometry")

    return StreamingResponse(
        _gated_ndjson_stream(
            PHOTOMETRY_STREAM_GATE,
            lambda: transit_service.run_transit_photometry_streaming(req),
            queued_message="다른 측광 분석이 진행 중입니다.",
        ),
        media_type="application/x-ndjson",
    )


@router.post(
    "/transit/fit",
    response_model=TransitFitResponse,
)
def fit_transit(request: Request, req: TransitFitRequest):
    enforce_rate_limit(request, "transit_fit")
    transit_fit_service = _get_transit_fit_service()
    try:
        return transit_fit_service.fit_transit_model(
            points=req.points,
            period=req.period,
            t0=req.t0,
            target_id=req.target_id,
            filter_name=req.filter_name,
            stellar_temperature=req.stellar_temperature,
            stellar_logg=req.stellar_logg,
            stellar_metallicity=req.stellar_metallicity,
            fit_mode=req.fit_mode,
            bjd_start=req.bjd_start,
            bjd_end=req.bjd_end,
            fit_limb_darkening=req.fit_limb_darkening,
            fit_window_phase=req.fit_window_phase,
            baseline_order=req.baseline_order,
            sigma_clip_sigma=req.sigma_clip_sigma,
            sigma_clip_iterations=req.sigma_clip_iterations,
            refine_mcmc=req.refine_mcmc,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Transit model fitting failed: {error}",
        ) from error


@router.post("/transit/fit-stream")
def fit_transit_stream(request: Request, req: TransitFitRequest):
    """Streaming version: yields NDJSON lines with progress, then the result.

    Guarded by a global concurrency gate (default 3): unlimited concurrent
    MCMC fits are what killed the Render free instance in the 2026-07 load
    test (docs/LOAD_TEST_2026-07.md).
    """
    enforce_rate_limit(request, "transit_fit")
    transit_fit_service = _get_transit_fit_service()

    def make_events():
        return transit_fit_service.fit_transit_model_streaming(
            points=req.points,
            period=req.period,
            t0=req.t0,
            target_id=req.target_id,
            filter_name=req.filter_name,
            stellar_temperature=req.stellar_temperature,
            stellar_logg=req.stellar_logg,
            stellar_metallicity=req.stellar_metallicity,
            fit_mode=req.fit_mode,
            bjd_start=req.bjd_start,
            bjd_end=req.bjd_end,
            fit_limb_darkening=req.fit_limb_darkening,
            fit_window_phase=req.fit_window_phase,
            baseline_order=req.baseline_order,
            sigma_clip_sigma=req.sigma_clip_sigma,
            sigma_clip_iterations=req.sigma_clip_iterations,
            refine_mcmc=req.refine_mcmc,
        )

    return StreamingResponse(
        _gated_ndjson_stream(
            FIT_STREAM_GATE,
            make_events,
            queued_message="다른 분석이 진행 중입니다.",
        ),
        media_type="application/x-ndjson",
    )
