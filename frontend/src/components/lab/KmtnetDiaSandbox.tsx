import { useEffect, useState } from 'react';
import { fetchMicrolensingPreviewBundle } from '../../api/client';
import type {
  MicrolensingPreviewBundleResponse,
  MicrolensingPreviewResponse,
} from '../../types/microlensing';
import { useLangStore } from '../../i18n';

/**
 * Step 3 (분석 준비) for the KMTNet module.
 *
 * The module's own Step 3 self-check asks whether a light curve in a crowded
 * field is built by subtracting a reference image — and until now the step
 * showed only text, so the learner had nothing on screen to answer it from.
 * The four panels here are the actual pipeline this platform runs
 * (kmtnet_actual_service): the frame as observed, the same frame shifted onto
 * a reference, the reference, and what is left after subtraction.
 *
 * All four are shown at once rather than behind a stepper. Clicking through
 * them in order was the first design and it hid the comparison the step is
 * about — the learner had to remember the previous panel to see what changed.
 * The one control left is which night to look at.
 *
 * Under each panel is the target's pixel position. In the frame as observed it
 * sits somewhere else; after alignment it matches the reference exactly, which
 * is what alignment means and is otherwise invisible.
 *
 * Every image is a real KMTNet cutout from the KASI archive. The frames are
 * rendered ahead of time by backend/scripts/bundle_kmtnet_preview_frames.py
 * because doing it live costs 30-40 s for the first frame — the same
 * computation on the same frames, moved off the classroom clock.
 */

type Stage = 'raw' | 'aligned' | 'reference' | 'difference';

const STAGES: Stage[] = ['raw', 'aligned', 'reference', 'difference'];

const STAGE_LABEL: Record<Stage, { ko: string; en: string }> = {
  raw: { ko: '관측 영상', en: 'Observed' },
  aligned: { ko: '정렬 후', en: 'Aligned' },
  reference: { ko: '기준 영상', en: 'Reference' },
  difference: { ko: '차감 결과', en: 'Difference' },
};

function imageFor(preview: MicrolensingPreviewResponse, stage: Stage): string {
  switch (stage) {
    case 'raw':
      return preview.raw_image_data_url;
    case 'aligned':
      return preview.aligned_image_data_url;
    case 'reference':
      return preview.reference_image_data_url;
    default:
      return preview.difference_image_data_url;
  }
}

/**
 * Where the target sits in each panel, in cutout pixels.
 *
 * The reference frame defines the grid, so in the aligned, reference and
 * difference panels the target is at the reference position. In the frame as
 * observed it is that position minus the registration shift: the shift is what
 * has to be added to the observed frame to bring its stars onto the reference,
 * so a feature at p in the observed frame lands at p + shift after alignment.
 *
 * Not `raw_target_position` — that is the frame's own WCS estimate, which puts
 * the target at the middle of its own cutout by construction and so shows no
 * movement at all.
 */
function markerFor(preview: MicrolensingPreviewResponse, stage: Stage) {
  const reference = preview.reference_target_position;
  if (stage !== 'raw') return reference;
  return {
    x: reference.x - preview.registration_dx_px,
    y: reference.y - preview.registration_dy_px,
  };
}

/** HJD to a calendar date, so the frame chips read as observing nights. */
function hjdToDate(hjd: number): Date {
  return new Date((hjd - 2440587.5) * 86400000);
}

function frameDateLabel(hjd: number, ko: boolean): string {
  const d = hjdToDate(hjd);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return ko ? `${month}월 ${day}일` : `${month}/${day}`;
}

