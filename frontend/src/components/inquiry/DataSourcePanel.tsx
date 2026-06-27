import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { DataSourceConfig } from '../../explorationBlocks/types';

interface DataSourcePanelProps {
  dataSource: DataSourceConfig;
}

export function DataSourcePanel({ dataSource }: DataSourcePanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '자료 출처' : 'Data Source'}</span>
      <h3>{localize(dataSource.name, lang)}</h3>
      <dl className="inquiry-field-list">
        <div>
          <dt>{lang === 'ko' ? '제공 기관' : 'Provider'}</dt>
          <dd>{localize(dataSource.provider, lang)}</dd>
        </div>
        <div>
          <dt>{lang === 'ko' ? '접근 방식' : 'Access method'}</dt>
          <dd>{localize(dataSource.accessMethod, lang)}</dd>
        </div>
      </dl>
      {dataSource.archiveUrl && (
        <a href={dataSource.archiveUrl} className="inquiry-inline-link" target="_blank" rel="noreferrer">
          {lang === 'ko' ? '공식 archive 열기' : 'Open official archive'}
        </a>
      )}
    </section>
  );
}
