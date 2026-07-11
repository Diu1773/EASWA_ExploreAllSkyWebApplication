import type { Observation, Target } from '../../types/target';
import type {
  ExplorationModuleAdapter,
  ExplorationModuleConfig,
  InquiryResult,
  KeyValueField,
  ModuleAction,
} from '../types';
import {
  analysisFieldsFromConfig,
  buildConfiguredVisualizations,
  buildReportFields,
  literalField,
  qualityFieldsFromConfig,
} from './shared';
import { buildExplorerHref } from '../../utils/explorerNavigation';

export interface ExoplanetAdapterContext {
  target?: Target | null;
  observations?: Observation[];
  labHref?: string;
}

function formatNumber(value: number | null | undefined, digits = 3): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return value.toFixed(digits);
}

function metadataFromTarget(
  module: ExplorationModuleConfig,
  target: Target | null | undefined,
  observations: Observation[],
): KeyValueField[] {
  if (!target) return module.metadataFields;

  return [
    ...module.metadataFields,
    literalField('target_name', { ko: '대상', en: 'Target' }, target.name),
    literalField('target_type', { ko: '유형', en: 'Type' }, target.type),
    literalField('coordinates', { ko: '좌표', en: 'Coordinates' }, `RA ${formatNumber(target.ra, 5)}, Dec ${formatNumber(target.dec, 5)}`),
    literalField('period_days', { ko: '카탈로그 주기', en: 'Catalog period' }, `${formatNumber(target.period_days, 6)} d`),
    literalField('transit_depth', { ko: '카탈로그 식 깊이', en: 'Catalog transit depth' }, `${formatNumber(target.transit_depth_pct, 3)}%`),
    literalField('observation_count', { ko: '사용 가능 관측', en: 'Available observations' }, String(observations.length)),
  ];
}

function derivedValuesFromTarget(target: Target | null | undefined): KeyValueField[] {
  if (!target) {
    return [
      literalField(
        'placeholder_rp_rs',
        'Rp/R*',
        { ko: '대상 선택 후 transit fit 결과로 채워짐', en: 'Filled after selecting a target and running transit fit' },
      ),
    ];
  }

  const depthFraction =
    typeof target.transit_depth_pct === 'number' && Number.isFinite(target.transit_depth_pct)
      ? target.transit_depth_pct / 100
      : null;
  const estimatedRpRs = depthFraction !== null && depthFraction >= 0
    ? Math.sqrt(depthFraction)
    : null;

  return [
    literalField('target_depth', { ko: '카탈로그 식 깊이', en: 'Catalog transit depth' }, `${formatNumber(target.transit_depth_pct, 3)}%`),
    literalField('estimated_rp_rs', { ko: '반지름비 Rp/R* (√depth 추정)', en: 'Radius ratio Rp/R* (√depth estimate)' }, estimatedRpRs === null ? 'n/a' : estimatedRpRs.toFixed(5)),
    literalField('period', { ko: '카탈로그 주기', en: 'Catalog period' }, `${formatNumber(target.period_days, 6)} d`),
  ];
}

export const exoplanetAdapter: ExplorationModuleAdapter<ExoplanetAdapterContext> = {
  id: 'exoplanet-transit',
  createInitialResult(module, context): InquiryResult {
    const target = context?.target ?? null;
    const observations = context?.observations ?? [];
    return {
      targetName: target?.name ?? 'TESS target not selected',
      dataSource: module.dataSource.name,
      metadata: metadataFromTarget(module, target, observations),
      analysisConditions: [
        ...analysisFieldsFromConfig(module),
        literalField(
          'selected_observations',
          { ko: '선택 관측', en: 'Selected observations' },
          observations.length > 0
            ? { ko: `${observations.length}개 sector 사용 가능`, en: `${observations.length} sector(s) available` }
            : { ko: '대상 상세에서 sector 선택 필요', en: 'Select sectors on the target detail page' },
        ),
      ],
      qualityInfo: qualityFieldsFromConfig(module),
      visualizations: buildConfiguredVisualizations(module, target ? 'ready' : 'placeholder'),
      derivedValues: derivedValuesFromTarget(target),
      comparisonValues: module.comparisonConfig.comparisonValues,
      interpretationPrompts: module.reflectionQuestions,
      reportFields: buildReportFields(module),
    };
  },
  getPrimaryAction(module, context): ModuleAction {
    if (context?.labHref) {
      return {
        href: context.labHref,
        label: { ko: '현재 TESS 분석 계속하기', en: 'Continue Current TESS Analysis' },
        helperText: module.entry.helperText,
      };
    }

    return {
      href: module.entry.href,
      label: module.entry.label,
      helperText: module.entry.helperText,
    };
  },
};

export function buildExoplanetEntryHref(): string {
  return buildExplorerHref({
    moduleId: 'tess',
    topicId: 'exoplanet_transit',
    siteId: null,
    learningMode: 'guided',
  });
}