export function KmtnetDiaSandbox({
  targetId,
  sites,
  alternatives = [],
  onEpochs,
}: {
  targetId: string;
  /** Sites with archive frames from this event's own season; empty means none. */
  sites: string[];
  /** Events that do have frames, for the learner to switch to. */
  alternatives?: { id: string; name: string }[];
  /** Reports the three frames' HJDs so Step 4 can mark them on the light curve. */
  onEpochs?: (hjds: number[]) => void;
}) {
  const lang = useLangStore((s) => s.lang);
  const ko = lang === 'ko';
  const site = sites[0] ?? '';

  const [bundle, setBundle] = useState<MicrolensingPreviewBundleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameSlot, setFrameSlot] = useState(0);

  useEffect(() => {
    if (!targetId || !site) {
      setBundle(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setBundle(null);
    setFrameSlot(0);
    fetchMicrolensingPreviewBundle(targetId, site, null, 96)
      .then((data) => {
        if (!active) return;
        setBundle(data);
        onEpochs?.(data.previews.map((item) => item.frame_metadata.hjd));
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'preview failed');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // onEpochs is a setter from the parent; including it would refetch on every
    // parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, site]);

  const previews = bundle?.previews ?? [];
  const preview = previews[Math.min(frameSlot, Math.max(previews.length - 1, 0))] ?? null;

  if (!targetId) return null;

  // No cutouts from this event's own nights. Saying so is the honest version of
  // this step: the light curve on the next step is published KMTNet difference
  // photometry either way, and pretending otherwise with frames from a
  // different year would misrepresent where the numbers came from.
  if (!site) {
    return (
      <section className="inquiry-info-panel kmt-dia">
        <span className="inquiry-panel-kicker">{ko ? '밝기를 어떻게 재는가' : 'How the brightness is measured'}</span>
        <p className="kmt-dia-lead">
          {ko
            ? '은하수 쪽은 별이 겹쳐 있어 한 별만 따로 잴 수 없습니다. 그래서 다른 날 영상을 빼고 남는 것만 봅니다 — 이것이 차분측광입니다.'
            : 'Towards the Milky Way the stars overlap, so one star cannot be measured on its own. A frame from another night is subtracted and only the remainder is measured — that is difference photometry.'}
        </p>
        <p className="kmt-dia-note">
          {ko
            ? '이 이벤트는 공개 자료실에 그날 밤의 관측 영상이 없어 여기서 직접 확인할 수 없습니다. 다음 단계의 광도곡선은 KMTNet이 이 방법으로 이미 측정해 공개한 값입니다.'
            : 'For this event the public archive holds no frames from those nights, so the images cannot be inspected here. The light curve on the next step is what KMTNet measured this way and published.'}
        </p>
        {alternatives.length > 0 && (
          <p className="kmt-dia-note">
            {ko ? '영상까지 볼 수 있는 이벤트: ' : 'Events whose frames can be inspected: '}
            {alternatives.map((item) => item.name).join(', ')}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="inquiry-info-panel kmt-dia">
      <span className="inquiry-panel-kicker">{ko ? '밝기를 어떻게 재는가' : 'How the brightness is measured'}</span>
      <p className="kmt-dia-lead">
        {ko
          ? '은하수 쪽은 별이 겹쳐 있어 한 별만 따로 잴 수 없습니다. 그래서 다른 날 영상을 빼고 남는 것만 봅니다.'
          : 'Towards the Milky Way the stars overlap, so one star cannot be measured on its own. Instead a frame from another night is subtracted and only the remainder is measured.'}
      </p>

      {loading && <p className="hint">{ko ? '실제 KMTNet 관측 영상을 불러오는 중…' : 'Loading real KMTNet frames…'}</p>}
      {error && <p className="error-message">{error}</p>}

      {preview && (
        <>
          <div className="kmt-dia-frames" role="group" aria-label={ko ? '관측 프레임' : 'Observed frame'}>
            <span className="kmt-dia-control-label">{ko ? '관측한 날' : 'Night'}</span>
            {previews.map((item, index) => (
              <button
                key={item.frame_metadata.observation_id}
                type="button"
                className={`kmt-dia-chip${index === frameSlot ? ' is-on' : ''}`}
                onClick={() => setFrameSlot(index)}
              >
                {frameDateLabel(item.frame_metadata.hjd, ko)}
                <span className="kmt-dia-chip-mag">{item.frame_metadata.magnitude.toFixed(2)}</span>
              </button>
            ))}
          </div>

          <div className="kmt-dia-strip">
            {STAGES.map((stage, index) => {
              const marker = markerFor(preview, stage);
              return (
                <figure key={stage} className="kmt-dia-panel">
                  <figcaption>
                    <span className="kmt-dia-panel-num">{index + 1}</span>
                    {STAGE_LABEL[stage][ko ? 'ko' : 'en']}
                  </figcaption>
                  <div className="kmt-dia-frame">
                    <img
                      src={imageFor(preview, stage)}
                      alt={`${STAGE_LABEL[stage][ko ? 'ko' : 'en']} — ${preview.frame_metadata.observation_id}`}
                    />
                    <span
                      className="kmt-dia-marker"
                      style={{
                        left: `${(marker.x / preview.cutout_width_px) * 100}%`,
                        top: `${(marker.y / preview.cutout_height_px) * 100}%`,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className={`kmt-dia-coord${stage === 'raw' ? '' : ' is-matched'}`}>
                    x {marker.x.toFixed(1)} · y {marker.y.toFixed(1)}
                  </span>
                </figure>
              );
            })}
          </div>

          <dl className="kmt-dia-facts">
            <div>
              <dt>{ko ? '관측 파일' : 'Observation'}</dt>
              <dd><code>{preview.frame_metadata.observation_id}</code></dd>
            </div>
            <div>
              <dt>{ko ? '관측소' : 'Site'}</dt>
              <dd>{preview.site_label}</dd>
            </div>
            <div>
              <dt>{ko ? '기준 영상' : 'Reference'}</dt>
              <dd>{frameDateLabel(preview.reference_hjd, ko)}</dd>
            </div>
            <div>
              <dt>{ko ? '측정된 밝기' : 'Measured brightness'}</dt>
              <dd>
                {preview.frame_metadata.magnitude.toFixed(3)} ± {preview.frame_metadata.mag_error.toFixed(3)}
                {ko ? ' 등급' : ' mag'}
              </dd>
            </div>
            <div>
              <dt>{ko ? '노출·필터' : 'Exposure · filter'}</dt>
              <dd>
                {preview.frame_metadata.exposure_sec?.toFixed(0) ?? '—'} s · {preview.frame_metadata.filter_band ?? 'I'}
              </dd>
            </div>
            <div>
              <dt>{ko ? '정렬 이동량' : 'Registration shift'}</dt>
              <dd>
                x {preview.registration_dx_px >= 0 ? '+' : ''}{preview.registration_dx_px.toFixed(1)},{' '}
                y {preview.registration_dy_px >= 0 ? '+' : ''}{preview.registration_dy_px.toFixed(1)} px
              </dd>
            </div>
            {preview.psf_match_sigma_px !== undefined && (
              <div>
                <dt>{ko ? '번짐 맞춤' : 'Blur match'}</dt>
                <dd>
                  {Math.abs(preview.psf_match_sigma_px).toFixed(2)} px
                  {preview.psf_match_sigma_px < 0
                    ? ko ? ' (관측 영상에)' : ' (to the frame)'
                    : ko ? ' (기준 영상에)' : ' (to the reference)'}
                </dd>
              </div>
            )}
            {preview.flux_scale !== undefined && (
              <div>
                <dt>{ko ? '밝기 비율' : 'Brightness ratio'}</dt>
                <dd>×{preview.flux_scale.toFixed(3)}</dd>
              </div>
            )}
          </dl>

          <p className="kmt-dia-note">
            {ko
              ? `한국천문연구원 KMTNet 공개 관측 영상 · ${preview.cutout_width_px}×${preview.cutout_height_px} 화소로 잘라 냄 · 정렬과 차감은 이 앱이 수행 · 공개된 영상이 며칠치뿐이라 세 영상 사이의 밝기 차이는 크지 않습니다`
              : `KASI KMTNet public frames · cut to ${preview.cutout_width_px}×${preview.cutout_height_px} px · aligned and subtracted by this app · only a few nights are public, so the brightness barely differs between these frames`}
            {preview.registration_warning ? ` · ${preview.registration_warning}` : ''}
          </p>
        </>
      )}
    </section>
  );
}
