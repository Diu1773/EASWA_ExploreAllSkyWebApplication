import type { InquiryStepConfig, InquiryStepId, LocalizedText } from './types';

type StepOverrides = Partial<Record<InquiryStepId, Partial<InquiryStepConfig>>>;

const baseSteps: InquiryStepConfig[] = [
  {
    id: 'step0_intro',
    number: 0,
    kind: 'intro',
    title: { ko: '탐구 주제 소개 및 학습 목표', en: 'Topic Introduction and Goals' },
    summary: {
      ko: '탐구 질문, 학습 목표, 산출물을 먼저 확인합니다.',
      en: 'Review the inquiry question, goals, and expected output before starting.',
    },
    questions: [
      {
        id: 'intro_main_question',
        question: {
          ko: '이 탐구에서 관측 자료로 설명하려는 현상은 무엇인가?',
          en: 'What phenomenon will you explain using observation data?',
        },
      },
    ],
    // 표 4(논문 §4)의 이 단계 화면 구성 요소는 '탐구 질문·학습 목표·수업 적용 카드'이고
    // 학습자 활동은 '확인한다'이다. 서술형 기록 칸은 Step 6 행에만 있다. 여기 기록칸은
    // 그 서술과 어긋났고, 이동 게이트와 겹쳐 한 글자('D')만 치고 넘기게 만들었다.
    // STEP별 스캐폴딩은 질문·생각해보기가 담당하며 그대로 남는다.
    recordFields: [],
  },
  {
    id: 'step1_select',
    number: 1,
    kind: 'selection',
    title: { ko: '탐구 대상 또는 자료 선택', en: 'Select Target or Dataset' },
    summary: {
      ko: '질문에 맞는 대상, 관측 자료, 분석 범위를 선택합니다.',
      en: 'Choose the target, observation data, and analysis scope that match the question.',
    },
    questions: [
      {
        id: 'selection_reason',
        question: {
          ko: '이 대상 또는 자료가 탐구 질문에 적합하다고 판단한 근거는 무엇인가?',
          en: 'Why is this target or dataset appropriate for the inquiry question?',
        },
      },
    ],
    // 기록은 Step 6으로 (표 4: 이 단계 활동은 '확인한다').
    recordFields: [],
  },
  {
    id: 'step2_metadata',
    number: 2,
    kind: 'metadata',
    title: { ko: '자료 확인 — 자료 출처와 관측 정보', en: 'Check the Data — Source and Observations' },
    summary: {
      ko: '자료가 어디서 왔고 어떤 관측 조건을 갖는지 눈으로 확인합니다.',
      en: 'See where the data came from and what observing conditions it carries.',
    },
    questions: [
      {
        id: 'metadata_limits',
        question: {
          ko: '이 자료의 출처와 관측 조건은 결과 해석에 어떤 제한을 만들 수 있는가?',
          en: 'How might the source and observing conditions limit your interpretation?',
        },
        helperText: {
          ko: '아래 정보를 다 외우지 말고, 결과를 흔들 수 있는 항목 한두 개만 골라보세요 (예: 노출·필터·구성원 선별 기준).',
          en: 'Don’t memorize everything below — pick just one or two items that could most affect the result (e.g., exposure, filter, member selection).',
        },
      },
    ],
    // 기록은 Step 6으로 (표 4: 이 단계 활동은 '확인한다').
    recordFields: [],
  },
  {
    id: 'step3_analysis_conditions',
    number: 3,
    kind: 'analysis',
    title: { ko: '분석 준비 — 분석 설정과 모델 가정 확인', en: 'Prepare the Analysis — Settings and Assumptions' },
    summary: {
      ko: '자동 실행되는 계산도 어떤 설정과 가정으로 수행되는지 미리 이해합니다. 실제 조정은 다음 단계에서 합니다.',
      en: 'Understand the settings and assumptions behind the automated analysis before running it. You adjust them in the next step.',
    },
    questions: [
      {
        id: 'condition_effect',
        question: {
          ko: '분석 조건 중 결과에 가장 큰 영향을 줄 수 있는 항목은 무엇인가?',
          en: 'Which analysis condition could most strongly affect the result?',
        },
        helperText: {
          ko: '조건을 나열만 하지 말고, "이걸 바꾸면 결과가 어떻게 달라질까?"를 한 가지만 예상해 보세요 (예: aperture·ROI).',
          en: 'Rather than listing conditions, predict how changing one (e.g., aperture, ROI) would move the result.',
        },
      },
    ],
    // 기록은 Step 6으로 (표 4: 이 단계 활동은 '예측한다').
    recordFields: [],
  },
  {
    id: 'step4_run_visualize',
    number: 4,
    kind: 'visualization',
    title: { ko: '분석 실행 및 시각화 결과 확인', en: 'Run Analysis and Inspect Visualization' },
    summary: {
      ko: '분석을 실행하고 그래프, 이미지, 품질 지표를 근거로 결과를 확인합니다.',
      en: 'Run the analysis and inspect the output using plots, images, and quality metrics.',
    },
    questions: [
      {
        id: 'visual_evidence',
        question: {
          ko: '시각화 결과에서 현상을 뒷받침하는 근거는 어디에 보이는가?',
          en: 'Where does the visualization show evidence for the phenomenon?',
        },
      },
    ],
    // No record field: this step is where the Lab runs, and the Lab already asks
    // its own step-by-step questions while the learner works. A second "write
    // what you see" box on the same screen was pure duplication.
    recordFields: [],
  },
  {
    id: 'step5_compare',
    number: 5,
    kind: 'comparison',
    title: { ko: '기준값 또는 비교 자료와 비교', en: 'Compare with Reference Values' },
    summary: {
      ko: '산출값을 문헌값, 품질 기준, 비교 자료와 나란히 비교합니다.',
      en: 'Compare derived values with literature values, quality criteria, or reference data.',
    },
    questions: [
      {
        id: 'difference_reason',
        question: {
          ko: '기준값과 차이가 있다면 자료 품질, 분석 조건, 모델 가정 중 무엇으로 설명할 수 있는가?',
          en: 'If your value differs from the reference, can data quality, analysis conditions, or model assumptions explain it?',
        },
      },
    ],
    // No record field: "측정값과 기준값의 차이 + 원인" is exactly what Step 6's
    // reference_comparison asks. Asking it here too made learners write the same
    // answer twice, one screen apart.
    recordFields: [],
  },
  {
    id: 'step6_reflect',
    number: 6,
    kind: 'reflection',
    title: { ko: '결과 해석 및 탐구 기록 작성', en: 'Interpret Results and Write Report' },
    summary: {
      ko: '플랫폼이 계산한 값을 그대로 답으로 쓰지 않고, 근거와 한계를 바탕으로 해석합니다.',
      en: 'Interpret the result from evidence and limitations instead of treating computed values as final answers.',
    },
    questions: [
      {
        id: 'final_claim',
        question: {
          ko: '이번 결과를 어떤 주장으로 정리할 수 있으며, 그 주장의 한계는 무엇인가?',
          en: 'What claim can you make from this result, and what are its limitations?',
        },
      },
    ],
    recordFields: [
      {
        id: 'final_report_note',
        question: {
          ko: '최종 해석, 차이 원인, 후속 탐구 질문을 작성하세요.',
          en: 'Write the final interpretation, causes of differences, and a follow-up question.',
        },
        helperText: {
          ko: '주장할 수 있는 것과 주장할 수 없는 것을 각각 한 줄로 구분해 적어보세요.',
          en: 'Separate what you can claim from what you cannot — one line each.',
        },
      },
    ],
  },
];

export function createCommonInquirySteps(
  overrides: StepOverrides = {},
): InquiryStepConfig[] {
  return baseSteps.map((step) => {
    const override = overrides[step.id];
    if (!override) return step;
    return {
      ...step,
      ...override,
      questions: override.questions ?? step.questions,
      recordFields: override.recordFields ?? step.recordFields,
    };
  });
}

export function makePrompt(id: string, ko: string, en: string): { id: string; question: LocalizedText } {
  return { id, question: { ko, en } };
}
