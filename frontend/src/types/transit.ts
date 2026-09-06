import type { LightCurveResponse } from './photometry';

export interface PixelCoordinate {
  x: number;
  y: number;
}

export interface ApertureParams {
  apertureRadius: number;
  innerAnnulus: number;
  outerAnnulus: number;
}

export interface TransitApertureConfig {
  position: PixelCoordinate;
  aperture_radius: number;
  inner_annulus: number;
  outer_annulus: number;
}

export interface StarOverlay {
  label: string;
  position: PixelCoordinate;
  aperture: ApertureParams;
  type: 'target' | 'comparison';
  selected: boolean;
}

export interface TICStarInfo {
  tic_id: string;
  pixel: PixelCoordinate;
  tmag: number | null;
  distance_arcmin: number | null;
  is_variable: boolean;
  recommended: boolean;
}

export interface TransitCutoutPreview {
  target_id: string;
  observation_id: string;
  sector: number;
  camera: number | null;
  ccd: number | null;
  preview_mode: 'median' | 'frame';
  frame_index: number | null;
  sample_frame_indices: number[];
  cutout_size_px: number;
  cutout_width_px: number;
  cutout_height_px: number;
  preview_width_px: number;
  preview_height_px: number;
  frame_count: number;
  time_start: number;
  time_end: number;
  frame_metadata?: TransitFrameMetadata | null;
  target_position: PixelCoordinate;
  image_data_url: string;
  dataset_token?: string | null;
  tic_stars?: TICStarInfo[];
}

export interface TransitFrameMetadata {
  frame_index: number | null;
  btjd: number | null;
  cadence_number: number | null;
  quality_flag: number | null;
  finite_fraction: number | null;
  finite_pixels: number | null;
  total_pixels: number | null;
  flux_min: number | null;
  flux_median: number | null;
  flux_max: number | null;
}

export interface TransitPhotometryRequest {
  target_id: string;
  observation_id: string;
  cutout_size_px: number;
  preview_dataset_token?: string | null;
  target_context?: {
    ra: number;
    dec: number;
    period_days: number | null;
  };
  observation_context?: {
    sector: number;
    camera: number | null;
    ccd: number | null;
  };
  target_position: PixelCoordinate;
  comparison_positions: PixelCoordinate[];
  aperture_radius: number;
  inner_annulus: number;
  outer_annulus: number;
  target_aperture?: TransitApertureConfig;
  comparison_apertures?: TransitApertureConfig[];
}

export interface TransitComparisonDiagnostic {
  label: string;
  position: PixelCoordinate;
  aperture_radius: number;
  inner_annulus: number;
  outer_annulus: number;
  valid_frame_count: number;
  median_flux: number;
  differential_rms: number;
  differential_mad: number;
  /** 관측 구간 전체에서 밝기가 한쪽으로 변한 양(%). RMS 는 산포만 재므로,
   *  기울어진 곡선을 평평하다고 부르지 않으려면 이 값을 함께 봐야 한다. */
  differential_trend_pct?: number | null;
  ensemble_weight: number;
  /** True: diagnostic curve is this star ÷ the other comparisons (target-free
   *  QC). False: no independent peer, fell back to target ÷ this star — the UI
   *  then notes it can't be cross-checked. Optional for older payloads. */
  checked_against_peers?: boolean;
  light_curve: LightCurveResponse;
}

export interface TransitPhotometryResponse {
  target_id: string;
  observation_id: string;
  sector: number;
  frame_count: number;
  comparison_count: number;
  target_position: PixelCoordinate;
  comparison_positions: PixelCoordinate[];
  target_median_flux: number;
  comparison_median_flux: number;
  comparison_diagnostics: TransitComparisonDiagnostic[];
  light_curve: LightCurveResponse;
}

export interface TransitPreviewJob {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  result: TransitCutoutPreview | null;
  error: string | null;
}
