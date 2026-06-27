import type {
  ExplorationModuleAdapter,
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
import type { ClusterCmdResponse } from '../../api/client';

export interface ClusterCmdAdapterContext {
  clusterData?: ClusterCmdResponse | null;
}

function median(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  const sorted = [...finite].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export const clusterCmdAdapter: ExplorationModuleAdapter<ClusterCmdAdapterContext> = {
  id: 'cluster-cmd',
  createInitialResult(module, context): InquiryResult {
    const data = context?.clusterData ?? null;

    if (!data) {
      return {
        targetName: 'No cluster selected',
        dataSource: module.dataSource.name,
        metadata: [
          ...module.metadataFields,
          literalField('status', { ko: '상태', en: 'Status' }, { ko: '성단 선택 대기', en: 'Awaiting cluster selection' }),
        ],
        analysisConditions: analysisFieldsFromConfig(module),
        qualityInfo: qualityFieldsFromConfig(module),
        visualizations: buildConfiguredVisualizations(module, 'placeholder'),
        derivedValues: [
          literalField(
            'distance_modulus',
            { ko: '거리 계수 m-M', en: 'Distance modulus m-M' },
            { ko: '성단 선택 후 산출', en: 'Computed after selecting a cluster' },
          ),
        ],
        comparisonValues: module.comparisonConfig.comparisonValues,
        interpretationPrompts: module.reflectionQuestions,
        reportFields: buildReportFields(module),
      };
    }

    const parallaxes = data.members
      .map((member) => member.parallax)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
    const medianParallax = median(parallaxes);
    const distancePc = medianParallax ? 1000 / medianParallax : null;
    const distanceModulus = distancePc ? 5 * Math.log10(distancePc) - 5 : null;

    const derivedValues: KeyValueField[] = [
      literalField('member_count', { ko: '구성원 수 (Gaia)', en: 'Member count (Gaia)' }, data.member_count.toLocaleString()),
    ];
    if (medianParallax) {
      derivedValues.push(
        literalField('median_parallax', { ko: '중앙 시차', en: 'Median parallax' }, `${medianParallax.toFixed(3)} mas`),
      );
    }
    if (distancePc) {
      derivedValues.push(
        literalField(
          'derived_distance',
          { ko: '산출 거리 (시차 기반)', en: 'Derived distance (parallax)' },
          `${Math.round(distancePc).toLocaleString()} pc`,
        ),
      );
    }
    if (distanceModulus) {
      derivedValues.push(
        literalField('derived_distance_modulus', { ko: '산출 거리 계수 m-M', en: 'Derived distance modulus m-M' }, distanceModulus.toFixed(2)),
      );
    }

    return {
      targetName: data.cluster.name,
      dataSource: { ko: data.data_source, en: data.data_source },
      metadata: [
        ...module.metadataFields,
        literalField('cluster', { ko: '성단', en: 'Cluster' }, { ko: data.cluster.name_ko, en: data.cluster.name }),
        literalField('coordinates', { ko: '중심 좌표', en: 'Center' }, `RA ${data.cluster.ra.toFixed(2)}, Dec ${data.cluster.dec.toFixed(2)}`),
        literalField('color_label', { ko: '색지수', en: 'Color index' }, data.color_label),
        literalField('member_count_meta', { ko: '구성원 수', en: 'Member count' }, data.member_count.toLocaleString()),
        literalField('reference', { ko: '기준 출처', en: 'Reference' }, data.cluster.reference),
      ],
      analysisConditions: [
        ...analysisFieldsFromConfig(module),
        literalField('selection', { ko: '구성원 선별', en: 'Member selection' }, { ko: data.selection_note_ko, en: data.selection_note_en }),
      ],
      qualityInfo: qualityFieldsFromConfig(module),
      visualizations: buildConfiguredVisualizations(module, 'generated'),
      derivedValues,
      comparisonValues: [
        literalField(
          'ref_distance',
          { ko: '문헌 거리', en: 'Literature distance' },
          `${Math.round(data.cluster.ref_distance_pc).toLocaleString()} pc (m-M ${data.cluster.ref_distance_modulus.toFixed(2)})`,
        ),
        literalField('ref_age', { ko: '문헌 나이', en: 'Literature age' }, `${data.cluster.ref_age_gyr} Gyr`),
        literalField('ref_source', { ko: '기준 출처', en: 'Reference source' }, data.cluster.reference),
      ],
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
