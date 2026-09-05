import { useEffect, useMemo, useRef, useState } from 'react';
import PlotlyModule from 'plotly.js-dist-min';
import { useLangStore } from '../../i18n';
import type { ClusterCmdResponse } from '../../api/client';
import parsecGridJson from '../../data/parsecGaiaIsochrones.json';

const plotly = (PlotlyModule as any).default ?? (PlotlyModule as any);

// PARSEC v1.2S isochrones (CMD 3.8, Gaia EDR3 passbands, A_V = 0), on a grid of
// four metallicities × 34 ages. Each point is [BP-RP, absolute G, evolutionary
// phase]. Fetched with ezpadova on 2026-09-05; provenance is in the JSON's
// `meta` block. Phases 0-1 are pre-main-sequence / main sequence, 2+ are
// post-main-sequence.
interface ParsecGrid {
  meta: { Z_sun: number; MH_for_Z: Record<string, number>; [k: string]: unknown };
  isochrones: Record<string, Record<string, Array<[number, number, number]>>>;
}
const PARSEC = parsecGridJson as unknown as ParsecGrid;
const Z_KEYS = Object.keys(PARSEC.isochrones).sort((a, b) => Number(a) - Number(b));
const MH_VALUES = Z_KEYS.map((z) => PARSEC.meta.MH_for_Z[z]);
const SOLAR_Z_INDEX = Math.max(0, MH_VALUES.indexOf(0));
const LOG_AGES = Object.keys(PARSEC.isochrones[Z_KEYS[0]])
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

