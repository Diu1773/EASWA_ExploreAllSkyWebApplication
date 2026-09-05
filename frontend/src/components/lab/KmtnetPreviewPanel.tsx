import type { MicrolensingPreviewResponse } from '../../types/microlensing';
import { useLangStore } from '../../i18n';

interface KmtnetPreviewPanelProps {
  preview: MicrolensingPreviewResponse;
  frameChangeDisabled?: boolean;
  frameLoading?: boolean;
  onFrameChange?: (frameIndex: number) => void;
}

interface PreviewCardProps {
  title: string;
  caption: string;
  imageUrl: string;
  preview: Pick<MicrolensingPreviewResponse, 'cutout_width_px' | 'cutout_height_px'>;
  markerPosition: MicrolensingPreviewResponse['target_position'];
  accentClass?: string;
}

function PreviewCard({
  title,
  caption,
  imageUrl,
  preview,
  markerPosition,
  accentClass = '',
}: PreviewCardProps) {
  const lang = useLangStore((state) => state.lang);
  const left = `${(markerPosition.x / preview.cutout_width_px) * 100}%`;
  const top = `${(markerPosition.y / preview.cutout_height_px) * 100}%`;

  return (
    <article className={`ml-preview-card ${accentClass}`.trim()}>
      <div className="ml-preview-card-head">
        <strong>{title}</strong>
        <span>{caption}</span>
      </div>
      <div className="ml-preview-stage">
        <img src={imageUrl} alt={title} className="ml-preview-image" />
        <div className="ml-preview-marker" style={{ left, top }} aria-hidden="true" />
        {/* 이 프레임은 KMTNet 원본 영상이 아니라 차분영상의 원리를 보이기 위해 생성한
            그림이다(backend/adapters/kmtnet_archive.py). 구경 시뮬레이션·3D 화면에는
            같은 표기가 이미 붙어 있었는데 여기만 빠져 있었고, 옆에 HJD·등급·노출시간이
            함께 떠서 실제 관측처럼 읽혔다. 원고 4.4 도 이 표기가 있다고 적고 있다. */}
        <span className="ml-preview-sim-tag">
          {lang === 'ko' ? '개념 시연 · 실제 관측 영상 아님' : 'Concept demo · not an observation'}
        </span>
      </div>
    </article>
  );
}

