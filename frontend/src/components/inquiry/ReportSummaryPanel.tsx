import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { InquiryResult } from '../../explorationBlocks/types';

interface ReportSummaryPanelProps {
  result: InquiryResult;
}

export function ReportSummaryPanel({ result }: ReportSummaryPanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '보고서 스키마' : 'Report Schema'}</span>
      <h3>{lang === 'ko' ? '공통 결과 형식' : 'Shared Result Shape'}</h3>
      <dl className="inquiry-field-list compact">
        <div>
          <dt>targetName</dt>
          <dd>{result.targetName}</dd>
        </div>
        <div>
          <dt>dataSource</dt>
          <dd>{localize(result.dataSource, lang)}</dd>
        </div>
        <div>
          <dt>metadata</dt>
          <dd>{result.metadata.length} fields</dd>
        </div>
        <div>
          <dt>analysisConditions</dt>
          <dd>{result.analysisConditions.length} fields</dd>
        </div>
        <div>
          <dt>qualityInfo</dt>
          <dd>{result.qualityInfo.length} fields</dd>
        </div>
        <div>
          <dt>visualizations</dt>
          <dd>{result.visualizations.length} views</dd>
        </div>
        <div>
          <dt>derivedValues</dt>
          <dd>{result.derivedValues.length} values</dd>
        </div>
        <div>
          <dt>comparisonValues</dt>
          <dd>{result.comparisonValues.length} values</dd>
        </div>
        <div>
          <dt>reportFields</dt>
          <dd>{result.reportFields.length} prompts</dd>
        </div>
      </dl>
    </section>
  );
}
