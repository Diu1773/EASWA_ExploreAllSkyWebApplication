import type { ReactNode } from 'react';
import type { Lang } from '../i18n';

export type ModuleId = 'exoplanet-transit' | 'cluster-cmd' | 'kmtnet';

export type LocalizedText = string | Partial<Record<Lang, string>>;

export type InquiryStepId =
  | 'step0_intro'
  | 'step1_select'
  | 'step2_metadata'
  | 'step3_analysis_conditions'
  | 'step4_run_visualize'
  | 'step5_compare'
  | 'step6_reflect';

export type InquiryStepKind =
  | 'intro'
  | 'selection'
  | 'metadata'
  | 'analysis'
  | 'visualization'
  | 'comparison'
  | 'reflection';

export interface InquiryPrompt {
  id: string;
  question: LocalizedText;
  helperText?: LocalizedText;
}

export type SelfCheckItem =
  | {
      id: string;
      type: 'ox';
      question: LocalizedText;
      correct: 'O' | 'X';
      explanation: LocalizedText;
    }
  | {
      id: string;
      type: 'choice';
      question: LocalizedText;
      options: LocalizedText[];
      correctIndex: number;
      explanation: LocalizedText;
    };

export interface InquiryStepConfig {
  id: InquiryStepId;
  number: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  kind: InquiryStepKind;
  title: LocalizedText;
  summary: LocalizedText;
  questions: InquiryPrompt[];
  recordFields: InquiryPrompt[];
  selfChecks?: SelfCheckItem[];
}

export interface KeyValueField {
  id: string;
  label: LocalizedText;
  value: LocalizedText;
  description?: LocalizedText;
  source?: LocalizedText;
}

export interface DataSourceConfig {
  name: LocalizedText;
  provider: LocalizedText;
  description: LocalizedText;
  archiveUrl?: string;
  accessMethod: LocalizedText;
  provenanceNote: LocalizedText;
}

export interface AnalysisParameter {
  id: string;
  label: LocalizedText;
  value: LocalizedText;
  adjustable: boolean;
  description?: LocalizedText;
}

export interface AnalysisConfig {
  adapterKey: ModuleId;
  method: LocalizedText;
  automaticTasks: LocalizedText[];
  parameters: AnalysisParameter[];
  assumptions: LocalizedText[];
  qualitySignals: LocalizedText[];
}

export interface VisualizationConfig {
  primaryView: LocalizedText;
  layers: LocalizedText[];
  interpretationCues: LocalizedText[];
}

export interface ComparisonConfig {
  referenceSource: LocalizedText;
  comparisonValues: KeyValueField[];
  qualityCriteria: LocalizedText[];
  interpretationRule: LocalizedText;
}

export interface ClassroomUseConfig {
  suggestedTime: LocalizedText;
  level: LocalizedText;
  grouping: LocalizedText;
  teacherNotes: LocalizedText[];
}

export interface ExplorationModuleConfig {
  id: ModuleId;
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  image: string;
  imageAlt: LocalizedText;
  imageCredit?: LocalizedText;
  tags: string[];
  dataSource: DataSourceConfig;
  learningGoals: LocalizedText[];
  steps: InquiryStepConfig[];
  metadataFields: KeyValueField[];
  analysisConfig: AnalysisConfig;
  visualizationConfig: VisualizationConfig;
  comparisonConfig: ComparisonConfig;
  reflectionQuestions: InquiryPrompt[];
  teacherNotes: LocalizedText[];
  classroomUse: ClassroomUseConfig;
  entry: {
    href: string;
    label: LocalizedText;
    helperText: LocalizedText;
  };
}

export interface InquiryVisualizationResult {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  status: 'placeholder' | 'ready' | 'generated';
}

export interface InquiryReportField {
  id: string;
  label: LocalizedText;
  prompt: LocalizedText;
}

export interface InquiryResult {
  targetName: string;
  dataSource: LocalizedText;
  metadata: KeyValueField[];
  analysisConditions: KeyValueField[];
  qualityInfo: KeyValueField[];
  visualizations: InquiryVisualizationResult[];
  derivedValues: KeyValueField[];
  comparisonValues: KeyValueField[];
  interpretationPrompts: InquiryPrompt[];
  reportFields: InquiryReportField[];
}

export interface ModuleAction {
  href: string;
  label: LocalizedText;
  helperText?: LocalizedText;
}

export interface ExplorationModuleAdapter<TContext = unknown> {
  id: ModuleId;
  createInitialResult: (
    module: ExplorationModuleConfig,
    context?: TContext,
  ) => InquiryResult;
  getPrimaryAction: (
    module: ExplorationModuleConfig,
    context?: TContext,
  ) => ModuleAction | null;
  renderContextSummary?: (context?: TContext) => ReactNode;
}
