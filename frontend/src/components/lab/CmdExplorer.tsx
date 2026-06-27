import { useEffect, useMemo, useRef, useState } from 'react';
import PlotlyModule from 'plotly.js-dist-min';
import { useLangStore } from '../../i18n';
import type { Target } from '../../types/target';

type StarCatalogRow = [number, number, number, number];

interface CatalogPoint {
  ra: number;
  dec: number;
  vMag: number;
  bv: number;
  distanceDeg: number;
}

interface TargetCmdPoint {
  vMag: number;
  bv: number;
  colorSource: string;
  magnitudeSource: string;
}

interface CmdExplorerProps {
  target: Target;
  defaultOpen?: boolean;
}

const plotly = (PlotlyModule as any).default ?? (PlotlyModule as any);
const FIELD_RADIUS_DEG = 18;
const MAX_CMD_POINTS = 1400;

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function angularDistanceDeg(
  raA: number,
  decA: number,
  raB: number,
  decB: number
): number {
  const decARad = degToRad(decA);
  const decBRad = degToRad(decB);
  const deltaRa = degToRad(raA - raB);
  const cosDistance =
    Math.sin(decARad) * Math.sin(decBRad) +
    Math.cos(decARad) * Math.cos(decBRad) * Math.cos(deltaRa);
  return Math.acos(Math.min(1, Math.max(-1, cosDistance))) * (180 / Math.PI);
}

