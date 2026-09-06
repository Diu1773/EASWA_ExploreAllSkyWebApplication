import PlotlyModule from 'plotly.js-dist-min';

/**
 * One toolbar for every graph in the app.
 *
 * The plots were shipped with `displayModeBar: false`, so a learner who wanted
 * a closer look at a crowded part of a light curve or a colour-magnitude
 * diagram had no way to get one, and no way back if they did. Zoom, pan and a
 * reset are the minimum for a graph the learner is asked to read evidence from.
 *
 * The button set is pinned rather than filtered: Plotly's default bar also
 * carries selection tools that do nothing here and spike-line toggles that just
 * add clutter. `resetScale2d` is the one that undoes everything.
 */
export const PLOT_MODE_BAR_BUTTONS = [
  ['zoomIn2d', 'zoomOut2d', 'zoom2d', 'pan2d', 'resetScale2d', 'toImage'],
];

const plotly = (PlotlyModule as any).default ?? (PlotlyModule as any);

/** Plotly labels its buttons in English; these are the six we keep. */
try {
  plotly.register({
    moduleType: 'locale',
    name: 'ko',
    dictionary: {
      Zoom: '범위 지정 확대',
      Pan: '끌어서 이동',
      'Zoom in': '확대',
      'Zoom out': '축소',
      'Reset axes': '처음 범위로',
      'Download plot as a png': '그림 저장',
      'Download plot as a PNG': '그림 저장',
      'Download plot': '그림 저장',
      'Double-click to zoom back out': '두 번 누르면 처음 범위로 돌아갑니다',
    },
  });
} catch {
  // Without locale support the graphs still render; only the button tooltips
  // stay English.
}

export interface PlotConfigOptions {
  /** Hide the bar on plots too small to hold it (thumbnails, inline previews). */
  hidden?: boolean;
  /** File name for the "그림 저장" button, without extension. */
  imageName?: string;
  /** 'ko' | 'en' from the language store. */
  lang?: string;
}

export function plotConfig({ hidden = false, imageName, lang = 'ko' }: PlotConfigOptions = {}) {
  return {
    responsive: true,
    displayModeBar: !hidden,
    displaylogo: false,
    modeBarButtons: PLOT_MODE_BAR_BUTTONS,
    locale: lang === 'ko' ? 'ko' : 'en',
    ...(imageName
      ? { toImageButtonOptions: { filename: imageName, format: 'png' as const, scale: 2 } }
      : {}),
  };
}