export function KmtnetPreviewPanel({
  preview,
  frameChangeDisabled = false,
  frameLoading = false,
  onFrameChange,
}: KmtnetPreviewPanelProps) {
  const lang = useLangStore((state) => state.lang);
  const currentFrameIndex = preview.frame_index;
  const frameMetadata = preview.frame_metadata;

  return (
    <section className="ml-preview-panel">
      <div className="ml-preview-head">
        <div>
          <span className="ml-preview-kicker">{lang === 'ko' ? '차분영상' : 'Difference Imaging'}</span>
          <h4>{lang === 'ko' ? '동일한 하늘 좌표 stamp의 정렬 / 차분' : 'Registration and subtraction of the same sky stamp'}</h4>
        </div>
        <div className="ml-preview-stats">
          <span>HJD {frameMetadata.hjd.toFixed(4)}</span>
          <span>I = {frameMetadata.magnitude.toFixed(3)} ± {frameMetadata.mag_error.toFixed(3)}</span>
          <span>{frameMetadata.filter_band ?? 'I'}-band · {frameMetadata.exposure_sec?.toFixed(0) ?? '120'} s</span>
          <span>A ≈ {frameMetadata.magnification.toFixed(2)}x</span>
        </div>
      </div>

      <div className="ml-preview-toolbar">
        <div className="ml-preview-toolbar-group">
          <button
            type="button"
            className="btn-sm"
            disabled={frameChangeDisabled || currentFrameIndex <= 0}
            onClick={() => onFrameChange?.(0)}
          >
            {lang === 'ko' ? '처음' : 'First'}
          </button>
          <button
            type="button"
            className="btn-sm"
            disabled={frameChangeDisabled || currentFrameIndex <= 0}
            onClick={() => onFrameChange?.(Math.max(0, currentFrameIndex - 1))}
          >
            {lang === 'ko' ? '이전' : 'Prev'}
          </button>
          <button
            type="button"
            className="btn-sm"
            disabled={frameChangeDisabled || currentFrameIndex >= preview.frame_count - 1}
            onClick={() => onFrameChange?.(Math.min(preview.frame_count - 1, currentFrameIndex + 1))}
          >
            {lang === 'ko' ? '다음' : 'Next'}
          </button>
          <button
            type="button"
            className="btn-sm"
            disabled={frameChangeDisabled || currentFrameIndex >= preview.frame_count - 1}
            onClick={() => onFrameChange?.(preview.frame_count - 1)}
          >
            {lang === 'ko' ? '마지막' : 'Last'}
          </button>
        </div>
        <div className="ml-preview-toolbar-group ml-preview-toolbar-group--grow">
          <span className="selected-count">
            {lang === 'ko' ? '프레임' : 'Frame'} {currentFrameIndex + 1} / {preview.frame_count}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(preview.frame_count - 1, 0)}
            step={1}
            value={currentFrameIndex}
            disabled={frameChangeDisabled}
            onChange={(event) => onFrameChange?.(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="ml-preview-grid">
        <PreviewCard
          title={lang === 'ko' ? '현재 관측 시점 (정렬됨)' : 'Current Epoch (Aligned)'}
          caption={lang === 'ko'
            ? `동일한 하늘 stamp를 기준 프레임에 맞춰 정렬 · Δx ${preview.registration_dx_px >= 0 ? '+' : ''}${preview.registration_dx_px.toFixed(2)} px · Δy ${preview.registration_dy_px >= 0 ? '+' : ''}${preview.registration_dy_px.toFixed(2)} px`
            : `Same sky stamp aligned to the reference · Δx ${preview.registration_dx_px >= 0 ? '+' : ''}${preview.registration_dx_px.toFixed(2)} px · Δy ${preview.registration_dy_px >= 0 ? '+' : ''}${preview.registration_dy_px.toFixed(2)} px`}
          imageUrl={preview.aligned_image_data_url}
          preview={preview}
          markerPosition={preview.aligned_target_position}
        />
        <PreviewCard
          title={lang === 'ko' ? '기준 프레임' : 'Reference'}
          caption={lang === 'ko'
            ? `비교 기준 관측 시점 · 프레임 #${preview.reference_frame_index + 1}`
            : `Reference epoch · frame #${preview.reference_frame_index + 1}`}
          imageUrl={preview.reference_image_data_url}
          preview={preview}
          markerPosition={preview.reference_target_position}
        />
        <PreviewCard
          title={lang === 'ko' ? '차분영상' : 'Difference'}
          caption={lang === 'ko' ? '정렬된 현재 프레임 - 기준 프레임' : 'Aligned current frame - reference'}
          imageUrl={preview.difference_image_data_url}
          preview={preview}
          markerPosition={preview.aligned_target_position}
          accentClass="ml-preview-card--difference"
        />
      </div>

      <div className="ml-preview-note">
        <span>
          {lang === 'ko' ? (
            <>
              세 패널은 모두 <strong>동일한 하늘 좌표 영역</strong>을 자른 stamp입니다.
              현재 관측은 <strong>{preview.site_label}</strong>의 <code>{frameMetadata.observation_id}</code>,
              기준 관측은 HJD {preview.reference_hjd.toFixed(4)}의 <code>{preview.reference_observation_id}</code>입니다.
              현재 메타데이터는 <strong>{frameMetadata.filter_band ?? 'I'}-band</strong>, <strong>{frameMetadata.exposure_sec?.toFixed(0) ?? '120'} s</strong>입니다.
            </>
          ) : (
            <>
              All three panels are stamps cut from <strong>the same sky coordinates</strong>.
              The current observation is <code>{frameMetadata.observation_id}</code> from <strong>{preview.site_label}</strong>;
              the reference is <code>{preview.reference_observation_id}</code> at HJD {preview.reference_hjd.toFixed(4)}.
              The current metadata are <strong>{frameMetadata.filter_band ?? 'I'}-band</strong> and <strong>{frameMetadata.exposure_sec?.toFixed(0) ?? '120'} s</strong>.
            </>
          )}
        </span>
        <span>
          {lang === 'ko' ? (
            <>
              순서는 <strong>현재 관측 시점 정렬 → 기준 프레임 → 현재 - 기준 차분</strong>입니다.
              변하지 않은 별의 대부분은 사라지고, 기준보다 밝아지거나 어두워진 위치만 잔차로 남습니다.
            </>
          ) : (
            <>
              The sequence is <strong>aligned current epoch → reference → current minus reference</strong>.
              Most constant stars disappear, leaving residuals only where the source became brighter or fainter.
            </>
          )}
          {preview.registration_warning ? ` ${preview.registration_warning}` : ''}
          {frameLoading ? (lang === 'ko' ? ' 새 프레임을 불러오는 중입니다...' : ' Loading a new frame...') : ''}
        </span>
      </div>
    </section>
  );
}
