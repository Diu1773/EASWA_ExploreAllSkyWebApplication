import type {
  ExplorationModuleConfig,
  InquiryReportField,
  InquiryVisualizationResult,
  KeyValueField,
  LocalizedText,
} from '../types';

export function buildReportFields(module: ExplorationModuleConfig): InquiryReportField[] {
  return module.steps.flatMap((step) =>
    step.recordFields.map((field) => ({
      id: `${step.id}_${field.id}`,
      label: step.title,
      prompt: field.question,
    })),
  );
}

export function buildConfiguredVisualizations(
  module: ExplorationModuleConfig,
  status: InquiryVisualizationResult['status'],
): InquiryVisualizationResult[] {
  return [
    {
      id: `${module.id}_primary_view`,
      title: module.visualizationConfig.primaryView,
      description: {
        ko: '모듈 설정에서 요구하는 기본 시각화입니다.',
        en: 'Primary visualization required by this module configuration.',
      },
      status,
    },
    ...module.visualizationConfig.layers.map((layer, index) => ({
      id: `${module.id}_layer_${index + 1}`,
      title: layer,
      description: {
        ko: '해석 근거를 드러내기 위한 시각화 레이어입니다.',
        en: 'Visualization layer used to expose evidence for interpretation.',
      },
      status,
    })),
  ];
}

export function analysisFieldsFromConfig(module: ExplorationModuleConfig): KeyValueField[] {
  return module.analysisConfig.parameters.map((parameter) => ({
    id: parameter.id,
    label: parameter.label,
    value: parameter.value,
    description: parameter.description,
  }));
}

export function qualityFieldsFromConfig(module: ExplorationModuleConfig): KeyValueField[] {
  return module.analysisConfig.qualitySignals.map((signal, index) => ({
    id: `${module.id}_quality_${index + 1}`,
    label: { ko: `품질 지표 ${index + 1}`, en: `Quality signal ${index + 1}` },
    value: signal,
  }));
}

export function literalField(
  id: string,
  label: LocalizedText,
  value: LocalizedText,
  description?: LocalizedText,
): KeyValueField {
  return { id, label, value, description };
}
