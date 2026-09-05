import { useEffect, useMemo, useRef, useState } from 'react';
import PlotlyModule from 'plotly.js-dist-min';
import { useLangStore } from '../../i18n';
import type { ClusterCmdResponse } from '../../api/client';
import parsecGridJson from '../../data/parsecGaiaZ0152.json';

const plotly = (PlotlyModule as any).default ?? (PlotlyModule as any);

// PARSEC v1.2S isochrones (CMD 3.8, Gaia EDR3 passbands, Z = 0.0152, A_V = 0).
// Each point is [BP-RP, absolute G, evolutionary phase]. Fetched with ezpadova on
// 2026-09-05; provenance is in the JSON's `meta` block. Phases 0-1 are
// pre-main-sequence / main sequence, 2+ are post-main-sequence.
interface ParsecGrid {
  meta: Record<string, unknown>;
  isochrones: Record<string, Array<[number, number, number]>>;
}
const PARSEC = parsecGridJson as unknown as ParsecGrid;
const LOG_AGES = Object.keys(PARSEC.isochrones)
  .map(Number)
  .sort((a, b) => a - b);
const LOG_AGE_MIN = LOG_AGES[0];
const LOG_AGE_MAX = LOG_AGES[LOG_AGES.length - 1];
const LOG_AGE_STEP = 0.1;

// Extinction in Gaia bands per unit A_V, from Wang & Chen (2019, ApJ 877, 116),
// Table 3: A_λ/E(B-V) = 2.50 (G), 3.24 (BP), 1.91 (RP), with R_V = 3.1.
//   A_G / A_V        = 2.50 / 3.1 = 0.806
//   E(BP-RP) / A_V   = (3.24 - 1.91) / 3.1 = 0.429
const A_G_PER_AV = 0.806;
const E_BPRP_PER_AV = 0.429;

const DEFAULT_LOG_AGE = 8.5; // ~316 Myr: a neutral start, not any catalog's age

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function snapLogAge(value: number): number {
  const clamped = Math.min(LOG_AGE_MAX, Math.max(LOG_AGE_MIN, value));
  return Math.round(clamped * 10) / 10;
}

function isochroneFor(logAge: number): Array<[number, number, number]> {
  const key = snapLogAge(logAge).toFixed(1);
  return PARSEC.isochrones[key] ?? [];
}

export function formatAge(logAge: number): string {
  const yr = Math.pow(10, logAge);
  if (yr >= 1e9) return `${(yr / 1e9).toFixed(2)} Gyr`;
  return `${Math.round(yr / 1e6)} Myr`;
}

export interface ClusterFitInfo {
  logAge: number;
  ageGyr: number;
  distanceModulus: number;
  distancePc: number;
  av: number;
  ebprp: number;
  priorDistancePc: number;
  priorModulus: number;
}

interface ClusterCmdVisualizerProps {
  data: ClusterCmdResponse;
  onFitChange?: (info: ClusterFitInfo) => void;
}

