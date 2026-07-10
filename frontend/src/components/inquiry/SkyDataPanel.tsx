import { useMemo, useState } from 'react';
import { useLangStore } from '../../i18n';
import { buildDssPreviewUrl } from '../../utils/surveys';

const IMG_W = 640;
const IMG_H = 400;

export interface SkyDataChip {
  label: { ko: string; en: string };
  value: string;
}

interface SkyDataPanelProps {
  targetName: string;
  ra: number;
  dec: number;
  /** Instrument pixel scale in arcsec/px — enables the pixel-grid overlay (TESS: 21). */
  pixelScaleArcsec?: number;
  /** Field of view of the preview along its width, in degrees. */
  fovDeg?: number;
  chips?: SkyDataChip[];
}

export function SkyDataPanel({
  targetName,
  ra,
  dec,
  pixelScaleArcsec,
  fovDeg = 0.1,
  chips = [],
}: SkyDataPanelProps) {
  const lang = useLangStore((state) => state.lang);
  const [showGrid, setShowGrid] = useState(true);
  const [imgFailed, setImgFailed] = useState(false);

  const src = useMemo(
    () => buildDssPreviewUrl(ra, dec, { width: IMG_W, height: IMG_H, fovDeg }),
    [ra, dec, fovDeg],
  );

  // One instrument pixel, expressed in preview-image pixels.
  const cellPx = pixelScaleArcsec ? (IMG_W * pixelScaleArcsec) / 3600 / fovDeg : 0;
  const gridAvailable = cellPx > 4;
  const gridOn = gridAvailable && showGrid;

  const { verticals, horizontals, highlight } = useMemo(() => {
    if (!gridAvailable) return { verticals: [], horizontals: [], highlight: null };
    const centerCol = Math.floor(IMG_W / 2 / cellPx);
    const centerRow = Math.floor(IMG_H / 2 / cellPx);
    // Offset the grid so the target sits at the middle of its cell.
    const offsetX = IMG_W / 2 - (centerCol + 0.5) * cellPx;
    const offsetY = IMG_H / 2 - (centerRow + 0.5) * cellPx;
    const vs: number[] = [];
    for (let x = offsetX % cellPx; x <= IMG_W; x += cellPx) vs.push(x);
    const hs: number[] = [];
    for (let y = offsetY % cellPx; y <= IMG_H; y += cellPx) hs.push(y);
    return {
      verticals: vs,
      horizontals: hs,
      highlight: {
        x: offsetX + centerCol * cellPx,
        y: offsetY + centerRow * cellPx,
      },
    };
  }, [gridAvailable, cellPx]);

  return (
    <section className="inquiry-info-panel inquiry-skydata">
      <span className="inquiry-panel-kicker">
        {lang === 'ko' ? '하늘에서 보기' : 'On the Sky'}
      </span>
      <div className="inquiry-skydata-body">
        <div className="inquiry-skydata-figure">
          {pixelScaleArcsec && (
            <div className="inquiry-skydata-toggles" role="group">
              <button
                type="button"
                className={`inquiry-skydata-toggle ${!gridOn ? 'active' : ''}`}
                onClick={() => setShowGrid(false)}
              >
                {lang === 'ko' ? 'DSS 원본' : 'DSS only'}
              </button>
              <button
                type="button"
                className={`inquiry-skydata-toggle ${gridOn ? 'active' : ''}`}
                onClick={() => setShowGrid(true)}
                disabled={!gridAvailable}
              >
                {lang === 'ko' ? 'TESS 픽셀 격자' : 'TESS pixel grid'}
              </button>
            </div>
          )}
          <div className="inquiry-skydata-stage">
            {imgFailed ? (
              <div className="inquiry-skydata-fallback">
                {lang === 'ko'
                  ? '하늘 이미지를 불러오지 못했습니다 (외부 DSS 서비스). 아래 관측 정보는 그대로 확인할 수 있습니다.'
                  : 'Could not load the sky image (external DSS service). The observation info below is still available.'}
              </div>
            ) : (
              <>
                <img
                  src={src}
                  alt={`${targetName} ${lang === 'ko' ? '주변 하늘 (DSS)' : 'sky field (DSS)'}`}
                  loading="lazy"
                  onError={() => setImgFailed(true)}
                />
                {gridOn && highlight && (
                  <svg
                    className="inquiry-skydata-grid"
                    viewBox={`0 0 ${IMG_W} ${IMG_H}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {verticals.map((x) => (
                      <line key={`v${x.toFixed(1)}`} x1={x} y1={0} x2={x} y2={IMG_H} />
                    ))}
                    {horizontals.map((y) => (
                      <line key={`h${y.toFixed(1)}`} x1={0} y1={y} x2={IMG_W} y2={y} />
                    ))}
                    <rect
                      className="inquiry-skydata-grid-highlight"
                      x={highlight.x}
                      y={highlight.y}
                      width={cellPx}
                      height={cellPx}
                    />
                    <line
                      className="inquiry-skydata-scalebar"
                      x1={16}
                      y1={IMG_H - 18}
                      x2={16 + cellPx}
                      y2={IMG_H - 18}
                    />
                    <text className="inquiry-skydata-scaletext" x={16} y={IMG_H - 26}>
                      {`${pixelScaleArcsec}″ = ${lang === 'ko' ? 'TESS 1픽셀' : '1 TESS pixel'}`}
                    </text>
                  </svg>
                )}
              </>
            )}
          </div>
          <p className="inquiry-skydata-caption">
            {lang === 'ko'
              ? `DSS 광학 탐사 이미지 · 시야 ${fovDeg}° (TESS 관측 화면이 아닙니다)`
              : `DSS optical survey image · ${fovDeg}° field (not a TESS frame)`}
            {gridOn &&
              (lang === 'ko'
                ? ' — 강조된 한 픽셀 안에 몇 개의 별이 들어가는지 보세요.'
                : ' — note how many stars share the highlighted single pixel.')}
          </p>
        </div>
        {chips.length > 0 && (
          <dl className="inquiry-skydata-chips">
            {chips.map((chip) => (
              <div key={chip.label.en} className="inquiry-skydata-chip">
                <dt>{chip.label[lang === 'ko' ? 'ko' : 'en']}</dt>
                <dd>{chip.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
