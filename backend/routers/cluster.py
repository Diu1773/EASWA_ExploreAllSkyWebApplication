from fastapi import APIRouter, HTTPException

from schemas.cluster import ClusterCMDResponse, ClusterListResponse
from services import cluster_service

router = APIRouter(tags=["cluster"])


@router.get("/clusters", response_model=ClusterListResponse)
def list_clusters():
    return cluster_service.list_clusters()


@router.get("/clusters/{cluster_id}/cmd", response_model=ClusterCMDResponse)
def get_cluster_cmd(cluster_id: str):
    try:
        return cluster_service.get_cluster_cmd(cluster_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - upstream/network failure
        raise HTTPException(status_code=502, detail=f"Gaia query failed: {error}") from error
