from __future__ import annotations

from pydantic import BaseModel


class ClusterMember(BaseModel):
    source_id: str
    g_mag: float
    bp_rp: float
    parallax: float | None = None
    pmra: float | None = None
    pmdec: float | None = None
    parallax_error: float | None = None
    g_flux_snr: float | None = None


class ClusterInfo(BaseModel):
    id: str
    name: str
    name_ko: str
    ra: float
    dec: float
    search_radius_deg: float
    ref_distance_pc: float
    ref_distance_modulus: float
    ref_age_gyr: float
    ref_logage: float
    ref_av: float
    reference: str
    note_ko: str
    note_en: str
    plx_min: float
    plx_max: float
    pmra_c: float
    pmdec_c: float
    pm_tol: float | None = None


class ClusterListResponse(BaseModel):
    clusters: list[ClusterInfo]


class ClusterCMDResponse(BaseModel):
    cluster: ClusterInfo
    member_count: int
    color_label: str
    mag_label: str
    members: list[ClusterMember]
    data_source: str
    selection_note_ko: str
    selection_note_en: str