function isochroneFor(zIndex: number, logAge: number): Array<[number, number, number]> {
  const zKey = Z_KEYS[Math.min(Z_KEYS.length - 1, Math.max(0, zIndex))];
  const ageKey = snapLogAge(logAge).toFixed(1);
  return PARSEC.isochrones[zKey]?.[ageKey] ?? [];
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
  metallicityZ: number;
  metallicityMH: number;
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
  const [zIndex, setZIndex] = useState(SOLAR_Z_INDEX);
  // 등시선을 하나만 그리면 «이게 맞나»를 견줄 데가 없다. 이웃 나이를 함께 켜서 전향점이
  // 어느 쪽으로 움직이는지 보고, 문헌값 선을 겹쳐 자기 선과 어디서 갈리는지 본다.
  // 문헌 선은 기본으로 꺼 둔다 — 켜 두면 맞추기가 베끼기가 된다.
  const [showNeighbourAges, setShowNeighbourAges] = useState(false);
  const [showLiterature, setShowLiterature] = useState(false);

  // Reset the fit whenever a new cluster loads.
  useEffect(() => {
    setLogAge(DEFAULT_LOG_AGE);
    setDistanceModulus(priorModulus);
    setAv(0);
    setZIndex(SOLAR_Z_INDEX);
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
    // Axis ranges follow the stars, not the isochrone: the red-giant tip of an
    // old isochrone reaches BP-RP 4-5 and would otherwise squeeze the cluster
    // into the left half of the plot.
    const colorMin = colors.reduce((acc, value) => Math.min(acc, value), Infinity);
    const colorMax = colors.reduce((acc, value) => Math.max(acc, value), -Infinity);

    const colorShift = E_BPRP_PER_AV * av;
    const magShift = distanceModulus + A_G_PER_AV * av;
    const iso = isochroneFor(zIndex, logAge);
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
        range: [colorMin - 0.2, colorMax + 0.2],
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

    if (showNeighbourAges) {
      for (const delta of [-0.5, 0.5]) {
        const other = snapLogAge(logAge + delta);
        if (other === snapLogAge(logAge)) continue;
        const pts = isochroneFor(zIndex, other).filter((p) => p[2] <= 4);
        if (!pts.length) continue;
        traces.push({
          x: pts.map((p) => p[0] + colorShift),
          y: pts.map((p) => p[1] + magShift),
          mode: 'lines',
          type: 'scatter',
          line: { color: 'rgba(251, 146, 60, 0.38)', width: 1.4 },
          hoverinfo: 'skip',
          name: `${lang === 'ko' ? '비교' : 'compare'} ${formatAge(other)}`,
        });
      }
    }

    if (showLiterature) {
      const refPts = isochroneFor(SOLAR_Z_INDEX, data.cluster.ref_logage).filter((p) => p[2] <= 4);
      if (refPts.length) {
        const refColour = E_BPRP_PER_AV * data.cluster.ref_av;
        const refMag = data.cluster.ref_distance_modulus + A_G_PER_AV * data.cluster.ref_av;
        traces.push({
          x: refPts.map((p) => p[0] + refColour),
          y: refPts.map((p) => p[1] + refMag),
          mode: 'lines',
          type: 'scatter',
          line: { color: '#7dd3fc', width: 1.8, dash: 'dashdot' },
          hoverinfo: 'skip',
          name: lang === 'ko' ? '문헌값 등시선' : 'Literature isochrone',
        });
      }
    }

    plotly
      .react(node, traces, layout, { responsive: true, displayModeBar: false })
      .catch((error: unknown) => {
        console.error('Failed to render cluster CMD', error);
      });

    return () => {
      plotly.purge(node);
    };
  }, [points, data, lang, logAge, distanceModulus, av, zIndex, showNeighbourAges, showLiterature]);

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
      metallicityZ: Number(Z_KEYS[zIndex]),
      metallicityMH: MH_VALUES[zIndex],
      priorDistancePc,
      priorModulus,
    });
  }, [logAge, distanceModulus, av, zIndex, priorModulus, onFitChange]);

  const distancePc = Math.pow(10, (distanceModulus + 5) / 5);
  const priorDistancePc = Math.pow(10, (priorModulus + 5) / 5);
  const ko = lang === 'ko';

  return (
    <div className="cluster-cmd-visualizer">
      <div ref={plotRef} style={{ width: '100%', minHeight: 430 }} />

      <div className="cmd-fit">
        <div className="cmd-fit-head">
          {/* 「등시선」은 교육과정 밖 용어다. 표기 규칙(docs/TERMS_KO.md §1-0)에 따라
              라벨에는 툴팁을, 화면에는 짧은 뜻풀이 한 줄을 함께 둔다. */}
          <strong
            title={
              ko
                ? '등시선: 같은 시기에 태어나 조성이 같은 별들이 색-등급도에서 이루는 선.'
                : 'Isochrone: the line traced on a colour-magnitude diagram by stars of the same age and composition.'
            }
          >
            {ko ? '등시선 맞추기' : 'Isochrone fit'}
          </strong>
          <span className="cmd-fit-summary">
            {ko
              ? `거리 ${distancePc.toFixed(0)} pc · 나이 ${formatAge(logAge)} · A_V ${av.toFixed(2)} · 금속함량 ${MH_VALUES[zIndex] > 0 ? '+' : ''}${MH_VALUES[zIndex].toFixed(2)}   (시차 출발값 ${priorDistancePc.toFixed(0)} pc)`
              : `distance ${distancePc.toFixed(0)} pc · age ${formatAge(logAge)} · A_V ${av.toFixed(2)} · [M/H] ${MH_VALUES[zIndex] > 0 ? '+' : ''}${MH_VALUES[zIndex].toFixed(2)}   (parallax prior ${priorDistancePc.toFixed(0)} pc)`}
          </span>
          <button
            type="button"
            className="btn-sm"
            onClick={() => {
              setLogAge(DEFAULT_LOG_AGE);
              setDistanceModulus(priorModulus);
              setAv(0);
              setZIndex(SOLAR_Z_INDEX);
              setShowNeighbourAges(false);
              setShowLiterature(false);
            }}
          >
            {ko ? '초기값' : 'Reset'}
          </button>
        </div>

        <p className="cmd-fit-gloss">
          {ko
            ? '등시선은 같은 시기에 태어나 조성이 같은 별들이 이 그림에서 이루는 선입니다. 나이가 많을수록 무거운 별부터 주계열을 떠나므로 선의 모양이 달라집니다. 아래 네 값을 움직여 이 선을 별들에 겹쳐 보세요.'
            : 'An isochrone is the line stars of one age and composition trace on this diagram. As age grows the massive stars leave the main sequence first, so the line changes shape. Move the four controls below to lay it over the stars.'}
        </p>

        <div className="cmd-fit-grid">
          <div className="param-row">
            <label>
              {ko ? '나이 log(t/yr)' : 'Age log(t/yr)'}: <strong>{logAge.toFixed(1)}</strong>
              <span className="cmd-fit-sub">{formatAge(logAge)}</span>
            </label>
            <input
              type="range"
              min={LOG_AGE_MIN}
              max={LOG_AGE_MAX}
              step={LOG_AGE_STEP}
              value={logAge}
              onChange={(e) => setLogAge(snapLogAge(Number(e.target.value)))}
            />
          </div>
          <div className="param-row">
            <label>
              <span
                title={
                  ko
                    ? '거리계수 m-M: 겉보기 등급에서 절대 등급을 뺀 값. 성단이 멀수록 커진다.'
                    : 'Distance modulus m-M: apparent minus absolute magnitude; it grows with distance.'
                }
              >
                {ko ? '거리계수 m-M' : 'Distance modulus m-M'}
              </span>
              : <strong>{distanceModulus.toFixed(2)}</strong>
              <span className="cmd-fit-sub">{distancePc.toFixed(0)} pc</span>
            </label>
            <input
              type="range"
              min={0}
              max={15}
              step={0.05}
              value={distanceModulus}
              onChange={(e) => setDistanceModulus(Number(e.target.value))}
            />
          </div>
          <div className="param-row">
            <label>
              <span
                title={
                  ko
                    ? '소광 A_V: 별과 우리 사이의 성간 티끌이 별빛을 가리는 정도. 파란빛이 더 많이 가려져 별이 어둡고 붉게 보인다.'
                    : 'Extinction A_V: how much interstellar dust dims the starlight. Blue light is absorbed more, so stars look fainter and redder.'
                }
              >
                {ko ? '소광 A_V' : 'Extinction A_V'}
              </span>
              : <strong>{av.toFixed(2)}</strong>
              <span className="cmd-fit-sub">
                {ko ? '별빛을 가려 어둡고 붉게 · ' : 'dims and reddens · '}E(BP-RP) {(E_BPRP_PER_AV * av).toFixed(2)}
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={3}
              step={0.02}
              value={av}
              onChange={(e) => setAv(Number(e.target.value))}
            />
          </div>
          <div className="param-row">
            <label>
              <span
                title={
                  ko
                    ? '금속함량: 별이 가진, 수소와 헬륨보다 무거운 원소의 양. 태양을 0으로 두고 견준다. 많을수록 별이 붉고 어둡게 보인다.'
                    : 'Metallicity: how much of a star is elements heavier than hydrogen and helium, measured against the Sun at 0. More of them makes stars look redder and fainter.'
                }
              >
                {ko ? '금속함량' : 'Metallicity'}
              </span>
              :{' '}
              <strong>
                {MH_VALUES[zIndex] > 0 ? '+' : ''}
                {MH_VALUES[zIndex].toFixed(2)}
              </strong>
              <span className="cmd-fit-sub">
                {ko
                  ? `무거운 원소의 양, 태양이 0 · Z ${Z_KEYS[zIndex]}`
                  : `heavy-element content, Sun = 0 · Z ${Z_KEYS[zIndex]}`}
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={Z_KEYS.length - 1}
              step={1}
              value={zIndex}
              onChange={(e) => setZIndex(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="cmd-fit-overlays">
          <label>
            <input
              type="checkbox"
              checked={showNeighbourAges}
              onChange={(e) => setShowNeighbourAges(e.target.checked)}
            />
            {ko
              ? `이웃 나이 함께 보기 (${formatAge(snapLogAge(logAge - 0.5))} · ${formatAge(snapLogAge(logAge + 0.5))})`
              : `Show neighbouring ages (${formatAge(snapLogAge(logAge - 0.5))} · ${formatAge(snapLogAge(logAge + 0.5))})`}
          </label>
          <label>
            <input
              type="checkbox"
              checked={showLiterature}
              onChange={(e) => setShowLiterature(e.target.checked)}
            />
            {ko
              ? `문헌값 등시선 겹쳐 보기 (${formatAge(data.cluster.ref_logage)} · ${data.cluster.ref_distance_pc.toFixed(0)} pc)`
              : `Overlay the literature isochrone (${formatAge(data.cluster.ref_logage)} · ${data.cluster.ref_distance_pc.toFixed(0)} pc)`}
          </label>
        </div>
        <p className="cmd-fit-hint">
          {ko
            ? '실선은 주계열 이전과 주계열, 점선은 주계열을 떠난 별의 자리입니다. 거리는 곡선을 위아래로, 소광은 붉고 어두운 쪽으로 대각선으로, 나이는 전향점의 위치를, 금속함량은 주계열 전체의 색을 바꿉니다. 시차 거리는 출발점일 뿐이고, 맞춘 값은 Step 5에서 문헌값과 비교합니다. 맞추기가 막히면 이웃 나이를 함께 켜서 전향점이 어느 쪽으로 움직이는지 보고, 그래도 막히면 문헌값 선을 겹쳐 어디서 갈리는지 확인하세요.'
            : 'Solid: pre-main-sequence and main sequence; dotted: post-main-sequence. Distance moves the curve vertically, extinction diagonally toward red and faint, age moves the turn-off, and metallicity shifts the colour of the whole sequence. The parallax distance is only a starting point; Step 5 compares your fit with the literature.'}
        </p>
        <p className="cmd-fit-assumptions">
          {ko
            ? '모델 가정: PARSEC v1.2S 등시선, Kroupa 초기질량함수, 소광 계수 A_G/A_V 0.806과 E(BP-RP)/A_V 0.429 (Wang & Chen 2019). 쌍성과 자전은 고려하지 않습니다. 네 값은 서로 바꿔 맞출 수 있으므로 겹침이 좋다고 해서 각 값이 맞다는 뜻은 아닙니다.'
            : 'Model assumptions: PARSEC v1.2S isochrones, Kroupa IMF, extinction coefficients A_G/A_V 0.806 and E(BP-RP)/A_V 0.429 (Wang & Chen 2019). Binaries and rotation are not modelled. The four controls trade off against each other, so a good overlay does not mean each value is right.'}
        </p>
      </div>

      <p style={{ fontSize: 14.5, color: '#94a3b8', margin: '8px 0 0' }}>
        {data.member_count.toLocaleString()}{' '}
        {ko ? '개 구성원 · ' : 'members · '}
        {data.data_source}
      </p>
    </div>
  );
}
