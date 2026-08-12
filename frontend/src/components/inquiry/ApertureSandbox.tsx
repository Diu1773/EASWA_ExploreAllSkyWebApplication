import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useLangStore } from '../../i18n';

/**
 * Concept sandbox for aperture photometry (Step 3 · 분석 준비).
 * A bundled synthetic star field — clearly labeled as a simulation — where the
 * learner drags the measurement position and adjusts aperture + sky annulus,
 * watching enclosed flux, neighbor contamination, background estimate, mag and
 * SNR respond live. A radial-profile plot (right of the image) shows the
 * Gaussian PSF, the FWHM, and exactly which radii feed the star measurement vs
 * the background estimate. Real (differential) photometry runs in Step 4.
 */

const N = 110; // fine-pixel grid size
const SCALE = 4; // display scale
const BG = 20; // true sky background per pixel
const READ_NOISE = 3;
const PROF_MAX = 36; // radial profile extent (px)
const PSF_SIGMA = 3.2;
const FWHM = 2.355 * PSF_SIGMA; // ≈ 7.5 px

interface Star {
  x: number;
  y: number;
  flux: number;
  sigma: number;
  isTarget?: boolean;
}

// Loosely modeled on the WASP-6 field: bright target center, one close
// neighbor (blending story), a few field stars.
const STARS: Star[] = [
  { x: 55, y: 55, flux: 60000, sigma: PSF_SIGMA, isTarget: true },
  { x: 67, y: 47, flux: 16000, sigma: PSF_SIGMA },
  { x: 22, y: 26, flux: 9000, sigma: 3.0 },
  { x: 88, y: 82, flux: 12000, sigma: 3.1 },
  { x: 31, y: 86, flux: 6000, sigma: 3.0 },
  { x: 91, y: 19, flux: 5000, sigma: 3.0 },
];

/** Deterministic pseudo-noise so the bundled scene is stable across renders. */
function seededNoise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2; // [-1, 1]
}

function buildScene() {
  const total = new Float32Array(N * N);
  const targetOnly = new Float32Array(N * N);
  const othersOnly = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      let value = BG + seededNoise(i) * READ_NOISE;
      for (const star of STARS) {
        const dx = x - star.x;
        const dy = y - star.y;
        const s2 = 2 * star.sigma * star.sigma;
        const contribution =
          (star.flux / (Math.PI * s2)) * Math.exp(-(dx * dx + dy * dy) / s2);
        value += contribution;
        if (star.isTarget) targetOnly[i] += contribution;
        else othersOnly[i] += contribution;
      }
      total[i] = value;
    }
  }
  return { total, targetOnly, othersOnly };
}

const TARGET_TOTAL_FLUX = STARS.find((s) => s.isTarget)!.flux;

interface ApertureConfig {
  r: number;
  rIn: number;
  rOut: number;
}

function clampConfig(next: ApertureConfig): ApertureConfig {
  const r = Math.min(Math.max(next.r, 3), 20);
  const rIn = Math.min(Math.max(next.rIn, r + 2), 30);
  const rOut = Math.min(Math.max(next.rOut, rIn + 3), 34);
  return { r, rIn, rOut };
}

