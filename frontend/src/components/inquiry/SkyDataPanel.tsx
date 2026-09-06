import { useEffect, useMemo, useRef, useState } from 'react';
import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { LocalizedText } from '../../explorationBlocks/types';
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
  /** What the module actually analyses. Defaults to the TESS cutout wording;
   *  every non-transit module has to pass its own or the caption lies. */
  analysedDataNote?: LocalizedText;
}

export function SkyDataPanel({
  targetName,
  ra,
  dec,
  pixelScaleArcsec,
  fovDeg = 0.1,
  chips = [],
  analysedDataNote,
}: SkyDataPanelProps) {
  const lang = useLangStore((state) => state.lang);
  // 보기 셋 — 원본 / 격자 / TESS 해상도. 격자선만으로는 «한 픽셀에 여러 별이
  // 들어간다»가 잘 와닿지 않는다는 지적(2026-09-06)에 따라 세 번째를 더했다.
  const [view, setView] = useState<'dss' | 'grid' | 'binned'>('grid');
  const [imgFailed, setImgFailed] = useState(false);
  const binnedRef = useRef<HTMLCanvasElement | null>(null);

  const src = useMemo(
    () => buildDssPreviewUrl(ra, dec, { width: IMG_W, height: IMG_H, fovDeg }),
    [ra, dec, fovDeg],
  );

  // One instrument pixel, expressed in preview-image pixels.
  const cellPx = pixelScaleArcsec ? (IMG_W * pixelScaleArcsec) / 3600 / fovDeg : 0;
  const gridAvailable = cellPx > 4;
  const gridOn = gridAvailable && view === 'grid';
  const binnedOn = gridAvailable && view === 'binned';

  // 원본을 한 번만 받아 ref 에 들고 있는다. 보기를 오갈 때마다 새로 받으면
  // 전환마다 로딩이 걸린다(2026-09-06 소유자 지적). crossOrigin 을 붙인 요청은
  // <img> 가 이미 받은 것과 별개 항목이라 브라우저 캐시로도 해결되지 않았다.
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  // 「어느 주소의 그림을 받아 두었나」로 들고 있으면, 주소가 바뀔 때 값이 저절로
  // 어긋나 준비 안 된 상태가 된다. effect 안에서 상태를 바로 되돌릴 필요가 없다.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const sourceReady = loadedSrc === src;

  useEffect(() => {
    sourceImageRef.current = null;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      sourceImageRef.current = image;
      setLoadedSrc(src);
    };
    image.onerror = () => {
      if (!cancelled) setImgFailed(true);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  // TESS 한 픽셀(cellPx)을 한 칸으로 삼아 그림을 굵게 다시 그린다. 축소해서 그린
  // 뒤 매끄럽게 늘리지 않고 확대하면 각 칸이 한 색으로 뭉친다 — 같은 하늘을 TESS
  // 해상도로 보면 이웃한 별들이 한 픽셀에 섞인다는 것을 그대로 보여 준다.
  // 이미 받아 둔 이미지를 쓰므로 다시 그리는 데 네트워크가 필요 없다.
  useEffect(() => {
    if (!sourceReady || imgFailed) return;
    const canvas = binnedRef.current;
    const image = sourceImageRef.current;
    if (!canvas || !image) return;
    const cols = Math.max(1, Math.round(IMG_W / cellPx));
    const rows = Math.max(1, Math.round(IMG_H / cellPx));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const small = document.createElement('canvas');
    small.width = cols;
    small.height = rows;
    const sctx = small.getContext('2d');
    if (!sctx) return;
    sctx.drawImage(image, 0, 0, cols, rows);
    canvas.width = IMG_W;
    canvas.height = IMG_H;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, IMG_W, IMG_H);
    ctx.drawImage(small, 0, 0, cols, rows, 0, 0, IMG_W, IMG_H);
  }, [sourceReady, imgFailed, cellPx]);

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
                className={`inquiry-skydata-toggle ${view === 'dss' ? 'active' : ''}`}
                onClick={() => setView('dss')}
              >
                {lang === 'ko' ? 'DSS 원본' : 'DSS only'}
              </button>
              <button
                type="button"
                className={`inquiry-skydata-toggle ${view === 'grid' ? 'active' : ''}`}
                onClick={() => setView('grid')}
                disabled={!gridAvailable}
              >
                {lang === 'ko' ? 'TESS 픽셀 격자' : 'TESS pixel grid'}
              </button>
              <button
                type="button"
                className={`inquiry-skydata-toggle ${view === 'binned' ? 'active' : ''}`}
                onClick={() => setView('binned')}
                disabled={!gridAvailable}
              >
                {lang === 'ko' ? 'TESS 해상도' : 'TESS resolution'}
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
                {/* 둘 다 켜 두고 보이기만 바꾼다. 조건부로 갈아 끼우면 전환할
                    때마다 <img> 가 다시 마운트돼 로딩이 보인다. */}
                <img
                  src={src}
                  alt={`${targetName} ${lang === 'ko' ? '주변 하늘 (DSS)' : 'sky field (DSS)'}`}
                  loading="lazy"
                  onError={() => setImgFailed(true)}
                  hidden={binnedOn}
                />
                <canvas
                  ref={binnedRef}
                  className="inquiry-skydata-binned"
                  aria-label={`${targetName} ${lang === 'ko' ? '주변 하늘을 TESS 픽셀 크기로 다시 그린 그림' : 'sky field redrawn at TESS pixel scale'}`}
                  hidden={!binnedOn}
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
              ? `이 사진은 위치·크기 비교용 DSS 광학 탐사 이미지입니다 (시야 ${fovDeg}°). `
              : `This is a DSS optical survey image for spatial context (${fovDeg}° field). `}
            {analysedDataNote
              ? localize(analysedDataNote, lang)
              : lang === 'ko'
                ? '실제 분석에 쓰는 자료는 MAST에서 API로 받아오는 TESS cutout(대상 주변 픽셀 데이터)입니다.'
                : 'The data actually analyzed is a TESS pixel cutout fetched from MAST via its API.'}
            {gridOn &&
              (lang === 'ko'
                ? ' 격자는 TESS 픽셀 크기(21″)이며, 강조된 한 픽셀 안에 몇 개의 별이 들어가는지 보세요.'
                : ' The grid shows the TESS pixel size (21″) — note how many stars share the highlighted pixel.')}
            {binnedOn &&
              (lang === 'ko'
                ? ' 같은 하늘을 TESS 픽셀 크기로 다시 그린 그림입니다. 원본에서 따로 보이던 별들이 한 칸에 섞입니다.'
                : ' The same field redrawn at the TESS pixel size — stars separate in the original fall into one cell.')}
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
