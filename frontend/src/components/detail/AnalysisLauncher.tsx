import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import type { Target } from '../../types/target';
import {
  buildLabHref,
  getExplorerContext,
} from '../../utils/explorerNavigation';
import { useLangStore } from '../../i18n';

interface AnalysisLauncherProps {
  target: Target;
}

export function AnalysisLauncher({ target }: AnalysisLauncherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const selected = useAppStore((s) => s.selectedObservationIds);
  const lang = useLangStore((s) => s.lang);
  const isTransitTarget = target.topic_id === 'exoplanet_transit';
  const isMicrolensingTarget = target.topic_id === 'microlensing';
  const context = getExplorerContext(new URLSearchParams(location.search), {
    topicId: target.topic_id,
  });
  const extraEntries: Array<[string, string]> = [];

  if (isTransitTarget) {
    extraEntries.push(['workflow', 'transit']);
  }

  if (isMicrolensingTarget) {
    extraEntries.push(['workflow', 'microlensing']);
    extraEntries.push(['step', 'field']);
  }

  return (
    <div className="analysis-launcher">
      <div className="analysis-launcher-head">
        <h4>{lang === 'ko' ? '분석 도구' : 'Analysis Tools'}</h4>
        <span className="analysis-launcher-tag">
          {isTransitTarget
            ? lang === 'ko' ? 'TESS 분석 흐름' : 'TESS WORKFLOW'
            : lang === 'ko' ? '측광' : 'PHOTOMETRY'}
        </span>
      </div>
      <button
        className="btn-primary"
        disabled={selected.length === 0}
        onClick={() => navigate(buildLabHref(target.id, context, extraEntries))}
      >
        {isTransitTarget
          ? lang === 'ko' ? '식현상 분석 (TESS)' : 'Transit Analysis (TESS)'
          : lang === 'ko' ? '측광과 광도곡선' : 'Photometry & Light Curve'}
        {selected.length > 0 && ` (${selected.length}${lang === 'ko' ? '개 관측' : ' obs'})`}
      </button>
      {selected.length === 0 && (
        <p className="hint">
          {lang === 'ko'
            ? '위에서 관측 자료를 선택하면 분석을 시작할 수 있습니다.'
            : 'Select observations above to enable analysis.'}
        </p>
      )}
      {isTransitTarget && selected.length > 0 && (
        <p className="hint">
          {lang === 'ko'
            ? '선택한 Sector의 TESS FITS 자료가 식현상 분석에 사용됩니다.'
            : 'Selected sectors will feed the TESS FITS transit workflow.'}
        </p>
      )}
    </div>
  );
}