function parseVisualMagnitude(value: string): number | null {
  const match = /-?\d+(?:\.\d+)?/.exec(value);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function colorIndexToTemperature(bv: number): number {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

function estimateBvFromTemperature(temperature: number | null | undefined): number | null {
  if (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature <= 0) {
    return null;
  }

  let low = -0.35;
  let high = 2.2;
  for (let index = 0; index < 40; index += 1) {
    const mid = (low + high) / 2;
    const estimate = colorIndexToTemperature(mid);
    if (estimate > temperature) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Math.min(2.2, Math.max(-0.35, (low + high) / 2));
}

function buildCatalogPoints(
  rows: StarCatalogRow[],
  target: Target
): CatalogPoint[] {
  return rows
    .flatMap((row) => {
      const [ra, dec, vMag, bv] = row;
      if (
        !Number.isFinite(ra) ||
        !Number.isFinite(dec) ||
        !Number.isFinite(vMag) ||
        !Number.isFinite(bv)
      ) {
        return [];
      }
      return [
        {
          ra,
          dec,
          vMag,
          bv,
          distanceDeg: angularDistanceDeg(target.ra, target.dec, ra, dec),
        },
      ];
    })
    .sort((left, right) => left.distanceDeg - right.distanceDeg);
}

function resolveTargetCmdPoint(
  target: Target,
  nearestCatalogPoint: CatalogPoint | null
): TargetCmdPoint | null {
  const parsedMagnitude = parseVisualMagnitude(target.magnitude_range);
  const estimatedBv = estimateBvFromTemperature(target.stellar_temperature);
  const closeCatalogPoint =
    nearestCatalogPoint && nearestCatalogPoint.distanceDeg <= 0.35
      ? nearestCatalogPoint
      : null;
  const vMag = parsedMagnitude ?? closeCatalogPoint?.vMag ?? null;
  const bv = estimatedBv ?? closeCatalogPoint?.bv ?? null;
  if (vMag === null || bv === null) return null;

  return {
    vMag,
    bv,
    colorSource:
      estimatedBv !== null
        ? 'estimated from host-star temperature'
        : `nearest local catalog star (${closeCatalogPoint?.distanceDeg.toFixed(2)} deg)`,
    magnitudeSource:
      parsedMagnitude !== null
        ? 'target magnitude field'
        : `nearest local catalog star (${closeCatalogPoint?.distanceDeg.toFixed(2)} deg)`,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (left === undefined || right === undefined) return null;
  return (left + right) / 2;
}

function formatNumber(value: number | null, digits = 2): string {
  return value === null ? 'n/a' : value.toFixed(digits);
}

function formatPeriodDays(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  if (value < 1) return `${(value * 24).toFixed(2)} h`;
  return `${value.toFixed(4)} d`;
}

function describeTargetType(target: Target): string {
  if (target.topic_id === 'variable_star') {
    return 'Variable-star context: compare color, period, and amplitude before interpreting the light curve.';
  }
  if (target.topic_id === 'eclipsing_binary') {
    return 'Eclipsing-binary context: CMD position helps distinguish stellar color from eclipse geometry.';
  }
  if (target.topic_id === 'exoplanet_transit') {
    return 'Transit context: use host-star color and field density as evidence for blending and contamination checks.';
  }
  return 'Field context: compare the target with nearby stars before choosing an analysis path.';
}

export function CmdExplorer({ target, defaultOpen = false }: CmdExplorerProps) {
  const lang = useLangStore((state) => state.lang);
  const plotRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [catalogRows, setCatalogRows] = useState<StarCatalogRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = defaultOpen;
    }
    setIsOpen(defaultOpen);
  }, [defaultOpen, target.id]);

  useEffect(() => {
    if (!isOpen || catalogRows.length > 0) return;
    let cancelled = false;
    import('../../data/stars_catalog.json')
      .then((module) => {
        if (!cancelled) setCatalogRows(module.default as StarCatalogRow[]);
      })
      .catch(() => {
        if (!cancelled) setLoadError('CMD catalog failed to load.');
      });
    return () => {
      cancelled = true;
    };
  }, [catalogRows.length, isOpen]);

  const allCatalogPoints = useMemo(
    () => buildCatalogPoints(catalogRows, target),
    [catalogRows, target]
  );
  const fieldPoints = useMemo(() => {
    const local = allCatalogPoints.filter(
      (point) => point.distanceDeg <= FIELD_RADIUS_DEG
    );
    const source = local.length >= 120 ? local : allCatalogPoints;
    return source.slice(0, MAX_CMD_POINTS);
  }, [allCatalogPoints]);
  const nearestCatalogPoint = allCatalogPoints[0] ?? null;
  const targetPoint = useMemo(
    () => resolveTargetCmdPoint(target, nearestCatalogPoint),
    [target, nearestCatalogPoint]
  );
  const medianBv = useMemo(
    () => median(fieldPoints.map((point) => point.bv)),
    [fieldPoints]
  );
  const medianMag = useMemo(
    () => median(fieldPoints.map((point) => point.vMag)),
    [fieldPoints]
  );
  const magnitudeSpan = useMemo(() => {
    if (fieldPoints.length === 0) return null;
    const mags = fieldPoints.map((point) => point.vMag);
    return {
      min: Math.min(...mags),
      max: Math.max(...mags),
    };
  }, [fieldPoints]);

  useEffect(() => {
    const plotNode = plotRef.current;
    if (!isOpen || !plotNode || fieldPoints.length === 0 || !plotly?.react || !plotly?.purge) {
      return;
    }

    const traces: any[] = [
      {
        x: fieldPoints.map((point) => point.bv),
        y: fieldPoints.map((point) => point.vMag),
        text: fieldPoints.map(
          (point) =>
            `RA ${point.ra.toFixed(3)}, Dec ${point.dec.toFixed(3)}<br>` +
            `V=${point.vMag.toFixed(2)}, B-V=${point.bv.toFixed(2)}<br>` +
            `${point.distanceDeg.toFixed(1)} deg from target`
        ),
        hoverinfo: 'text',
        mode: 'markers',
        type: 'scattergl',
        marker: {
          color: fieldPoints.map((point) => point.bv),
          colorscale: [
            [0, '#7dd3fc'],
            [0.45, '#f5f0d7'],
            [1, '#f97316'],
          ],
          cmin: -0.3,
          cmax: 1.8,
          size: 5,
          opacity: 0.62,
          line: { width: 0 },
        },
        name: 'Local catalog stars',
      },
    ];

    if (targetPoint) {
      traces.push({
        x: [targetPoint.bv],
        y: [targetPoint.vMag],
        hovertemplate: [
          `${target.name}<br>` +
            `V=${targetPoint.vMag.toFixed(2)}, B-V=${targetPoint.bv.toFixed(2)}<br>` +
            `${targetPoint.colorSource}<extra></extra>`,
        ],
        mode: 'markers+text',
        type: 'scatter',
        marker: {
          color: '#ffffff',
          size: 13,
          symbol: 'star',
          line: { color: '#111111', width: 2 },
        },
        text: [target.name],
        textposition: 'top center',
        textfont: {
          family: 'IBM Plex Sans, sans-serif',
          color: '#ffffff',
          size: 11,
        },
        name: 'Selected target',
      });
    }

    const yValues = [
      ...fieldPoints.map((point) => point.vMag),
      ...(targetPoint ? [targetPoint.vMag] : []),
    ];
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    plotly
      .react(
        plotNode,
        traces,
        {
          title: {
            text: lang === 'ko' ? '색-등급도 탐구' : 'Color-Magnitude Explorer',
            font: {
              family: 'IBM Plex Sans, sans-serif',
              color: '#f8fafc',
              size: 15,
            },
            x: 0,
            xanchor: 'left',
          },
          xaxis: {
            title: { text: 'B-V color index', font: { color: '#cbd5e1' } },
            gridcolor: 'rgba(148, 163, 184, 0.18)',
            zerolinecolor: 'rgba(148, 163, 184, 0.24)',
            color: '#cbd5e1',
          },
          yaxis: {
            title: { text: 'V magnitude', font: { color: '#cbd5e1' } },
            range: [yMax + 0.5, yMin - 0.5],
            gridcolor: 'rgba(148, 163, 184, 0.18)',
            zerolinecolor: 'rgba(148, 163, 184, 0.24)',
            color: '#cbd5e1',
          },
          margin: { t: 48, r: 18, b: 52, l: 56 },
          height: 360,
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(5, 10, 18, 0.72)',
          showlegend: true,
          legend: {
            orientation: 'h',
            x: 0,
            y: -0.22,
            font: {
              family: 'IBM Plex Sans, sans-serif',
              color: '#cbd5e1',
              size: 10,
            },
          },
          font: {
            family: 'IBM Plex Mono, monospace',
            color: '#cbd5e1',
            size: 11,
          },
        },
        {
          responsive: true,
          displayModeBar: false,
        }
      )
      .catch((error: unknown) => {
        console.error('Failed to render CMD plot', error);
      });

    return () => {
      plotly.purge(plotNode);
    };
  }, [fieldPoints, target.name, targetPoint, lang, isOpen]);

  const targetContext = describeTargetType(target);

  return (
    <details
      ref={detailsRef}
      className="cmd-explorer"
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        setIsOpen((currentOpen) => (currentOpen === nextOpen ? currentOpen : nextOpen));
      }}
    >
      <summary className="cmd-explorer-summary">
        <div>
          <span className="record-section-kicker">CMD module</span>
          <h3>{lang === 'ko' ? '색-등급도와 변광성 맥락' : 'CMD and Variability Context'}</h3>
        </div>
        <span>{target.type}</span>
      </summary>
      {isOpen && (
        <div className="cmd-explorer-body">
          <div className="cmd-explorer-copy">
            <p>{targetContext}</p>
            <div className="cmd-metric-grid">
              <div className="cmd-metric">
                <span>Field stars</span>
                <strong>{fieldPoints.length.toLocaleString()}</strong>
              </div>
              <div className="cmd-metric">
                <span>Median B-V</span>
                <strong>{formatNumber(medianBv)}</strong>
              </div>
              <div className="cmd-metric">
                <span>Median V</span>
                <strong>{formatNumber(medianMag)}</strong>
              </div>
              <div className="cmd-metric">
                <span>Period</span>
                <strong>{formatPeriodDays(target.period_days)}</strong>
              </div>
            </div>
            {targetPoint && (
              <div className="cmd-target-note">
                <strong>{target.name}</strong>
                <span>
                  V={targetPoint.vMag.toFixed(2)}, B-V={targetPoint.bv.toFixed(2)}
                </span>
                <small>
                  Color: {targetPoint.colorSource}; magnitude: {targetPoint.magnitudeSource}.
                </small>
              </div>
            )}
            <ul className="cmd-question-list">
              <li>Compare the target color with the local field median before interpreting a light curve.</li>
              <li>For a variable star, ask whether period, amplitude, and CMD position support the claimed type.</li>
              <li>For a transit target, use a dense or mixed-color field as evidence to discuss blending risk.</li>
            </ul>
            <p className="cmd-method-note">
              This plot uses local catalog RA, Dec, visual magnitude, and B-V color. It is suitable
              for classroom exploration and paper-method validation notes, but publication-grade CMD
              figures should replace V magnitude with Gaia absolute magnitude and include extinction
              and parallax quality cuts.
            </p>
            {magnitudeSpan && (
              <p className="cmd-method-note">
                Current field V range: {magnitudeSpan.min.toFixed(2)} to {magnitudeSpan.max.toFixed(2)}.
              </p>
            )}
            {loadError && <p className="hint error-text">{loadError}</p>}
          </div>
          <div className="cmd-plot" ref={plotRef}>
            {fieldPoints.length === 0 && (
              <div className="plot-error">
                {lang === 'ko' ? 'CMD 카탈로그를 불러오는 중입니다.' : 'Loading CMD catalog...'}
              </div>
            )}
          </div>
        </div>
      )}
    </details>
  );
}
