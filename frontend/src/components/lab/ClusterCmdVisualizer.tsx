import { useEffect, useMemo, useRef, useState } from 'react';
import PlotlyModule from 'plotly.js-dist-min';
import { useLangStore } from '../../i18n';
import type { ClusterCmdResponse } from '../../api/client';

const plotly = (PlotlyModule as any).default ?? (PlotlyModule as any);

// Approximate Gaia main-sequence ridge line: absolute M_G vs (BP-RP).
// Reference for a fit-by-eye activity (not a precise isochrone).
const REFERENCE_MS: Array<[number, number]> = [
  [-0.3, -0.6],
  [0.0, 1.1],
  [0.2, 2.0],
  [0.4, 2.9],
  [0.6, 3.7],
  [0.82, 4.7],
  [1.0, 5.5],
  [1.2, 6.4],
  [1.4, 7.2],
  [1.6, 8.0],
  [1.8, 8.8],
  [2.0, 9.6],
  [2.4, 11.0],
  [2.8, 12.6],
  [3.2, 14.0],
];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface ClusterFitInfo {
  distanceModulus: number;
  reddening: number;
  distancePc: number;
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

  const [distanceModulus, setDistanceModulus] = useState(priorModulus);
  const [reddening, setReddening] = useState(0);

  // Reset the fit to the prior whenever a new cluster loads.
  useEffect(() => {
    setDistanceModulus(priorModulus);
    setReddening(0);
  }, [priorModulus]);

  useEffect(() => {
    const node = plotRef.current;
    if (!node || points.length === 0 || !plotly?.react) {
      return;
    }

    const colors = points.map((member) => member.bp_rp);
    const mags = points.map((member) => member.g_mag);
    const magMin = mags.reduce((acc, value) => Math.min(acc, value), Infinity);
    const magMax = mags.reduce((acc, value) => Math.max(acc, value), -Infinity);

    // E(BP-RP) ≈ 1.3·E(B-V); A_G ≈ 2.0·E(B-V) (rough Gaia-band coefficients).
    const colorShift = 1.3 * reddening;
    const magShift = distanceModulus + 2.0 * reddening;
    const refX = REFERENCE_MS.map(([c]) => c + colorShift);
    const refY = REFERENCE_MS.map(([, m]) => m + magShift);

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
      },
      {
        x: refX,
        y: refY,
        mode: 'lines',
        type: 'scatter',
        line: { color: '#fb923c', width: 2.6 },
        hoverinfo: 'skip',
        name: lang === 'ko' ? '표준 주계열(맞추기)' : 'Reference MS (fit)',
      },
    ];

    const layout: any = {
      title: {
        text: `${data.cluster.name} - ${lang === 'ko' ? '색-등급도 (CMD)' : 'Color-Magnitude Diagram'}`,
        font: { family: 'IBM Plex Sans, sans-serif', color: '#f8fafc', size: 14 },
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
  }, [points, data, lang, distanceModulus, reddening]);

  // Lift the fitted distance up so the block's Step 5 can compare it.
  useEffect(() => {
    const distancePc = Math.pow(10, (distanceModulus + 5) / 5);
    const priorDistancePc = Math.pow(10, (priorModulus + 5) / 5);
    onFitChange?.({ distanceModulus, reddening, distancePc, priorDistancePc, priorModulus });
  }, [distanceModulus, reddening, priorModulus, onFitChange]);

  const distancePc = Math.pow(10, (distanceModulus + 5) / 5);
  const priorDistancePc = Math.pow(10, (priorModulus + 5) / 5);

  return (
    <div className="cluster-cmd-visualizer">
      <div ref={plotRef} style={{ width: '100%', minHeight: 430 }} />

      <div className="cmd-fit-controls">
        <strong>{lang === 'ko' ? '주계열 맞추기 → 거리 구하기' : 'Main-sequence fitting → distance'}</strong>
        <label>
          <span>{lang === 'ko' ? `거리계수 m-M = ${distanceModulus.toFixed(2)}` : `Distance modulus m-M = ${distanceModulus.toFixed(2)}`}</span>
          <input
            type="range"
            min={3}
            max={13}
            step={0.05}
            value={distanceModulus}
            onChange={(e) => setDistanceModulus(Number(e.target.value))}
          />
        </label>
        <label>
          <span>{lang === 'ko' ? `적색화 E(B-V) = ${reddening.toFixed(2)}` : `Reddening E(B-V) = ${reddening.toFixed(2)}`}</span>
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.01}
            value={reddening}
            onChange={(e) => setReddening(Number(e.target.value))}
          />
        </label>
        <div className="cmd-fit-readout">
          {lang === 'ko'
            ? `맞춘 거리 ≈ ${distancePc.toFixed(0)} pc · 시차 기반 출발값(prior) ≈ ${priorDistancePc.toFixed(0)} pc`
            : `Fitted distance ≈ ${distancePc.toFixed(0)} pc · parallax prior ≈ ${priorDistancePc.toFixed(0)} pc`}
        </div>
        <p className="cmd-fit-hint">
          {lang === 'ko'
            ? '주황 곡선(근사 표준 주계열)을 별들의 주계열과 겹치도록 m-M을 움직여 보세요. 적색화는 곡선을 색 방향으로 밉니다. 시차 거리는 출발점일 뿐 — 직접 맞춰 거리를 확인하고 문헌값과 비교하세요.'
            : 'Slide m-M until the orange reference sequence overlaps the cluster main sequence; reddening shifts it in color. The parallax distance is only a starting point — fit it yourself, then compare with the literature value.'}
        </p>
        <button
          type="button"
          className="btn-sm"
          onClick={() => {
            setDistanceModulus(priorModulus);
            setReddening(0);
          }}
        >
          {lang === 'ko' ? '시차 출발값으로 초기화' : 'Reset to parallax prior'}
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', margin: '8px 0 0' }}>
        {data.member_count.toLocaleString()}{' '}
        {lang === 'ko' ? '개 구성원 · ' : 'members · '}
        {data.data_source}
      </p>
    </div>
  );
}
