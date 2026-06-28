import { Link, useParams } from 'react-router-dom';
import { getExplorationModule } from '../../explorationBlocks/configs';
import { moduleAdapters } from '../../explorationBlocks/adapters';
import { useLangStore } from '../../i18n';
import { InquiryLayout } from '../inquiry';
import { ClusterModuleView } from './ClusterModuleView';
import { ExoplanetModuleView } from './ExoplanetModuleView';
import { KmtnetModuleView } from './KmtnetModuleView';

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

  if (module.id === 'kmtnet') {
    return <KmtnetModuleView module={module} />;
  }

  return <InquiryLayout module={module} adapter={moduleAdapters[module.id]} />;
}
