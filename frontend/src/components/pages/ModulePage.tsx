import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getExplorationModule } from '../../explorationBlocks/configs';
import { moduleAdapters } from '../../explorationBlocks/adapters';
import { useLangStore } from '../../i18n';
import { InquiryLayout } from '../inquiry';
import { ClusterModuleView } from './ClusterModuleView';
import { ExoplanetModuleView } from './ExoplanetModuleView';

const Microlens3DScene = lazy(() => import('../sky/Microlens3DScene'));

export function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const lang = useLangStore((state) => state.lang);
  const module = getExplorationModule(moduleId);

  if (!module) {
    return (
      <div className="page-placeholder">
        <h2>{lang === 'ko' ? '탐구블럭을 찾을 수 없습니다.' : 'Inquiry block not found.'}</h2>
        <p>
          {lang === 'ko'
            ? '홈에서 사용 가능한 탐구블럭을 다시 선택하세요.'
            : 'Choose an available inquiry block from the home page.'}
        </p>
        <Link to="/" className="btn-primary">
          {lang === 'ko' ? '홈으로' : 'Back Home'}
        </Link>
      </div>
    );
  }

  if (module.id === 'cluster-cmd') {
    return <ClusterModuleView module={module} />;
  }

  if (module.id === 'exoplanet-transit') {
    return <ExoplanetModuleView module={module} />;
  }

  const analysisSlot =
    module.id === 'kmtnet' ? (
      <div className="inquiry-lab-handoff">
        <p>
          {lang === 'ko'
            ? 'KMTNet 시간영역 분석(다지점 광도곡선·Paczynski 적합)은 KMTNet 탐색에서 진행합니다.'
            : 'KMTNet time-domain analysis (multi-site light curves, Paczynski fit) runs in the KMTNet explorer.'}
        </p>
        <Link to={module.entry.href} className="btn-primary">
          {lang === 'ko' ? 'KMTNet 탐색 열기 →' : 'Open KMTNet explorer →'}
        </Link>
      </div>
    ) : undefined;

  const introSlot =
    module.id === 'kmtnet' ? (
      <Suspense fallback={null}>
        <Microlens3DScene />
      </Suspense>
    ) : undefined;

  return (
    <InquiryLayout
      module={module}
      adapter={moduleAdapters[module.id]}
      introSlot={introSlot}
      analysisSlot={analysisSlot}
    />
  );
}