export function ApertureSandbox() {
  const lang = useLangStore((state) => state.lang);
  const ko = lang === 'ko';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [ap, setAp] = useState<ApertureConfig>({ r: 12, rIn: 22, rOut: 30 });
  const [pos, setPos] = useState({ x: 55, y: 55 });

  const scene = useMemo(buildScene, []);

  // Paint the bundled star field once — dark sky, bright stars, so it is
  // obvious which regions must NOT be used as background.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(N, N);
    let max = 0;
    for (let i = 0; i < N * N; i++) max = Math.max(max, scene.total[i]);
    const floor = BG * 0.6; // push the sky toward black
    for (let i = 0; i < N * N; i++) {
      const norm = Math.max(scene.total[i] - floor, 0) / (max - floor);
      const v = Math.pow(Math.min(norm, 1), 0.5) * 255;
      image.data[i * 4] = v;
      image.data[i * 4 + 1] = v * 0.96;
      image.data[i * 4 + 2] = v * 0.88;
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [scene]);

  const stats = useMemo(() => {
    const { r, rIn, rOut } = ap;
    const r2 = r * r;
    const rIn2 = rIn * rIn;
    const rOut2 = rOut * rOut;
    let sum = 0;
    let targetSum = 0;
    let othersSum = 0;
    let npix = 0;
    let annSum = 0;
    let annOthers = 0;
    let annPix = 0;
    const bound = Math.ceil(rOut) + 1;
    const x0 = Math.max(0, Math.floor(pos.x - bound));
    const x1 = Math.min(N - 1, Math.ceil(pos.x + bound));
    const y0 = Math.max(0, Math.floor(pos.y - bound));
    const y1 = Math.min(N - 1, Math.ceil(pos.y + bound));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        const d2 = dx * dx + dy * dy;
        const i = y * N + x;
        if (d2 <= r2) {
          sum += scene.total[i];
          targetSum += scene.targetOnly[i];
          othersSum += scene.othersOnly[i];
          npix++;
        } else if (d2 >= rIn2 && d2 <= rOut2) {
          annSum += scene.total[i];
          annOthers += scene.othersOnly[i];
          annPix++;
        }
      }
    }
    const bgEst = annPix > 0 ? annSum / annPix : BG;
    const net = Math.max(sum - bgEst * npix, 1);
    const enclosed = (targetSum / TARGET_TOTAL_FLUX) * 100;
    const contamination = (othersSum / Math.max(targetSum + othersSum, 1)) * 100;
    const annNeighborPerPix = annPix > 0 ? annOthers / annPix : 0;
    const mag = 25 - 2.5 * Math.log10(net);
    const snr = net / Math.sqrt(sum + npix * READ_NOISE * READ_NOISE);

    // Radial profile (mean pixel value per 1px radius bin around the aperture center)
    const profile = new Array<number>(PROF_MAX + 1).fill(0);
    const counts = new Array<number>(PROF_MAX + 1).fill(0);
    const px0 = Math.max(0, Math.floor(pos.x - PROF_MAX));
    const px1 = Math.min(N - 1, Math.ceil(pos.x + PROF_MAX));
    const py0 = Math.max(0, Math.floor(pos.y - PROF_MAX));
    const py1 = Math.min(N - 1, Math.ceil(pos.y + PROF_MAX));
    for (let y = py0; y <= py1; y++) {
      for (let x = px0; x <= px1; x++) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        const bin = Math.round(Math.sqrt(dx * dx + dy * dy));
        if (bin <= PROF_MAX) {
          profile[bin] += scene.total[y * N + x];
          counts[bin]++;
        }
      }
    }
    for (let b = 0; b <= PROF_MAX; b++) if (counts[b] > 0) profile[b] /= counts[b];

    return { net, enclosed, contamination, bgEst, annNeighborPerPix, mag, snr, profile };
  }, [scene, pos, ap]);

  const hint = useMemo(() => {
    if (stats.enclosed < 82) {
      return ko
        ? '구경이 작거나 빗나가면 목표별 빛을 놓쳐서 등급이 어두워집니다(값이 커집니다). 구경 반지름은 보통 FWHM의 1.5~2배로 잡습니다.'
        : 'The aperture is missing target light (too small or off-center) → the magnitude gets fainter. Rule of thumb: set r to 1.5–2 × FWHM.';
    }
    if (stats.bgEst - BG > 1.5 || stats.annNeighborPerPix > 1.5) {
      return ko
        ? '별이 배경 고리(annulus)에 들어가면 배경이 부풀려져서, 별빛을 너무 많이 빼 어두워집니다. 고리를 별이 없는 곳으로 옮깁니다. 실제 파이프라인은 중앙값·시그마클리핑으로 이런 오염을 줄입니다.'
        : 'A star sits inside the sky annulus, inflating the background estimate → too much gets subtracted. Move the ring to clean sky. Real pipelines use clipped medians to resist this.';
    }
    if (stats.contamination > 5) {
      return ko
        ? '이웃별 빛이 구경 안으로 섞여 들어옵니다(blending). 그러면 밝기가 실제보다 크게 측정되고, 식 깊이는 얕아집니다.'
        : 'Neighboring starlight is blending into the aperture → flux is overestimated and transit depth gets diluted.';
    }
    if (ap.r > 16) {
      return ko
        ? '구경이 FWHM의 2배를 훌쩍 넘으면 별빛은 거의 안 늘고 배경 잡음만 늘어 SNR이 떨어집니다.'
        : 'Far beyond 2 × FWHM the aperture adds mostly background noise, lowering the SNR.';
    }
    return ko
      ? `적절한 설정입니다 (r ≈ ${(ap.r / FWHM).toFixed(1)}×FWHM) — 구경은 목표별 빛을 담고, 배경 고리는 별이 없는 깨끗한 하늘을 잽니다.`
      : `Good setup (r ≈ ${(ap.r / FWHM).toFixed(1)} × FWHM) — the aperture holds the target and the annulus samples clean sky.`;
  }, [stats, ap.r, ko]);

  const moveTo = (event: PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * N;
    const y = ((event.clientY - rect.top) / rect.height) * N;
    setPos({
      x: Math.min(N - 4, Math.max(4, x)),
      y: Math.min(N - 4, Math.max(4, y)),
    });
  };

  // ---- radial profile plot geometry (sits to the right of the image) ----
  const plot = useMemo(() => {
    const W = 460;
    const H = 400;
    const L = 48;
    const R = 12;
    const T = 16;
    const B = 34;
    const innerW = W - L - R;
    const innerH = H - T - B;
    const yMax = Math.max(...stats.profile, BG * 3) * 1.08;
    const xOf = (radius: number) => L + (radius / PROF_MAX) * innerW;
    const yOf = (value: number) => T + innerH - (Math.min(value, yMax) / yMax) * innerH;
    const points = stats.profile
      .map((value, radius) => `${xOf(radius).toFixed(1)},${yOf(value).toFixed(1)}`)
      .join(' ');
    return { W, H, L, R, T, B, innerW, innerH, yMax, xOf, yOf, points };
  }, [stats.profile]);

  const sliderRow = (
    label: string,
    valueLabel: string,
    value: number,
    min: number,
    max: number,
    onChange: (v: number) => void,
    accentClass?: string,
  ) => (
    <label className={`inquiry-aperture-slider ${accentClass ?? ''}`}>
      <span>
        {label} <strong>{valueLabel}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );

  return (
    <section className="inquiry-info-panel inquiry-aperture-sandbox">
      <span className="inquiry-panel-kicker">
        {ko ? '직접 해보기 — 구경 측광' : 'Try It — Aperture Photometry'}
      </span>
      <h3>
        {ko
          ? '구경과 배경 고리가 측정을 어떻게 바꾸는지 만져보세요'
          : 'Drag the aperture and tune the sky annulus to see how the measurement responds'}
      </h3>
      <div className="inquiry-aperture-body">
        <div className="inquiry-aperture-figure">
          <div
            ref={stageRef}
            className="inquiry-aperture-stage"
            style={{ width: N * SCALE, height: N * SCALE }}
            onPointerDown={(event) => {
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              moveTo(event);
            }}
            onPointerMove={(event) => {
              if (draggingRef.current) moveTo(event);
            }}
            onPointerUp={() => {
              draggingRef.current = false;
            }}
          >
            <canvas ref={canvasRef} width={N} height={N} />
            <svg
              className="inquiry-aperture-overlay"
              viewBox={`0 0 ${N} ${N}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <circle
                className="ring-annulus-fill"
                cx={pos.x}
                cy={pos.y}
                r={(ap.rIn + ap.rOut) / 2}
                strokeWidth={ap.rOut - ap.rIn}
              />
              <circle className="ring-annulus-edge" cx={pos.x} cy={pos.y} r={ap.rIn} />
              <circle className="ring-annulus-edge" cx={pos.x} cy={pos.y} r={ap.rOut} />
              <circle className="ring-aperture" cx={pos.x} cy={pos.y} r={ap.r} />
            </svg>
            <span className="inquiry-aperture-sim-tag">
              {ko ? '개념 시뮬레이션 · 실제 관측 아님' : 'Concept simulation · not real data'}
            </span>
          </div>
          <p className="inquiry-aperture-legend">
            <span className="key key-aperture" />
            {ko ? '구경 — 별빛을 재는 영역' : 'Aperture — star flux measured here'}
            <span className="key key-annulus" />
            {ko ? '배경 고리(annulus) — 하늘 밝기를 재서 빼는 영역' : 'Sky annulus — background sampled here'}
          </p>
        </div>

        <div className="inquiry-aperture-profile">
          <span className="inquiry-aperture-profile-title">
            {ko
              ? `방사 프로파일 — 별의 가우시안 모양 · FWHM ≈ ${FWHM.toFixed(1)}px`
              : `Radial profile — the star's Gaussian shape · FWHM ≈ ${FWHM.toFixed(1)}px`}
          </span>
          <svg viewBox={`0 0 ${plot.W} ${plot.H}`} role="img">
            <rect
              className="profile-zone-aperture"
              x={plot.xOf(0)}
              y={plot.T}
              width={plot.xOf(ap.r) - plot.xOf(0)}
              height={plot.innerH}
            />
            <rect
              className="profile-zone-annulus"
              x={plot.xOf(ap.rIn)}
              y={plot.T}
              width={plot.xOf(Math.min(ap.rOut, PROF_MAX)) - plot.xOf(ap.rIn)}
              height={plot.innerH}
            />
            <line
              className="profile-axis"
              x1={plot.L}
              y1={plot.T + plot.innerH}
              x2={plot.L + plot.innerW}
              y2={plot.T + plot.innerH}
            />
            <line className="profile-axis" x1={plot.L} y1={plot.T} x2={plot.L} y2={plot.T + plot.innerH} />
            {[0, 10, 20, 30].map((radius) => (
              <g key={radius}>
                <line
                  className="profile-tick"
                  x1={plot.xOf(radius)}
                  y1={plot.T + plot.innerH}
                  x2={plot.xOf(radius)}
                  y2={plot.T + plot.innerH + 4}
                />
                <text className="profile-text" x={plot.xOf(radius)} y={plot.T + plot.innerH + 15} textAnchor="middle">
                  {radius}
                </text>
              </g>
            ))}
            <text
              className="profile-text"
              x={plot.L + plot.innerW / 2}
              y={plot.H - 6}
              textAnchor="middle"
            >
              {ko ? '중심에서의 거리 (px)' : 'Distance from center (px)'}
            </text>
            <text className="profile-text" x={8} y={plot.T - 4} textAnchor="start">
              {ko ? '↑ 픽셀 값' : '↑ pixel value'}
            </text>
            {/* FWHM marker */}
            <line
              className="profile-fwhm"
              x1={plot.xOf(FWHM)}
              y1={plot.T}
              x2={plot.xOf(FWHM)}
              y2={plot.T + plot.innerH}
            />
            <text
              className="profile-text fwhm-label"
              x={plot.xOf(FWHM) + 4}
              y={plot.T + plot.innerH - 8}
            >
              FWHM
            </text>
            <line
              className="profile-bgline"
              x1={plot.L}
              y1={plot.yOf(stats.bgEst)}
              x2={plot.L + plot.innerW}
              y2={plot.yOf(stats.bgEst)}
            />
            <text
              className="profile-text accent-muted"
              x={plot.L + plot.innerW - 10}
              y={plot.yOf(stats.bgEst) - 7}
              textAnchor="end"
            >
              {ko ? `배경 추정 ${stats.bgEst.toFixed(1)}` : `bg est. ${stats.bgEst.toFixed(1)}`}
            </text>
            <polyline className="profile-line" points={plot.points} />
            <text className="profile-text zone-label-aperture" x={plot.xOf(ap.r / 2)} y={plot.T + 12} textAnchor="middle">
              {ko ? '구경' : 'aperture'}
            </text>
            <text
              className="profile-text zone-label-annulus"
              x={plot.xOf((ap.rIn + Math.min(ap.rOut, PROF_MAX)) / 2)}
              y={plot.T + 12}
              textAnchor="middle"
            >
              {ko ? '배경 고리' : 'annulus'}
            </text>
          </svg>
        </div>
      </div>

      <div className="inquiry-aperture-controls">
        <div className="inquiry-aperture-sliders">
          {sliderRow(
            ko ? '구경 반지름 r' : 'Aperture radius r',
            `${ap.r}px (${(ap.r / FWHM).toFixed(1)}×FWHM)`,
            ap.r,
            3,
            20,
            (v) => setAp((prev) => clampConfig({ ...prev, r: v })),
          )}
          {sliderRow(
            ko ? '고리 안쪽 r_in' : 'Annulus inner r_in',
            `${ap.rIn}px`,
            ap.rIn,
            5,
            30,
            (v) => setAp((prev) => clampConfig({ ...prev, rIn: v })),
            'muted',
          )}
          {sliderRow(
            ko ? '고리 바깥 r_out' : 'Annulus outer r_out',
            `${ap.rOut}px`,
            ap.rOut,
            8,
            34,
            (v) => setAp((prev) => clampConfig({ ...prev, rOut: v })),
            'muted',
          )}
        </div>
        <dl className="inquiry-aperture-stats">
          <div>
            <dt>{ko ? '목표별 빛 포함' : 'Target light enclosed'}</dt>
            <dd>{stats.enclosed.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>{ko ? '이웃별 오염 (구경)' : 'Neighbor in aperture'}</dt>
            <dd className={stats.contamination > 5 ? 'warn' : ''}>
              {stats.contamination.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt>{ko ? '배경 추정 (참값 20)' : 'Background est. (true 20)'}</dt>
            <dd className={Math.abs(stats.bgEst - BG) > 1.5 ? 'warn' : ''}>
              {stats.bgEst.toFixed(1)}
            </dd>
          </div>
          <div>
            <dt>{ko ? '기기 등급' : 'Instrumental mag'}</dt>
            <dd>{stats.mag.toFixed(2)}</dd>
          </div>
          <div>
            <dt>SNR</dt>
            <dd>{stats.snr.toFixed(0)}</dd>
          </div>
        </dl>
        <p className="inquiry-aperture-hint">{hint}</p>
        <p className="inquiry-aperture-note">
          {ko
            ? `실전 요령: 구경 반지름은 대개 별 퍼짐(FWHM ≈ ${FWHM.toFixed(1)}px)의 1.5~2배(약 ${Math.round(FWHM * 1.5)}~${Math.round(FWHM * 2)}px)로 잡고, 배경 고리는 그 바깥 별이 없는 깨끗한 하늘에 둡니다. 고리 구간 프로파일이 솟아 있으면 별이 배경을 오염시키는 중입니다. 참고: 여기서는 별 하나의 구경 측광만 다룹니다 — 실제 분석(다음 단계)은 여러 비교성과의 차등측광이고, 거기서도 구경을 직접 조절할 수 있습니다.`
            : `Rule of thumb: set the aperture radius to about 1.5–2 × the stellar FWHM (≈ ${Math.round(FWHM * 1.5)}–${Math.round(FWHM * 2)}px here) and place the annulus on clean, starless sky beyond it. A bump in the annulus band means a star is contaminating the background. Note: this is single-star aperture photometry — the real analysis (next step) is differential photometry against comparison stars, where you can also tune the aperture.`}
        </p>
      </div>
    </section>
  );
}
