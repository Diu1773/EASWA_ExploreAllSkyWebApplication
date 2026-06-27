import type {
  ExplorationModuleAdapter,
  InquiryResult,
  ModuleAction,
} from '../types';
import {
  analysisFieldsFromConfig,
  buildConfiguredVisualizations,
  buildReportFields,
  literalField,
  qualityFieldsFromConfig,
} from './shared';

export const kmtnetAdapter: ExplorationModuleAdapter = {
  id: 'kmtnet',
  createInitialResult(module): InquiryResult {
    return {
      targetName: 'KMTNet observation-quality sample',
      dataSource: module.dataSource.name,
      metadata: [
        ...module.metadataFields,
        literalField('mock_window', { ko: 'Mock 시간 구간', en: 'Mock time window' }, 'HJD 2460000.0-2460002.0'),
        literalField('mock_sites', { ko: '관측소', en: 'Sites' }, 'CTIO, SAAO, SSO'),
      ],
      analysisConditions: analysisFieldsFromConfig(module),
      qualityInfo: [
        ...qualityFieldsFromConfig(module),
        literalField('mock_quality_rule', { ko: '분류 기준', en: 'Classification rule' }, 'good / caution / reject placeholder'),
      ],
      visualizations: buildConfiguredVisualizations(module, 'placeholder'),
      derivedValues: [
        literalField('coverage_gap', { ko: '최대 관측 공백', en: 'Max coverage gap' }, { ko: 'Mock 계산 예정', en: 'Mock pending' }),
        literalField('quality_fraction', { ko: 'good 등급 비율', en: 'Good-quality fraction' }, { ko: 'Mock 계산 예정', en: 'Mock pending' }),
      ],
      comparisonValues: module.comparisonConfig.comparisonValues,
      interpretationPrompts: module.reflectionQuestions,
      reportFields: buildReportFields(module),
    };
  },
  getPrimaryAction(module): ModuleAction {
    return {
      href: module.entry.href,
      label: module.entry.label,
      helperText: module.entry.helperText,
    };
  },
};