export function ClusterCmdVisualizer({ data, onFitChange }: ClusterCmdVisualizerProps) {
  const lang = useLangStore((state) => state.lang);
  const plotRef = useRef<HTMLDivElement>(null);

  const points = useMemo(
    () =>
      data.members.filter(
        (member) => Number.isFinite(member.bp_rp) && Number.isFinite(member.g_mag),
      ),
    [data.members],
  );

  // Prior: distance modulus from the median parallax (a starting guess only).
  const priorModulus = useMemo(() => {
    const plx = points
      .map((p) => p.parallax)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const med = median(plx);
    if (!med) return 8;
    const dpc = 1000 / med;
    return 5 * Math.log10(dpc) - 5;
  }, [points]);

  const [logAge, setLogAge] = useState(DEFAULT_LOG_AGE);
  const [distanceModulus, setDistanceModulus] = useState(priorModulus);
  const [av, setAv] = useState(0);

  // Reset the fit whenever a new cluster loads.
  useEffect(() => {
    setLogAge(DEFAULT_LOG_AGE);
    setDistanceModulus(priorModulus);
    setAv(0);
  }, [priorModulus, data.cluster.id]);

  useEffect(() => {
    const node = plotRef.current;
    if (!node || points.length === 0 || !plotly?.react) {
      return;
    }

    const colors = points.map((member) => member.bp_rp);
    const mags = points.map((member) => member.g_mag);
    const magMin = mags.reduce((acc, value) => Math.min(acc, value), Infinity);
    const magMax = mags.reduce((acc, value) => Math.max(acc, value), -Infinity);

    const colorShift = E_BPRP_PER_AV * av;
    const magShift = distanceModulus + A_G_PER_AV * av;
    const iso = isochroneFor(logAge);
    const early = iso.filter((p) => p[2] <= 1);
    const evolved = iso.filter((p) => p[2] >= 2);

    const isoTrace = (pts: Array<[number, number, number]>, dash: 'solid' | 'dot', name: string) => ({
      x: pts.map((p) => p[0] + colorShift),
      y: pts.map((p) => p[1] + magShift),
      mode: 'lines',
      type: 'scatter',
      line: { color: '#fb923c', width: 2.4, dash },
      hoverinfo: 'skip',
      name,
    });

    const traces: any[] = [
      {
        x: colors,
        y: mags,
        text: points.map(
          (member) =>
            `BP-RP ${member.bp_rp.toFixed(3)}<br>G ${member.g_mag.toFixed(2)}` +
            (member.parallax != null ? `<br>parallax ${member.parallax.toFixed(3)} mas` : ''),
        ),
        hoverinfo: 'text',
        mode: 'markers',
        type: 'scattergl',
        marker: {
          color: colors,
          colorscale: [
            [0, '#7dd3fc'],
            [0.45, '#f5f0d7'],
            [1, '#f97316'],
          ],
          cmin: -0.3,
          cmax: 3.0,
          size: 5,
          opacity: 0.72,
          line: { width: 0 },
        },
        name: lang === 'ko' ? 'Gaia 구성원' : 'Gaia members',
      },
      isoTrace(early, 'solid', lang === 'ko' ? '등시선: 주계열 이전과 주계열' : 'Isochrone: PMS and MS'),
      isoTrace(evolved, 'dot', lang === 'ko' ? '등시선: 주계열 이후' : 'Isochrone: post-MS'),
    ];

    const layout: any = {
      title: {
        text: `${data.cluster.name} - ${lang === 'ko' ? '색-등급도 (CMD)' : 'Color-Magnitude Diagram'}`,
        font: { family: 'Pretendard, sans-serif', color: '#f8fafc', size: 14 },
        x: 0,
        xanchor: 'left',
      },
      xaxis: {
        title: { text: data.color_label, font: { color: '#cbd5e1' } },
        gridcolor: 'rgba(148, 163, 184, 0.18)',
        color: '#cbd5e1',
        zeroline: false,
      },
      yaxis: {
        title: { text: `${data.mag_label} (${lang === 'ko' ? '밝을수록 위' : 'brighter up'})`, font: { color: '#cbd5e1' } },
        range: [magMax + 0.4, magMin - 0.4],
        gridcolor: 'rgba(148, 163, 184, 0.18)',
        color: '#cbd5e1',
        zeroline: false,
      },
      margin: { t: 44, r: 16, b: 48, l: 54 },
      height: 430,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(5, 10, 18, 0.72)',
      showlegend: false,
      font: { family: 'IBM Plex Mono, monospace', color: '#cbd5e1', size: 11 },
    };

    plotly
      .react(node, traces, layout, { responsive: true, displayModeBar: false })
      .catch((error: unknown) => {
        console.error('Failed to render cluster CMD', error);
      });

    return () => {
      plotly.purge(node);
    };
  }, [points, data, lang, logAge, distanceModulus, av]);

  // Lift the fit up so the block's Step 5 can compare it with parallax and literature.
  useEffect(() => {
    const distancePc = Math.pow(10, (distanceModulus + 5) / 5);
    const priorDistancePc = Math.pow(10, (priorModulus + 5) / 5);
    onFitChange?.({
      logAge,
      ageGyr: Math.pow(10, logAge) / 1e9,
      distanceModulus,
      distancePc,
      av,
      ebprp: E_BPRP_PER_AV * av,
      priorDistancePc,
      priorModulus,
    });
  }, [logAge, distanceModulus, av, priorModulus, onFitChange]);

  const distancePc = Math.pow(10, (distanceModulus + 5) / 5);
  const priorDistancePc = Math.pow(10, (priorModulus + 5) / 5);
  const ko = lang === 'ko';

  return (
    <div className="cluster-cmd-visualizer">
      <div ref={plotRef} style={{ width: '100%', minHeight: 430 }} />

      <div className="cmd-fit-controls">
        <strong>{ko ? '등시선 맞추기: 나이, 거리, 소광' : 'Isochrone fitting: age, distance, extinction'}</strong>
        <label>
          <span>
            {ko
              ? `나이 log(t/yr) = ${logAge.toFixed(1)}  (약 ${formatAge(logAge)})`
              : `Age log(t/yr) = ${logAge.toFixed(1)}  (about ${formatAge(logAge)})`}
          </span>
          <input
            type="range"
            min={LOG_AGE_MIN}
            max={LOG_AGE_MAX}
            step={LOG_AGE_STEP}
            value={logAge}
            onChange={(e) => setLogAge(snapLogAge(Number(e.target.value)))}
          />
        </label>
        <label>
          <span>
            {ko
              ? `거리계수 m-M = ${distanceModulus.toFixed(2)}  (약 ${distancePc.toFixed(0)} pc)`
              : `Distance modulus m-M = ${distanceModulus.toFixed(2)}  (about ${distancePc.toFixed(0)} pc)`}
          </span>
          <input
            type="range"
            min={0}
            max={15}
            step={0.05}
            value={distanceModulus}
            onChange={(e) => setDistanceModulus(Number(e.target.value))}
          />
        </label>
        <label>
          <span>
            {ko
              ? `소광 A_V = ${av.toFixed(2)}  (색 변화 E(BP-RP) = ${(E_BPRP_PER_AV * av).toFixed(2)})`
              : `Extinction A_V = ${av.toFixed(2)}  (E(BP-RP) = ${(E_BPRP_PER_AV * av).toFixed(2)})`}
          </span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.02}
            value={av}
            onChange={(e) => setAv(Number(e.target.value))}
          />
        </label>
        <div className="cmd-fit-readout">
          {ko
            ? `내가 맞춘 거리 ${distancePc.toFixed(0)} pc, 나이 ${formatAge(logAge)}  ·  시차 출발값 ${priorDistancePc.toFixed(0)} pc`
            : `Fitted distance ${distancePc.toFixed(0)} pc, age ${formatAge(logAge)}  ·  parallax prior ${priorDistancePc.toFixed(0)} pc`}
        </div>
        <p className="cmd-fit-hint">
          {ko
            ? '주황 실선은 주계열 이전과 주계열, 점선은 주계열을 떠난 별의 자리입니다. 세 값을 함께 움직여 곡선을 별들에 겹쳐 보십시오. 거리는 곡선을 위아래로, 소광은 붉고 어두운 쪽으로 대각선으로, 나이는 전향점의 위치를 바꿉니다. 시차 거리는 출발점일 뿐이고, 맞춘 값은 Step 5에서 문헌값과 비교합니다.'
            : 'The solid orange line is the pre-main-sequence and main sequence; the dotted line is post-main-sequence. Move all three controls to overlay the curve on the stars. Distance shifts it vertically, extinction diagonally toward red and faint, age moves the turn-off. The parallax distance is only a starting point; Step 5 compares your fit with the literature.'}
        </p>
        <dl className="cmd-fit-assumptions">
          <dt>{ko ? '모델 가정' : 'Model assumptions'}</dt>
          <dd>
            {ko
              ? 'PARSEC v1.2S 등시선, 금속함량 Z = 0.0152 (태양 조성, 고정), Kroupa 초기질량함수. 소광 계수 A_G/A_V = 0.806, E(BP-RP)/A_V = 0.429 (Wang & Chen, 2019). 쌍성과 자전은 고려하지 않습니다.'
              : 'PARSEC v1.2S isochrones, metallicity Z = 0.0152 (solar, fixed), Kroupa IMF. Extinction coefficients A_G/A_V = 0.806, E(BP-RP)/A_V = 0.429 (Wang & Chen, 2019). Binaries and rotation are not modelled.'}
          </dd>
        </dl>
        <button
          type="button"
          className="btn-sm"
          onClick={() => {
            setLogAge(DEFAULT_LOG_AGE);
            setDistanceModulus(priorModulus);
            setAv(0);
          }}
        >
          {ko ? '초기값으로 되돌리기' : 'Reset to starting values'}
        </button>
      </div>

      <p style={{ fontSize: 14.5, color: '#94a3b8', margin: '8px 0 0' }}>
        {data.member_count.toLocaleString()}{' '}
        {ko ? '개 구성원 · ' : 'members · '}
        {data.data_source}
      </p>
    </div>
  );
}
