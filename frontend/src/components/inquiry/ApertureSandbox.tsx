import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useLangStore } from '../../i18n';

/**
 * Concept sandbox for aperture photometry (Step 3 · 분석 준비).
 * A bundled synthetic star field — clearly labeled as a simulation — lets the
 * learner drag/resize an aperture and watch flux, magnitude, SNR, and neighbor
 * contamination respond. Real measurements happen in Step 4 on TESS cutouts.
 */

const N = 110; // fine-pixel grid size
const SCALE = 4; // display scale
const BG = 20; // sky background per pixel
const READ_NOISE = 3;

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
  { x: 55, y: 55, flux: 60000, sigma: 3.2, isTarget: true },
  { x: 67, y: 47, flux: 16000, sigma: 3.2 },
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

export function ApertureSandbox() {
  const lang = useLangStore((state) => state.lang);
  const ko = lang === 'ko';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [radius, setRadius] = useState(8);
  const [pos, setPos] = useState({ x: 55, y: 55 });

  const scene = useMemo(buildScene, []);

  // Paint the bundled star field once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(N, N);
    let max = 0;
    for (let i = 0; i < N * N; i++) max = Math.max(max, scene.total[i]);
    for (let i = 0; i < N * N; i++) {
      // asinh-like stretch for a natural star look
      const v = Math.pow(Math.min(scene.total[i] / max, 1), 0.42) * 255;
      image.data[i * 4] = v;
      image.data[i * 4 + 1] = v * 0.96;
      image.data[i * 4 + 2] = v * 0.88;
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [scene]);

  const stats = useMemo(() => {
    let sum = 0;
    let targetSum = 0;
    let othersSum = 0;
    let npix = 0;
    const r2 = radius * radius;
    const x0 = Math.max(0, Math.floor(pos.x - radius));
    const x1 = Math.min(N - 1, Math.ceil(pos.x + radius));
    const y0 = Math.max(0, Math.floor(pos.y - radius));
    const y1 = Math.min(N - 1, Math.ceil(pos.y + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (dx * dx + dy * dy > r2) continue;
        const i = y * N + x;
        sum += scene.total[i];
        targetSum += scene.targetOnly[i];
        othersSum += scene.othersOnly[i];
        npix++;
      }
    }
    const net = Math.max(sum - BG * npix, 1);
    const enclosed = (targetSum / TARGET_TOTAL_FLUX) * 100;
    const contamination = (othersSum / Math.max(targetSum + othersSum, 1)) * 100;
    const mag = 25 - 2.5 * Math.log10(net);
    const snr = net / Math.sqrt(sum + npix * READ_NOISE * READ_NOISE);
    return { net, enclosed, contamination, mag, snr };
  }, [scene, pos, radius]);

  const hint = useMemo(() => {
    if (stats.enclosed < 82) {
      return ko
        ? '구경이 작거나 빗나가서 목표별 빛을 놓치고 있어요 → 등급이 어두워짐(값 커짐).'
        : 'The aperture is missing target light (too small or off-center) → the magnitude gets fainter.';
    }
    if (stats.contamination > 5) {
      return ko
        ? '이웃별 빛이 섞여 들어옵니다(blending) → 밝기가 과대측정되고 식 깊이는 얕아져요.'
        : 'Neighboring starlight is blending in → flux is overestimated and transit depth gets diluted.';
    }
    if (radius > 16) {
      return ko
        ? '구경이 커서 배경 잡음이 함께 늘어 SNR이 떨어집니다.'
        : 'A large aperture adds background noise, lowering the SNR.';
    }
    return ko
      ? '적절한 구경입니다 — 목표별 빛은 담고, 이웃별·배경은 최소화.'
      : 'Good aperture — captures the target while keeping neighbors and background low.';
  }, [stats, radius, ko]);

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

  return (
    <section className="inquiry-info-panel inquiry-aperture-sandbox">
      <span className="inquiry-panel-kicker">
        {ko ? '직접 해보기 — 측광 구경' : 'Try It — Photometric Aperture'}
      </span>
      <h3>
        {ko
          ? '구경 크기와 위치가 측정을 어떻게 바꾸는지 만져보세요'
          : 'Drag and resize the aperture to see how it changes the measurement'}
      </h3>
      <div className="inquiry-aperture-body">
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
          <div
            className="inquiry-aperture-ring"
            style={{
              left: pos.x * SCALE,
              top: pos.y * SCALE,
              width: radius * 2 * SCALE,
              height: radius * 2 * SCALE,
            }}
          />
          <span className="inquiry-aperture-sim-tag">
            {ko ? '개념 시뮬레이션 · 실제 관측 아님' : 'Concept simulation · not real data'}
          </span>
        </div>
        <div className="inquiry-aperture-controls">
          <label className="inquiry-aperture-slider">
            <span>
              {ko ? '구경 반지름' : 'Aperture radius'} <strong>r = {radius}px</strong>
            </span>
            <input
              type="range"
              min={3}
              max={26}
              step={1}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
            />
          </label>
          <dl className="inquiry-aperture-stats">
            <div>
              <dt>{ko ? '목표별 빛 포함' : 'Target light enclosed'}</dt>
              <dd>{stats.enclosed.toFixed(0)}%</dd>
            </div>
            <div>
              <dt>{ko ? '이웃별 혼입' : 'Neighbor contamination'}</dt>
              <dd className={stats.contamination > 5 ? 'warn' : ''}>
                {stats.contamination.toFixed(1)}%
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
              ? '실제 측정은 다음 단계에서 TESS cutout으로 수행합니다 — 거기서도 구경을 조절할 수 있어요.'
              : 'The real measurement runs on the TESS cutout in the next step — where you can adjust the aperture too.'}
          </p>
        </div>
      </div>
    </section>
  );
}
