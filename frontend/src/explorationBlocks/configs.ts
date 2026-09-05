import {
  CLUSTER_MODULE_IMAGE,
  KMT_MODULE_IMAGE,
  TESS_MODULE_IMAGE,
} from '../data/imageSources';
import { createCommonInquirySteps, makePrompt } from './commonSteps';
import type { ExplorationModuleConfig, ModuleId } from './types';

export const exoplanetTransitModule: ExplorationModuleConfig = {
  id: 'exoplanet-transit',
  title: { ko: '외계행성 식현상 탐구블럭', en: 'Exoplanet Transit Block' },
  subtitle: {
    ko: 'TESS 공개 관측자료로 밝기 감소를 측정하고 NASA 기준값과 비교합니다.',
    en: 'Measure brightness dips from public TESS observations and compare with NASA reference values.',
  },
  description: {
    ko: '대상 선택, TESS sector cutout 확인, 차등측광, 식현상 모델 적합, NASA Exoplanet Archive 비교를 하나의 공통 탐구 흐름 안에서 수행합니다.',
    en: 'Select a target, inspect TESS sector cutouts, run differential photometry and transit fitting, then compare with NASA Exoplanet Archive values inside the shared inquiry flow.',
  },
  image: TESS_MODULE_IMAGE,
  imageAlt: { ko: 'TESS 우주망원경 이미지', en: 'TESS space telescope image' },
  tags: ['TESS', 'Light curve', 'Transit fit'],
  dataSource: {
    name: { ko: 'NASA TESS / MAST + NASA Exoplanet Archive', en: 'NASA TESS / MAST + NASA Exoplanet Archive' },
    provider: { ko: 'NASA, STScI MAST', en: 'NASA, STScI MAST' },
    description: {
      ko: 'TESS 전천 관측 sector 자료에서 target pixel cutout을 가져오고, 외계행성 기준값은 NASA Exoplanet Archive 기반 대상 목록에서 확인합니다.',
      en: 'Target pixel cutouts are loaded from TESS sector observations, while reference exoplanet values come from the NASA Exoplanet Archive-backed target list.',
    },
    archiveUrl: 'https://mast.stsci.edu/',
    accessMethod: {
      ko: '백엔드가 MAST cutout 다운로드, 캐시, 차등측광, transit fit을 자동 수행합니다.',
      en: 'The backend automates MAST cutout download, caching, differential photometry, and transit fitting.',
    },
    provenanceNote: {
      ko: '자동화된 계산이더라도 sector, aperture, 비교성, ROI, 모델 가정은 화면에 노출됩니다.',
      en: 'Even with automation, sector, aperture, comparison stars, ROI, and model assumptions remain visible.',
    },
  },
  learningGoals: [
    {
      ko: '식현상 광도곡선에서 밝기 감소와 행성-별 반지름비의 관계를 설명한다.',
      en: 'Explain the relationship between transit depth and planet-to-star radius ratio.',
    },
    {
      ko: '비교성 품질, aperture, ROI 선택이 분석값에 미치는 영향을 근거로 평가한다.',
      en: 'Evaluate how comparison-star quality, aperture, and ROI selection affect derived values.',
    },
    {
      ko: 'NASA 기준값과 측정값의 차이를 자료 품질과 모델 가정으로 해석한다.',
      en: 'Interpret differences from NASA reference values using data quality and model assumptions.',
    },
  ],
  steps: createCommonInquirySteps({
    step0_intro: {
      questions: [
        makePrompt(
          'transit_intro_question',
          '별빛 감소만으로 행성의 상대적 크기를 얼마나 신뢰성 있게 추정할 수 있을까?',
          'How reliably can we estimate a planet-to-star radius ratio from a brightness dip?',
        ),
      ],
    },
    step1_select: {
      questions: [
        makePrompt(
          'transit_target_reason',
          '식현상이 잘 드러나는 TESS 대상은 어떤 조건(밝기·식 깊이·공전 주기)을 갖춰야 할까?',
          'What conditions (brightness, transit depth, orbital period) make a TESS target good for observing transits?',
        ),
      ],
    },
    step2_metadata: {
      selfChecks: [
        {
          id: 'tr_meta_sc1',
          type: 'ox',
          question: { ko: '위 화면의 등급 값이 작을수록 더 밝은 별이고, 밝은 별일수록 같은 시간에 받는 빛이 많아 곡선이 덜 흔들린다.', en: 'On the screen above, a smaller magnitude means a brighter star, and a brighter star collects more light in the same time, so its curve wobbles less.' },
          correct: 'O',
          explanation: { ko: '등급은 숫자가 작을수록 밝습니다. 화면의 대상 등급을 확인해 보세요. 밝은 별일수록 받는 빛이 많아 밝기 변화를 재기 쉽습니다.', en: 'Magnitude runs backwards: smaller is brighter. Check the target magnitude on the screen. More light makes a brightness change easier to measure.' },
        },
        {
          id: 'tr_meta_sc2',
          type: 'ox',
          question: { ko: 'TESS는 픽셀이 커서 주변 별빛이 섞이면(blending) 측정한 식 깊이가 실제보다 얕게 나올 수 있다.', en: 'Because TESS pixels are large, blending from nearby stars can make the measured transit depth shallower than the true value.' },
          correct: 'O',
          explanation: { ko: '주변 별빛이 신호를 희석해서 식 깊이가 실제보다 얕게 나옵니다.', en: 'Blended light dilutes the signal, biasing the depth low.' },
        },
      ],
    },
    step3_analysis_conditions: {
      selfChecks: [
        {
          id: 'tr_cond_sc1',
          type: 'ox',
          question: { ko: '측광 구경(aperture)은 크게 잡을수록 더 정확하다.', en: 'A larger photometry aperture gives a more accurate measurement.' },
          correct: 'X',
          explanation: { ko: '너무 키우면 주변 별·배경이 섞여 오히려 잡음이 커집니다 — 적정 크기가 중요합니다.', en: 'Too large an aperture lets in nearby stars and background, raising noise; the right size matters.' },
        },
      ],
    },
    // Step 5 는 원래 생각해보기가 없었다. 현장 전문가 검토 최저점(역채점 3.42)이
    // 이 화면이었고 보완 요구도 1위였는데, 그 요구를 "화면이 원인을 설명해 준다"로
    // 풀면 결과 해석의 학습자 수행(원리 4)을 침범한다 — 도움을 늘릴수록 학습이
    // 얕아지는 도움의 딜레마(Koedinger & Aleven, 2007). 그래서 인과는 화면에서
    // 빼고 여기로 옮겼다. 학습자가 먼저 답한 뒤에 해설이 열린다.
    step5_compare: {
      selfChecks: [
        {
          id: 'tr_cmp_sc1',
          type: 'ox',
          question: {
            ko: '측정값과 문헌값의 차이가 측정 오차(1σ)보다 작으면, 그 차이는 오차 범위 안에 있다고 볼 수 있다.',
            en: 'If the gap between your value and the reference is smaller than the 1σ error, it lies within the measurement error.',
          },
          correct: 'O',
          explanation: {
            ko: '그래서 화면은 차이를 "오차의 몇 배"로 함께 보여 줍니다. 1배 안쪽이면 오차로 설명되고, 3배를 넘으면 오차만으로는 설명이 안 되어 원인을 따로 찾아야 합니다.',
            en: 'That is why the screen also shows the gap in units of σ. Within 1σ it is explained by error; beyond 3σ it needs a separate explanation.',
          },
        },
        {
          id: 'tr_cmp_sc2',
          type: 'choice',
          question: {
            ko: '비교성이 적거나 비교성들의 산포가 크면 측정 결과는 어떻게 될 가능성이 높은가?',
            en: 'If there are few comparison stars, or their scatter is large, what is likely to happen to the measurement?',
          },
          options: [
            { ko: '밝기 기준이 흔들려 측정값의 오차가 커진다', en: 'The brightness baseline wobbles, so the measurement error grows' },
            { ko: '식 깊이가 항상 실제보다 깊게 나온다', en: 'The transit depth always comes out deeper than it really is' },
            { ko: '공전 주기가 짧게 계산된다', en: 'The orbital period is computed as shorter' },
          ],
          correctIndex: 0,
          explanation: {
            ko: '비교성은 밝기의 기준선 역할을 합니다. 수가 적거나 각자 흔들리면 기준선 자체가 흔들려 측정 오차가 커집니다. 방향이 한쪽으로 치우치는 것이 아니라 산포가 커지는 것이라, 깊이가 늘 깊어지거나 주기가 달라지는 것은 아닙니다. 화면의 "내가 쓴 분석 조건"에서 본인 값을 확인해 보세요.',
            en: 'Comparison stars set the brightness baseline. Fewer or noisier ones make that baseline wobble, so the error grows — it scatters rather than biasing one way, so depth does not always deepen and the period is unaffected. Check your own values in "My analysis settings".',
          },
        },
      ],
    },
    // Step 4 embeds the Lab, and the Lab's own StepGuide already asks about the
    // fit (fit_q1~3 in TransitLab). A block-level ROI self-check here rendered a
    // second 생각해보기 on the same screen — the duplicate the user flagged. The
    // block adds none of its own; the Lab owns the questions in this step.
    // Field ids match backend/survey_templates/transit_record.json question ids
    // 1:1 — the block's Step 6 IS the record form now (the Lab's record step was
    // removed), and the save panel submits these answers to that template.
    step6_reflect: {
      recordFields: [
        {
          id: 'transit_visible',
          required: true,
          input: 'radio',
          question: {
            ko: '광도곡선에서 식현상으로 보이는 밝기 감소가 확인되는가?',
            en: 'Is a transit-like dip visible in the light curve?',
          },
          options: [
            { value: 'clear', label: { ko: '예, 뚜렷하게 보인다', en: 'Yes, clearly visible' } },
            { value: 'possible', label: { ko: '식현상일 가능성이 있다', en: 'Possibly visible' } },
            { value: 'unclear', label: { ko: '불분명하거나 잡음이 많다', en: 'Unclear / noisy' } },
            { value: 'not_seen', label: { ko: '뚜렷한 밝기 감소가 보이지 않는다', en: 'No obvious dip' } },
          ],
        },
        {
          id: 'issues_observed',
          input: 'checkbox',
          question: {
            ko: '분석 과정에서 확인한 문제를 선택하세요.',
            en: 'What issues did you notice?',
          },
          options: [
            { value: 'few_comparisons', label: { ko: '적절한 비교성이 부족함', en: 'Too few good comparison stars' } },
            { value: 'blended_field', label: { ko: '주변 별빛에 오염됨', en: 'Nearby stars appear blended' } },
            { value: 'noisy_curve', label: { ko: '광도곡선 잡음이 큼', en: 'Light curve is noisy' } },
            { value: 'field_too_small', label: { ko: '분석 시야가 너무 좁음', en: 'Field of view felt too small' } },
            { value: 'none', label: { ko: '뚜렷한 문제 없음', en: 'No major issues' } },
          ],
        },
        {
          id: 'reference_comparison',
          required: true,
          question: {
            ko: '측정값은 NASA Exoplanet Archive 기준값과 어떻게 다른가? 차이의 원인은 무엇인가?',
            en: 'How does your measured result compare with the NASA reference value, and what causes the difference?',
          },
          helperText: {
            // 공전 주기는 비교 대상에서 뺐다: 앱이 계산하지 않고 아카이브 값을 그대로
            // 쓰므로 '주기를 비교하라'는 건 모순이다. Rp/R*·식 깊이만 비교 대상.
            //
            // 원인 목록을 여기서 뺐다. 종전 문구는 '비교성 품질·별빛 오염·구경 크기·
            // ROI·잡음·모델 가정'을 나열했고, 2026-07-24 조사에서 한 응답이 그 목록을
            // 글자 그대로 옮겨 적었다. 원인을 학습자가 댔는지 화면을 베꼈는지 구분할 수
            // 없으면 이 문항이 탐구 수행 산출물로 기능하지 못한다.
            ko: '먼저 Rp/R*와 식 깊이가 기준값과 얼마나 다른지 쓰고, 그 차이가 왜 생겼다고 보는지 이어서 쓰세요. 근거는 앞 단계에서 직접 보거나 설정한 값에서 찾으세요.',
            en: 'First write how far your Rp/R* and depth are from the reference, then why you think the gap arose. Draw your evidence from values you saw or set in the earlier steps.',
          },
        },
        {
          id: 'next_step',
          question: {
            ko: '분석을 다시 수행한다면 무엇을 바꾸겠는가?',
            en: 'If you repeated this analysis, what would you change?',
          },
          helperText: {
            ko: '예: 시야 확대, 비교성 변경, 다른 Sector 분석',
            en: 'e.g., a wider field, different comparison stars, another sector',
          },
        },
      ],
    },
  }),
  metadataFields: [
    {
      id: 'mission',
      label: { ko: '관측 임무', en: 'Mission' },
      value: 'TESS',
      description: { ko: '전천 외계행성 탐색 위성', en: 'All-sky exoplanet survey satellite' },
    },
    {
      id: 'cadence',
      label: { ko: '자료 단위', en: 'Data unit' },
      value: { ko: 'Sector별 target pixel cutout', en: 'Target pixel cutout by sector' },
    },
    {
      id: 'reference',
      label: { ko: '기준값 출처', en: 'Reference source' },
      value: 'NASA Exoplanet Archive',
    },
  ],
  analysisConfig: {
    adapterKey: 'exoplanet-transit',
    method: { ko: '차등측광 + 식현상 모델 적합', en: 'Differential photometry + transit model fit' },
    automaticTasks: [
      { ko: 'TESS cutout 다운로드와 캐시', en: 'TESS cutout download and caching' },
      { ko: '목표별/비교성 aperture photometry', en: 'Target and comparison-star aperture photometry' },
      { ko: '광도곡선 생성과 transit model fit', en: 'Light-curve generation and transit model fit' },
    ],
    parameters: [
      {
        id: 'aperture',
        label: { ko: '측광 구경·배경 고리', en: 'Aperture and sky annulus' },
        value: { ko: '기본 r=2.5px — 다음 단계에서 직접 조절', en: 'Default r=2.5px — you adjust it in the next step' },
        adjustable: true,
        description: { ko: '별 주위 원 안의 빛을 더해 밝기를 재고, 고리에서 잰 배경을 뺍니다.', en: 'Light inside the circle is summed; sky measured in the ring is subtracted.' },
      },
      {
        id: 'fit_roi',
        label: { ko: '분석 구간 (ROI)', en: 'Fit range (ROI)' },
        value: { ko: '식 전후가 함께 들어가게 다음 단계에서 직접 선택', en: 'You pick it in the next step — include time before and after the dip' },
        adjustable: true,
      },
      {
        id: 'model',
        label: { ko: '모델', en: 'Model' },
        value: { ko: '행성이 별을 가리는 밝기 변화 곡선을 데이터에 맞춥니다 (batman 모델)', en: 'Fits the transit dimming curve to your data (batman model)' },
        adjustable: false,
      },
    ],
    assumptions: [
      { ko: '여러 비교성의 평균을 기준 삼아, 목표별의 진짜 밝기 변화만 남깁니다.', en: 'Several comparison stars are averaged so only the target’s real variation remains.' },
      { ko: '적합 결과는 어떤 구간(ROI)을 골랐는지에 따라 달라질 수 있습니다.', en: 'The fitted values can change with the range (ROI) you choose.' },
      { ko: '카탈로그 값은 비교 기준일 뿐, 절대 정답이 아닙니다.', en: 'Catalog values are a benchmark for comparison, not the “right answer”.' },
    ],
    qualitySignals: [
      { ko: '비교성 RMS/MAD', en: 'Comparison-star RMS/MAD' },
      { ko: 'retained/clipped points', en: 'Retained/clipped points' },
      { ko: 'reduced chi-squared and residual RMS', en: 'Reduced chi-squared and residual RMS' },
    ],
  },
  visualizationConfig: {
    primaryView: { ko: 'TESS cutout, 차등 광도곡선, transit fit overlay', en: 'TESS cutout, differential light curve, transit-fit overlay' },
    layers: [
      { ko: '목표별과 비교성 aperture overlay', en: 'Target and comparison aperture overlay' },
      { ko: 'BTJD/phase 광도곡선', en: 'BTJD/phase light curve' },
      { ko: '모델 곡선과 residual', en: 'Model curve and residuals' },
    ],
    interpretationCues: [
      { ko: 'dip의 깊이와 시간 구간', en: 'Dip depth and interval' },
      { ko: '비교성 품질이 나쁜 경우의 흔들림', en: 'Instability from low-quality comparison stars' },
      { ko: '모델 residual의 구조적 패턴', en: 'Structured patterns in model residuals' },
    ],
  },
  comparisonConfig: {
    referenceSource: 'NASA Exoplanet Archive',
    comparisonValues: [
      { id: 'depth', label: { ko: '식 깊이 (transit depth)', en: 'Transit depth' }, value: { ko: '카탈로그 depth와 측정 depth 비교', en: 'Catalog depth compared with measured depth' } },
      { id: 'rp_rs', label: { ko: '반지름비 Rp/R*', en: 'Radius ratio Rp/R*' }, value: { ko: 'sqrt(depth) 기준값과 fit 결과 비교', en: 'sqrt(depth) reference compared with fit result' } },
      { id: 'period', label: { ko: '공전 주기', en: 'Orbital period' }, value: { ko: '카탈로그 주기와 fit 주기 비교', en: 'Catalog period compared with fitted period' } },
    ],
    qualityCriteria: [
      { ko: '비교성 RMS가 큰 별은 기준 flux를 불안정하게 만든다.', en: 'High comparison-star RMS makes the reference flux unstable.' },
      { ko: 'TESS pixel scale은 주변별 blending 가능성을 만든다.', en: 'The TESS pixel scale can introduce blending from nearby stars.' },
      { ko: 'χ²_red와 residual은 해석 근거이지 단독 판정값이 아니다.', en: 'χ²_red and residuals are evidence, not a single verdict.' },
    ],
    interpretationRule: {
      ko: '측정값이 기준값과 다르면 비교성 품질, blending, aperture, ROI, noise, 모델 가정을 근거로 설명한다.',
      en: 'When measured values differ from references, explain the difference through comparison quality, blending, aperture, ROI, noise, and model assumptions.',
    },
  },
  // Emptied on purpose: the two former prompts (uncertainty source, claim
  // limits) are covered by the typed Step 6 record fields above — keeping both
  // meant answering the same question twice on one screen.
  reflectionQuestions: [],
  teacherNotes: [
    { ko: '정답 수치보다 차이 원인을 자료와 조건으로 설명하는 활동에 초점을 둔다.', en: 'Focus on explaining differences through data and conditions rather than matching a single numeric answer.' },
    { ko: '권장 설정으로 시작하고, 익숙해지면 구경과 ROI를 바꿔 결과가 어떻게 달라지는지 비교해 본다.', en: 'Start with the recommended settings; once comfortable, change the aperture and ROI to compare how results shift.' },
  ],
  classroomUse: {
    suggestedTime: { ko: '45~90분', en: '45-90 minutes' },
    level: { ko: '고등학교 심화 / 대학 교양 / 시민과학 입문', en: 'Advanced secondary, introductory college, citizen-science entry' },
    grouping: { ko: '2~3인 모둠 또는 개인 탐구', en: 'Pairs, small groups, or individual work' },
    teacherNotes: [
      { ko: 'Step 5에서 기준값과 다르다는 사실 자체보다 차이 원인 설명을 평가한다.', en: 'Assess the explanation of differences in Step 5, not just whether values match.' },
    ],
  },
  entry: {
    href: '/modules/exoplanet-transit',
    label: { ko: '외계행성 탐구 시작', en: 'Start Transit Inquiry' },
    helperText: {
      ko: '대상을 고르면 차등측광과 식현상 모델 적합 분석으로 바로 이어집니다.',
      en: 'Once you pick a target, it leads straight into differential photometry and transit-fit analysis.',
    },
  },
};

export const clusterCmdModule: ExplorationModuleConfig = {
  id: 'cluster-cmd',
  title: { ko: '성단 CMD 탐구블럭', en: 'Cluster CMD Block' },
  subtitle: {
    ko: '측광표에서 색지수와 등급을 계산해 성단의 나이와 거리 단서를 해석합니다.',
    en: 'Use photometry tables to compute color index and magnitude, then interpret cluster age and distance clues.',
  },
  description: {
    ko: '성단 구성원의 Gaia DR3 측광 자료를 색-등급도(CMD)로 시각화하고, 주계열·전향점으로 성단의 나이와 거리 단서를 해석하는 탐구블럭입니다.',
    en: 'Visualize Gaia DR3 photometry of cluster members as a color-magnitude diagram and interpret age and distance clues from the main sequence and turn-off.',
  },
  image: CLUSTER_MODULE_IMAGE,
  imageAlt: { ko: '플레이아데스 성단 (M45)', en: 'Pleiades star cluster (M45)' },
  imageCredit: { ko: '사진: NASA/ESA/AURA·Caltech', en: 'Photo: NASA/ESA/AURA·Caltech' },
  tags: ['CMD', 'Photometry table', 'Isochrone'],
  dataSource: {
    name: { ko: 'ESA Gaia DR3 측광 카탈로그', en: 'ESA Gaia DR3 photometric catalog' },
    provider: { ko: 'ESA Gaia (gaiadr3.gaia_source)', en: 'ESA Gaia (gaiadr3.gaia_source)' },
    description: {
      ko: '성단 중심 주변의 Gaia DR3 구성원을 시차·고유운동으로 선별하고, BP-RP 색지수와 G 등급을 CMD에 사용합니다.',
      en: 'Selects Gaia DR3 members around the cluster center by parallax and proper motion, using BP-RP color and G magnitude for the CMD.',
    },
    accessMethod: {
      ko: '백엔드가 Gaia TAP cone search로 구성원 측광을 자동 호출하고 캐시합니다.',
      en: 'The backend runs a Gaia TAP cone search to fetch member photometry on demand and caches it.',
    },
    provenanceNote: {
      ko: '필터, 보정 여부, 구성원 선별 기준이 CMD 해석에 반드시 표시되어야 합니다.',
      en: 'Filters, calibration status, and membership criteria must remain visible for CMD interpretation.',
    },
  },
  learningGoals: [
    { ko: '색지수와 등급으로 CMD를 구성한다.', en: 'Construct a CMD from color index and magnitude.' },
    { ko: '주계열, 전향점, 거성가지 등 형태적 단서를 해석한다.', en: 'Interpret main sequence, turnoff, and giant-branch clues.' },
    { ko: '등시선 또는 참고 CMD와의 차이를 보정과 구성원 선별 관점에서 설명한다.', en: 'Explain differences from isochrones or references through calibration and membership selection.' },
  ],
  steps: createCommonInquirySteps({
    step0_intro: {
      questions: [
        makePrompt('cmd_intro_phenomenon', '성단의 별들은 거의 같은 시기에 태어났다고 가정한다. 그렇다면 색-등급도(CMD)의 모양만으로 성단의 나이와 거리를 어디까지 알 수 있을까?', 'Cluster stars are assumed to have formed at nearly the same time. How far can the shape of a color-magnitude diagram (CMD) alone reveal the age and distance of a cluster?'),
        makePrompt('cmd_intro_mainseq', '같은 성단의 별들이 CMD에서 하나의 주계열을 이루는 이유는 무엇일까?', 'Why do stars in the same cluster form a single main sequence on the CMD?'),
      ],
    },
    step1_select: {
      questions: [
        makePrompt('cmd_select_reason', '이 성단을 선택한 이유는 무엇인가? 나이 비교용 한 쌍인지, 거리를 구하기 좋은 가까운 성단인지 밝혀보라.', 'Why did you choose this cluster - as a pair for age comparison, or a nearby cluster suited to a distance estimate?'),
      ],
    },
    step2_metadata: {
      questions: [
        makePrompt('cmd_meta_color', '색지수 정의(예: BP-RP)와 사용 필터는 무엇인가? 다른 필터를 쓰면 CMD가 어떻게 달라질까?', 'What is the color-index definition (e.g., BP-RP) and which filters are used? How would a different filter change the CMD?'),
        makePrompt('cmd_meta_membership', '구성원을 어떤 기준(시차·고유운동)으로 선별했는가? 배경별이 섞이면 CMD에 어떤 흔적이 남을까?', 'By what criteria (parallax and proper motion) were members selected? What trace would contaminating field stars leave on the CMD?'),
      ],
      selfChecks: [
        {
          id: 'cmd_meta_sc1',
          type: 'ox',
          question: { ko: '위 표에서 BP−RP 값이 큰 별은 붉은 별이다.', en: 'In the table above, a star with a larger BP−RP is a redder star.' },
          correct: 'O',
          explanation: { ko: 'BP는 파란 쪽, RP는 붉은 쪽에서 잰 밝기입니다. 붉은 별은 붉은 쪽이 더 밝아 BP−RP가 커집니다. Step 4의 색-등급도에서도 오른쪽으로 갈수록 붉은 점입니다.', en: 'BP is measured on the blue side and RP on the red side, so a red star is brighter in RP and BP−RP grows. On the Step 4 diagram, points further right are redder.' },
        },
              ],
    },
    step3_analysis_conditions: {
      questions: [
        makePrompt('cmd_cond_membership', '구성원 선별 기준을 엄격하게 또는 느슨하게 바꾸면 주계열의 두께와 배경 산포가 어떻게 변할 것으로 예상하는가?', 'If you make the membership test stricter or looser, how do you expect the main-sequence width and background scatter to change?'),
        makePrompt('cmd_cond_extinction', '성간 소광(적색화) 보정을 하지 않으면 CMD는 색·등급 방향으로 어느 쪽으로 이동하는가?', 'Without interstellar extinction (reddening) correction, in which color and magnitude direction does the CMD shift?'),
      ],
      selfChecks: [
{
          id: 'cmd_meta_sc2',
          type: 'ox',
          question: { ko: '구성원 선별을 느슨하게 하면 배경별이 섞여 주계열 띠가 두꺼워진다.', en: 'Loosening membership selection lets field stars in and broadens the main-sequence band.' },
          correct: 'O',
          explanation: { ko: '오염된 배경별이 CMD에 흩어져 띠를 두껍게 만듭니다.', en: 'Contaminating field stars scatter across the CMD, widening the band.' },
        },
                {
          id: 'cmd_cond_sc2',
          type: 'choice',
          question: { ko: '구성원 선별 기준을 엄격하게 하면 CMD가 어떻게 변할까?', en: 'If you make the membership test stricter, how does the CMD change?' },
          options: [
            { ko: '주계열이 더 또렷해지지만 별 수는 줄어든다', en: 'The main sequence sharpens, but fewer stars remain' },
            { ko: '별 수가 늘어난다', en: 'More stars are included' },
            { ko: '변화가 없다', en: 'Nothing changes' },
          ],
          correctIndex: 0,
          explanation: { ko: '엄격한 기준은 순수도를 높이지만 표본 수는 줄입니다.', en: 'A stricter cut raises purity but shrinks the sample.' },
        },
      ],
    },
    step4_run_visualize: {
      questions: [
        makePrompt('cmd_vis_features', 'CMD에서 주계열·전향점(turn-off)·(있다면) 거성가지를 찾아 표시하라. 전향점은 무엇을 의미하는가?', 'Locate the main sequence, the turn-off, and (if present) the giant branch on the CMD. What does the turn-off signify?'),
        makePrompt('cmd_vis_axes', '축을 확인하라 - 등급 축은 위로 갈수록 밝은(작은 수)인가? 색지수가 클수록 별의 표면온도는 어떻게 되는가?', 'Check the axes - does brighter (smaller magnitude) point upward? As the color index increases, what happens to the surface temperature of a star?'),
      ],
      selfChecks: [
        {
          id: 'cmd_run_sc1',
          type: 'choice',
          question: {
            ko: '등시선을 별들에 겹칠 때, 거리계수 m−M만 키우면 곡선은 어떻게 움직이는가?',
            en: 'While overlaying the isochrone, what happens if you raise only the distance modulus m−M?',
          },
          options: [
            { ko: '곡선 전체가 아래(어두운 쪽)로 내려간다', en: 'The whole curve slides down, toward fainter' },
            { ko: '곡선이 오른쪽(붉은 쪽)으로만 움직인다', en: 'The curve moves only to the right, toward redder' },
            { ko: '전향점의 위치만 바뀌고 나머지는 그대로다', en: 'Only the turn-off moves; the rest stays put' },
          ],
          correctIndex: 0,
          explanation: {
            ko: '거리계수는 같은 별이 얼마나 어둡게 보이는지를 정하므로 곡선 전체가 위아래로만 움직입니다. 색은 그대로입니다. 슬라이더를 직접 움직여 확인해 보세요 — 색을 바꾸는 것은 소광과 금속함량이고, 전향점을 옮기는 것은 나이입니다.',
            en: 'The distance modulus sets how faint the same star looks, so the curve only slides vertically; colour is unchanged. Try the slider — colour is moved by extinction and metallicity, and the turn-off by age.',
          },
        },
        {
          id: 'cmd_cond_sc1',
          type: 'ox',
          question: { ko: '성간 소광(적색화)을 보정하지 않으면 CMD가 더 붉고 어두운 쪽으로 치우친다.', en: 'Without reddening correction, the CMD is shifted toward redder and fainter.' },
          correct: 'O',
          explanation: { ko: '소광은 별을 어둡게 + 붉게 만들어 CMD를 그 방향으로 밀어냅니다.', en: 'Extinction dims and reddens stars, pushing the CMD that way.' },
        },
      ],
    },
    step5_compare: {
      questions: [
        makePrompt('cmd_cmp_age', '두 성단의 전향점 위치를 비교하라. 전향점이 더 어두운 성단이 더 늙은 성단인 이유를 질량-수명 관계로 설명하고, 문헌 나이값과 네 판단이 일치하는지 확인하라.', 'Compare the turn-off positions of the two clusters. Using the mass-lifetime relation, explain why the cluster with the fainter turn-off is older, and check whether your judgment agrees with literature ages.'),
        makePrompt('cmd_cmp_distance', '등시선을 별들에 겹쳤을 때의 거리계수 m-M으로 거리를 구하고(r = 10^((m-M+5)/5)), Gaia 시차 거리와 문헌 거리에 각각 얼마나 가까운지 확인하라. 소광 A_V를 올리면 같은 겹침을 더 작은 m-M으로도 만들 수 있다. 어느 쪽이 맞는지 무엇으로 가르겠는가?', 'From the distance modulus m-M of your isochrone overlay compute the distance (r = 10^((m-M+5)/5)) and check how close it is to the Gaia parallax distance and to the literature value. Raising A_V lets a smaller m-M produce the same overlay. What would tell the two apart?'),
      ],
      selfChecks: [
        {
          id: 'cmd_cmp_sc1',
          type: 'ox',
          question: {
            ko: '등시선의 나이를 늘리면 주계열 전향점은 더 어둡고 붉은 쪽으로 내려간다.',
            en: 'Increasing the isochrone age moves the main-sequence turn-off fainter and redder.',
          },
          correct: 'O',
          explanation: {
            ko: '무거운 별이 먼저 주계열을 떠나므로, 나이가 들수록 주계열에 남은 가장 밝은 별이 점점 어둡고 붉은 별로 바뀝니다. 전향점의 위치가 곧 나이의 잣대입니다.',
            en: 'Massive stars leave the main sequence first, so with age the brightest star still on it becomes fainter and redder. The turn-off position is the age indicator.',
          },
        },
        {
          id: 'cmd_cmp_sc2',
          type: 'choice',
          question: {
            ko: '거리계수 m-M은 그대로 두고 소광 A_V만 올리면 등시선은 어떻게 움직이는가?',
            en: 'If you keep m-M fixed and only raise A_V, how does the isochrone move?',
          },
          options: [
            { ko: '색은 붉어지고 등급은 어두워져 대각선으로 움직인다', en: 'It moves diagonally: redder and fainter' },
            { ko: '등급만 어두워지고 색은 그대로다', en: 'Only fainter; colour unchanged' },
            { ko: '색만 붉어지고 등급은 그대로다', en: 'Only redder; magnitude unchanged' },
          ],
          correctIndex: 0,
          explanation: {
            ko: '먼지는 별빛을 흡수해 어둡게 하고, 파란빛을 더 많이 흡수해 붉게도 합니다. 그래서 소광과 거리는 세로 방향에서 서로 바꿔 맞출 수 있고, 색 방향의 차이로만 둘을 가릅니다.',
            en: 'Dust dims starlight and absorbs blue light more, so it also reddens. Extinction and distance therefore trade off vertically, and only the colour shift separates them.',
          },
        },
      ],
    },
    // Field ids match backend/survey_templates/cluster_record.json (v2) 1:1 —
    // Step 6 IS the record form. The Step 4 isochrone fit (age, m-M, A_V) is
    // shown in Step 5's comparison table; the cluster module does not pass
    // anonSubmit, so nothing from this block reaches the anonymous sheet yet.
    step6_reflect: {
      questions: [
        makePrompt('cmd_reflect_claim', '이번 CMD로 주장할 수 있는 것과 주장할 수 없는 것을 각각 하나씩 적어라.', 'Write one thing this CMD lets you claim, and one thing it does not.'),
      ],
      recordFields: [
        {
          id: 'distance_vs_parallax',
          required: true,
          input: 'radio',
          question: {
            ko: '주계열 맞춤으로 구한 거리와 Gaia 시차 거리는 얼마나 가까운가?',
            en: 'How does your fitted distance compare with the Gaia parallax distance?',
          },
          options: [
            { value: 'close', label: { ko: '가깝다 (~10% 이내)', en: 'Close (within ~10%)' } },
            { value: 'somewhat', label: { ko: '다소 다르다', en: 'Somewhat different' } },
            { value: 'far', label: { ko: '크게 다르다', en: 'Quite different' } },
          ],
        },
        {
          id: 'difference_cause',
          input: 'radio',
          question: {
            ko: '두 거리가 다르다면 가장 큰 원인은 무엇이라고 생각하는가?',
            en: 'If they differ, what is the most likely cause?',
          },
          options: [
            { value: 'extinction', label: { ko: '소광·적색화 보정', en: 'Extinction / reddening' } },
            { value: 'membership', label: { ko: '구성원 오염', en: 'Member contamination' } },
            { value: 'ms_assumption', label: { ko: '표준 주계열 가정', en: 'Standard-main-sequence assumption' } },
            { value: 'photometry', label: { ko: '측광 산포', en: 'Photometric scatter' } },
          ],
        },
        {
          id: 'analysis_note',
          required: true,
          question: {
            ko: '주계열과 전향점이 이 성단의 거리·나이에 대해 말해주는 것을 근거와 함께 정리하세요.',
            en: 'What did the main sequence and turn-off tell you about distance and age? Give your evidence.',
          },
          helperText: {
            ko: '교과서의 이상화된 CMD와 실제 자료 CMD가 어떻게 달랐는지, 구성원 선별 기준을 바꾸면 결과가 얼마나 민감했는지도 한 줄씩 적어보세요.',
            en: 'Also note how the real-data CMD differed from the idealized textbook figure, and how sensitive the result was to the membership cut.',
          },
        },
        {
          id: 'next_step',
          question: {
            ko: '이 탐구를 이어간다면 무엇을 하겠는가?',
            en: 'If you continued this investigation, what would you do next?',
          },
          helperText: {
            ko: '예: 소광 보정 확인, 다른 성단과 나이 비교, 구성원 선별 기준 변경',
            en: 'e.g., check the extinction correction, compare ages with another cluster, change the membership cut',
          },
        },
      ],
    },
  }),
  metadataFields: [
    { id: 'table', label: { ko: '자료 형식', en: 'Data format' }, value: { ko: '측광 카탈로그(표)', en: 'Photometry catalog (table)' } },
    { id: 'columns', label: { ko: '사용 열', en: 'Columns used' }, value: 'source_id, phot_g_mean_mag, bp_rp, parallax' },
    { id: 'status', label: { ko: '연결 상태', en: 'Connection status' }, value: { ko: 'Gaia DR3 라이브', en: 'Gaia DR3 live' } },
  ],
  analysisConfig: {
    adapterKey: 'cluster-cmd',
    method: { ko: '색지수 계산 + CMD 시각화', en: 'Color-index calculation + CMD visualization' },
    automaticTasks: [
      { ko: '측광표 유효성 검사', en: 'Validate photometry table' },
      { ko: '색지수 계산', en: 'Compute color index' },
      { ko: 'CMD plot과 기준선 overlay 생성', en: 'Generate CMD plot and reference overlay' },
    ],
    parameters: [
      { id: 'color_index', label: { ko: '색지수', en: 'Color index' }, value: 'Gaia BP-RP', adjustable: false },
      { id: 'membership_cut', label: { ko: '성단 구성원 선별', en: 'Cluster membership selection' }, value: { ko: '시차·고유운동 기반', en: 'Parallax + proper motion' }, adjustable: false },
      { id: 'extinction', label: { ko: '소광 보정', en: 'Extinction correction' }, value: { ko: '수동 확인', en: 'Manual review' }, adjustable: true },
    ],
    assumptions: [
      { ko: '선택된 별들이 성단 구성원이라는 가정이 CMD 형태에 영향을 준다.', en: 'Assuming selected stars are members affects the CMD shape.' },
      { ko: '소광과 거리 보정이 충분하지 않으면 기준 등시선과 어긋날 수 있다.', en: 'Insufficient extinction or distance correction can shift the CMD from reference isochrones.' },
    ],
    qualitySignals: [
      { ko: '측광 오차', en: 'Photometric error' },
      { ko: '성단 구성원 선별 기준', en: 'Cluster membership criteria' },
      { ko: 'outlier 비율', en: 'Outlier fraction' },
    ],
  },
  visualizationConfig: {
    primaryView: { ko: '색-등급도(CMD)', en: 'Color-magnitude diagram' },
    layers: [
      { ko: '성단 후보별 산점도', en: 'Candidate-member scatter plot' },
      { ko: '등시선 또는 참고 CMD overlay', en: 'Isochrone or reference CMD overlay' },
      { ko: '오차막대와 outlier 표시', en: 'Error bars and outlier flags' },
    ],
    interpretationCues: [
      { ko: '주계열 폭', en: 'Main-sequence width' },
      { ko: '전향점 위치', en: 'Turnoff position' },
      { ko: '배경별 오염 가능성', en: 'Possible field-star contamination' },
    ],
  },
  comparisonConfig: {
    referenceSource: { ko: 'PARSEC 등시선 맞춤과 Cantat-Gaudin 외(2020) 표 1', en: 'PARSEC isochrone fit and Cantat-Gaudin et al. (2020) Table 1' },
    comparisonValues: [
      { id: 'age', label: { ko: '나이', en: 'Age' }, value: { ko: '등시선 나이와 문헌 나이 비교', en: 'Isochrone age vs literature age' } },
      { id: 'distance', label: { ko: '거리계수 m-M', en: 'Distance modulus m-M' }, value: { ko: '등시선 거리, Gaia 시차 거리, 문헌 거리 비교', en: 'Isochrone distance vs parallax vs literature' } },
      { id: 'extinction', label: { ko: '소광 A_V', en: 'Extinction A_V' }, value: { ko: '맞춘 소광과 문헌 소광 비교', en: 'Fitted vs literature extinction' } },
    ],
    qualityCriteria: [
      { ko: '구성원 선별이 불량하면 주계열이 두꺼워진다.', en: 'Poor membership selection broadens the main sequence.' },
      { ko: '소광 보정이 부정확하면 CMD가 색/등급 방향으로 이동한다.', en: 'Incorrect extinction correction shifts the CMD in color and magnitude.' },
    ],
    interpretationRule: {
      ko: 'CMD 형태 차이는 곧바로 나이 차이로 결론내리지 말고 보정과 구성원 선별을 먼저 검토한다.',
      en: 'Do not treat CMD shape differences as age differences before checking calibration and membership selection.',
    },
  },
  // Emptied when Step 6 got typed record fields (same call as the transit
  // module): the cause question became the difference_cause field, and the
  // sensitivity/textbook prompts moved into analysis_note's helper text —
  // keeping them here rendered a second stack of note boxes on top of the form.
  reflectionQuestions: [],
  teacherNotes: [
    { ko: '같은 워크플로로 여러 성단(예: M35와 NGC2158)을 비교하며 전향점·나이 차이를 토의할 수 있다.', en: 'Use the same workflow to compare clusters (e.g., M35 vs NGC2158) and discuss turn-off and age differences.' },
  ],
  classroomUse: {
    suggestedTime: { ko: '45분', en: '45 minutes' },
    // [12행우03-01] is a high-school elective standard (행성우주과학), and the
    // manuscript states the curriculum basis sits at the high-school level.
    level: { ko: '고등학교 탐구 (행성우주과학) / 대학 교양', en: 'High-school inquiry (Planetary & Space Science) / introductory college' },
    grouping: { ko: '모둠별 성단 비교', en: 'Group comparison across clusters' },
    teacherNotes: [
      { ko: '여러 모둠이 서로 다른 구성원 기준을 적용하고 CMD 차이를 비교할 수 있다.', en: 'Groups can apply different membership cuts and compare CMD changes.' },
    ],
  },
  entry: {
    href: '/modules/cluster-cmd',
    label: { ko: '성단 CMD 탐구 시작', en: 'Start Cluster CMD' },
    helperText: {
      ko: '성단을 선택하면 Gaia DR3 측광으로 색-등급도를 그리고 단계별로 해석합니다.',
      en: 'Pick a cluster to draw its color-magnitude diagram from Gaia DR3 photometry and interpret it step by step.',
    },
  },
};

export const kmtnetModule: ExplorationModuleConfig = {
  id: 'kmtnet',
  title: { ko: 'KMTNet 미시중력렌즈 탐구블럭', en: 'KMTNet Microlensing Block' },
  subtitle: {
    ko: '다지점 광도곡선에서 미시중력렌즈 증광을 확인하고, 행성 아노말리로 외계행성을 찾습니다.',
    en: 'Confirm microlensing magnification in multi-site light curves and find exoplanets from planetary anomalies.',
  },
  description: {
    ko: 'KMTNet 세 관측소(CTIO·SAAO·SSO)가 차분측광으로 얻은 광도곡선을 모아, 미시중력렌즈로 배경별이 잠깐 밝아지는 증광 곡선을 확인하고 매끄러운 곡선 위의 짧은 행성 아노말리로 외계행성 후보를 찾는 탐구블럭입니다.',
    en: "Brings together difference-image-photometry light curves from KMTNet's three sites (CTIO·SAAO·SSO) to confirm microlensing magnification and search for exoplanet candidates from brief planetary anomalies on the smooth curve.",
  },
  image: KMT_MODULE_IMAGE,
  imageAlt: { ko: 'KMTNet 관측 네트워크 이미지', en: 'KMTNet observing network image' },
  tags: ['KMTNet', 'Microlensing', 'Light curve'],
  dataSource: {
    name: { ko: 'KASI KMTNet 미시중력렌즈 광도곡선', en: 'KASI KMTNet microlensing light curves' },
    provider: { ko: 'KASI KMTNet', en: 'KASI KMTNet' },
    description: {
      ko: '칠레·남아프리카·호주 세 관측소의 차분측광 광도곡선을 묶어 미시중력렌즈 이벤트의 증광과 행성 아노말리를 추적합니다.',
      en: 'Combines difference-image-photometry light curves from Chile, South Africa, and Australia to track microlensing magnification and planetary anomalies.',
    },
    accessMethod: {
      ko: '추후 KMTNet 이벤트 광도곡선 adapter 또는 수업용 샘플셋 연결',
      en: 'Future KMTNet event light-curve adapter or classroom sample-set connection',
    },
    provenanceNote: {
      ko: '관측소, 필터, 노출시간, 차분측광 기준 영상이 항상 표시되어야 합니다.',
      en: 'Site, filter, exposure time, and the difference-image reference should always remain visible.',
    },
  },
  learningGoals: [
    { ko: '미시중력렌즈로 배경별이 잠깐 밝아지는 원리(증광 곡선)를 설명한다.', en: 'Explain how microlensing briefly brightens a background star (the magnification curve).' },
    { ko: '매끄러운 단일렌즈 곡선과 행성이 만드는 짧은 아노말리를 구분한다.', en: 'Distinguish a smooth single-lens curve from the brief anomaly a planet produces.' },
    { ko: '혼잡한 별밭에서 차분측광으로 밝기 변화를 측정하는 이유를 설명한다.', en: 'Explain why difference-image photometry is used to measure brightness changes in crowded fields.' },
  ],
  steps: createCommonInquirySteps({
    // 이 override 가 없어서 공통 문구('이 탐구에서 관측 자료로 설명하려는 현상은
    // 무엇인가?')가 홈 카드의 대표 탐구 질문 자리에 그대로 노출되고 있었다.
    // 다른 두 모듈과 같은 꼴로 세운다 — [관측된 자료]만으로 [천체의 물리량]을 어디까지
    // 알 수 있을까. 여기서 자료는 증광 곡선이고, 얻으려는 값은 보이지 않는 렌즈 천체의
    // 질량·거리, 그리고 곡선 위 이상신호가 행성인지 여부다(Lab 에서 u₀·tE 를 적합한다).
    step0_intro: {
      questions: [
        makePrompt(
          'kmt_intro_lens',
          '별이 잠깐 밝아졌다 어두워진 곡선 하나만으로, 보이지 않는 렌즈 천체의 질량과 거리를 어디까지 알 수 있을까?',
          'From a single curve of a star brightening and fading, how far can we determine the mass and distance of an unseen lens object?',
        ),
        makePrompt(
          'kmt_intro_anomaly',
          '매끄러운 증광 곡선 위의 짧은 이상신호를 행성의 증거로 인정하려면 무엇을 확인해야 할까?',
          'What has to be checked before a brief anomaly on a smooth magnification curve counts as evidence of a planet?',
        ),
      ],
    },
    step1_select: {
      questions: [
        makePrompt('kmt_event_reason', '어떤 미시중력렌즈 이벤트(광도곡선)를 먼저 살펴볼 것인가?', 'Which microlensing event (light curve) will you inspect first?'),
      ],
    },
    step2_metadata: {
      selfChecks: [
        {
          id: 'kmt_meta_sc1',
          type: 'ox',
          question: { ko: '세 관측소(칠레·남아공·호주)는 경도가 달라, 한 곳이 낮이어도 다른 곳이 관측을 이어 짧은 행성 아노말리를 놓치지 않는다.', en: 'The three sites (Chile, South Africa, Australia) span longitudes, so when one is in daylight another keeps observing — so a brief planetary anomaly is not missed.' },
          correct: 'O',
          explanation: { ko: '관측소가 경도로 흩어져 있어 관측이 끊기지 않는 것이, 짧은 아노말리를 놓치지 않는 핵심입니다.', en: 'Continuous coverage from the longitude spread is key to catching brief anomalies.' },
        },
      ],
    },
    step3_analysis_conditions: {
      selfChecks: [
        {
          id: 'kmt_cond_sc1',
          type: 'ox',
          question: { ko: '별이 빽빽한 영역에서는 기준 영상을 빼는 차분측광으로 변하는 밝기만 뽑아 광도곡선을 만든다.', en: 'In crowded fields, difference-image photometry subtracts a reference image to extract only the changing flux for the light curve.' },
          correct: 'O',
          explanation: { ko: '차분측광(DIA)은 겹친 별들 속에서 변광 성분만 분리합니다.', en: 'Difference-image analysis isolates the variable component among blended stars.' },
        },
      ],
    },
    step4_run_visualize: {
      questions: [
        makePrompt('kmt_anomaly_signal', '광도곡선에서 매끄러운 증광 위에 행성 아노말리(짧은 이상신호)는 어디에 나타나는가?', 'Where on the smooth magnification does a planetary anomaly (brief deviation) appear?'),
      ],
      selfChecks: [
        {
          id: 'kmt_run_sc1',
          type: 'choice',
          question: {
            ko: '세 관측소의 자료를 그대로 이어 붙이면 곡선에 무엇이 생기는가?',
            en: 'If the three sites were simply concatenated as they are, what would appear in the curve?',
          },
          options: [
            { ko: '관측소마다 밝기 기준이 달라 이어지는 자리에 계단이 생긴다', en: 'Each site has its own brightness reference, so steps appear where they join' },
            { ko: '점의 개수가 세 배로 늘어 곡선이 두꺼워질 뿐이다', en: 'Only the point count triples, thickening the curve' },
            { ko: '시간 순서가 뒤섞여 피크가 두 번 나타난다', en: 'The time order scrambles and the peak appears twice' },
          ],
          correctIndex: 0,
          explanation: {
            ko: '같은 별이라도 관측소마다 망원경과 측광 기준이 달라 밝기의 영점이 어긋나 있습니다. 그래서 화면의 「플랫폼이 한 처리」에 적힌 대로, 이어 붙이기 전에 각 관측소를 하나의 기준에 맞춥니다. 시간 순서는 원래 자료에 들어 있어 뒤섞이지 않습니다.',
            en: 'The same star is measured against a different reference at each site, so the brightness zero-points disagree. That is why, as the "what the platform did" line says, each site is put onto one reference before merging. Time order comes with the data and does not scramble.',
          },
        },
        {
          id: 'kmt_run_sc2',
          type: 'ox',
          question: {
            ko: '화면에 적힌 점의 개수는 원본 자료의 모든 점이 아니라, 측광 오차가 큰 점을 뺀 뒤의 개수다.',
            en: 'The point count on the screen is not every point in the raw data, but what remains after the noisiest measurements are dropped.',
          },
          correct: 'O',
          explanation: {
            ko: '측광 오차가 0.3등급을 넘는 점은 빼고 셉니다. 오차가 큰 점을 남겨 두면 증광 곡선의 모양보다 잡음이 적합을 끌고 갑니다. 관측소를 켜고 끄며 점의 개수가 어떻게 변하는지도 확인해 보세요.',
            en: 'Points with a photometric error above 0.3 mag are removed before counting. Leaving them in lets noise, rather than the shape of the magnification, drive the fit. Toggle the sites and watch the count change.',
          },
        },
      ],
    },
    step5_compare: {
      selfChecks: [
        {
          id: 'kmt_cmp_sc1',
          type: 'ox',
          question: {
            ko: '아인슈타인 시간척도 t_E가 길게 측정되었다면, 그것만으로 렌즈의 질량을 바로 정할 수 있다.',
            en: 'A long Einstein timescale t_E by itself pins down the lens mass.',
          },
          correct: 'X',
          explanation: {
            ko: 't_E는 렌즈 질량뿐 아니라 렌즈까지의 거리와 상대 고유운동에도 달려 있습니다. 같은 t_E를 무거운 렌즈가 빨리 지나가도, 가벼운 렌즈가 천천히 지나가도 만들 수 있으므로, 질량을 정하려면 다른 정보가 더 필요합니다.',
            en: 't_E depends on the lens distance and relative proper motion as well as on the mass. A heavy lens moving fast and a light lens moving slowly give the same t_E, so extra information is needed to fix the mass.',
          },
        },
        {
          id: 'kmt_cmp_sc2',
          type: 'choice',
          question: {
            ko: '세 관측소의 광도곡선을 하나로 합쳤을 때 아노말리 판정에 가장 도움이 되는 점은 무엇인가?',
            en: 'When the light curves from the three sites are combined, what helps most in judging an anomaly?',
          },
          options: [
            { ko: '한 관측소의 밤이 끝나도 다른 관측소가 이어 관측해 짧은 신호를 놓치지 않는다', en: 'When night ends at one site another continues, so a brief signal is not missed' },
            { ko: '관측소마다 다른 밝기 영점이 저절로 같아진다', en: 'The different brightness zero-points of the sites become equal by themselves' },
            { ko: '행성과 별의 질량비 q를 곡선에서 바로 읽을 수 있다', en: 'The planet-to-star mass ratio q can be read straight off the curve' },
          ],
          correctIndex: 0,
          explanation: {
            ko: '칠레, 남아공, 호주는 경도가 달라 밤이 이어집니다. 아노말리는 몇 시간에서 하루 안에 끝나므로 이 이어 붙이기가 핵심입니다. 영점은 관측소별로 맞춰 주어야 하고, q는 모델 적합으로 얻습니다.',
            en: 'Chile, South Africa and Australia sit at different longitudes so their nights follow one another. Anomalies last hours to a day, so this coverage is what matters. Zero-points must be aligned per site, and q comes from the model fit.',
          },
        },
      ],
    },
    // Field ids match backend/survey_templates/kmtnet_record.json (v2) 1:1 —
    // Step 6 IS the record form; fit numbers (t0·u0·tE·χ²) ride along in the
    // record context automatically, so the learner only interprets.
    step6_reflect: {
      recordFields: [
        {
          id: 'event_classification',
          required: true,
          input: 'radio',
          question: {
            ko: '이 이벤트를 어떻게 분류하겠는가?',
            en: 'How would you classify this event?',
          },
          options: [
            { value: 'single_lens', label: { ko: '단일 렌즈형', en: 'Single-lens like' } },
            { value: 'high_mag', label: { ko: '고증폭 이벤트', en: 'High-magnification' } },
            { value: 'planetary_hint', label: { ko: '행성 아노말리 가능성', en: 'Possible planetary anomaly' } },
            { value: 'unclear', label: { ko: '불분명 / 추가 검토 필요', en: 'Unclear / needs more review' } },
          ],
        },
        {
          id: 'fit_quality',
          required: true,
          input: 'radio',
          question: {
            ko: 'Paczyński 적합은 곡선을 얼마나 잘 설명했는가?',
            en: 'How well did the Paczynski fit match the curve?',
          },
          options: [
            { value: 'high', label: { ko: '잘 맞았다', en: 'High agreement' } },
            { value: 'medium', label: { ko: '대체로 맞지만 아쉬운 구간이 있다', en: 'Reasonable with caveats' } },
            { value: 'low', label: { ko: '잘 맞지 않았다', en: 'Poor agreement' } },
          ],
        },
        {
          id: 'issues_observed',
          input: 'checkbox',
          question: {
            ko: '분석 과정에서 확인한 문제를 선택하세요.',
            en: 'What issues did you notice?',
          },
          options: [
            { value: 'coverage_gap', label: { ko: '관측소 간 관측 공백', en: 'Coverage gap between sites' } },
            { value: 'noisy_points', label: { ko: '광도곡선 잡음이 큼', en: 'Noisy light-curve points' } },
            { value: 'fit_mismatch', label: { ko: '적합과 자료가 어긋남', en: 'Fit and data disagree' } },
            { value: 'possible_anomaly', label: { ko: '아노말리/잔차 구조 가능성', en: 'Possible anomaly / residual structure' } },
            { value: 'none', label: { ko: '뚜렷한 문제 없음', en: 'No major issues' } },
          ],
        },
        {
          id: 'analysis_note',
          required: true,
          question: {
            ko: '이벤트 형태·적합 결과·발표값과의 차이를 근거와 함께 해석하세요.',
            en: 'Interpret the event shape, the fit result, and the difference from published values.',
          },
          helperText: {
            ko: '아노말리라고 판단했다면 그 근거는 무엇인지, 세 관측소를 합쳤을 때 해석이 어떻게 달라졌는지도 적어보세요.',
            en: 'If you suspect an anomaly, state the evidence; also note how combining the three sites changed your reading.',
          },
        },
        {
          id: 'next_step',
          question: {
            ko: '이 탐구를 이어간다면 무엇을 하겠는가?',
            en: 'If you continued this investigation, what would you do next?',
          },
          helperText: {
            ko: '예: 차분영상 확인, 관측소별 재비교, 비단일렌즈 모델 검토',
            en: 'e.g., inspect difference images, compare sites again, test a non-single-lens model',
          },
        },
      ],
    },
  }),
  metadataFields: [
    { id: 'sites', label: { ko: '관측소', en: 'Sites' }, value: 'CTIO, SAAO, SSO' },
    { id: 'photometry', label: { ko: '측광 방식', en: 'Photometry' }, value: { ko: '차분측광 (DIA)', en: 'Difference-image (DIA)' } },
    { id: 'status', label: { ko: '연결 상태', en: 'Connection status' }, value: { ko: 'Placeholder adapter', en: 'Placeholder adapter' } },
  ],
  analysisConfig: {
    adapterKey: 'kmtnet',
    method: { ko: '미시중력렌즈 광도곡선 적합 (단일렌즈 + 행성 섭동)', en: 'Microlensing light-curve fit (single lens + planetary perturbation)' },
    automaticTasks: [
      { ko: '관측소별 차분측광 광도 추출', en: 'Extract difference-image photometry per site' },
      { ko: '세 관측소 광도곡선 결합', en: 'Combine light curves from the three sites' },
      { ko: '단일렌즈(Paczynski) 적합 후 아노말리 탐지', en: 'Fit a single-lens (Paczynski) model, then detect anomalies' },
    ],
    parameters: [
      { id: 't0', label: { ko: '최대 증광 시각 t0', en: 'Peak time t0' }, value: { ko: '이벤트별', en: 'Per event' }, adjustable: true },
      { id: 'tE', label: { ko: '아인슈타인 시간 tE', en: 'Einstein time tE' }, value: { ko: '이벤트별', en: 'Per event' }, adjustable: true },
      { id: 'u0', label: { ko: '충격변수 u0', en: 'Impact parameter u0' }, value: { ko: '이벤트별', en: 'Per event' }, adjustable: true },
    ],
    assumptions: [
      { ko: '단일렌즈 곡선은 행성이 없을 때의 기준이며, 벗어난 구간이 아노말리 후보다.', en: 'The single-lens curve is the planet-free baseline; departures from it are anomaly candidates.' },
      { ko: '세 관측소의 시간대 차이가 짧은 아노말리를 놓치지 않는 핵심이다.', en: 'Longitude differences across the three sites are key to not missing brief anomalies.' },
    ],
    qualitySignals: [
      { ko: '광도곡선의 신호대잡음', en: 'Light-curve signal-to-noise' },
      { ko: '아노말리 구간의 표본 밀도(cadence)', en: 'Sampling density (cadence) across the anomaly' },
      { ko: '관측소 간 시간 공백', en: 'Time gaps between sites' },
    ],
  },
  visualizationConfig: {
    primaryView: { ko: '다지점 미시중력렌즈 광도곡선과 모델 적합', en: 'Multi-site microlensing light curve with model fit' },
    layers: [
      { ko: '관측소별 광도곡선 점 (CTIO·SAAO·SSO)', en: 'Light-curve points by site (CTIO·SAAO·SSO)' },
      { ko: '단일렌즈(Paczynski) 모델 곡선', en: 'Single-lens (Paczynski) model curve' },
      { ko: '행성 아노말리 구간 표시', en: 'Planetary-anomaly interval markers' },
    ],
    interpretationCues: [
      { ko: '대칭적이고 매끄러운 증광(단일렌즈)인가', en: 'Is the magnification a smooth, symmetric single-lens peak?' },
      { ko: '곡선을 벗어난 짧은 이상신호(행성 아노말리)', en: 'Brief deviations off the curve (planetary anomaly)' },
      { ko: '단일 관측소와 네트워크 결합의 차이', en: 'Difference between single-site and network-combined coverage' },
    ],
  },
  comparisonConfig: {
    referenceSource: { ko: '단일렌즈 모델 vs 행성 포함 모델', en: 'Single-lens model vs planet-included model' },
    comparisonValues: [
      { id: 'model', label: { ko: '모델', en: 'Model' }, value: { ko: '단일렌즈와 행성 포함 모델 비교', en: 'Single-lens compared with planet-included model' } },
      { id: 'mass_ratio', label: { ko: '질량비 q', en: 'Mass ratio q' }, value: { ko: '아노말리 크기·길이로 추정', en: 'Estimated from anomaly size and duration' } },
    ],
    qualityCriteria: [
      { ko: '아노말리는 짧아 cadence 공백이 있으면 놓치기 쉽다.', en: 'Anomalies are brief and easily missed if there are cadence gaps.' },
      { ko: '신호대잡음이 낮으면 아노말리와 잡음을 구분하기 어렵다.', en: 'Low signal-to-noise makes it hard to tell an anomaly from noise.' },
      { ko: '세 관측소 결합이 아노말리 구간을 더 촘촘히 덮는다.', en: 'Combining three sites covers the anomaly interval more densely.' },
    ],
    interpretationRule: {
      ko: '아노말리를 행성이라 단정하기 전에 다른 관측소 자료와 모델 적합으로 교차 확인한다.',
      en: 'Before calling an anomaly a planet, cross-check with other sites and the model fit.',
    },
  },
  // Emptied when Step 6 got typed record fields (same call as the transit
  // module): both prompts (anomaly evidence, three-site combining) now live in
  // analysis_note's helper text instead of duplicate note boxes.
  reflectionQuestions: [],
  teacherNotes: [
    { ko: 'KMTNet 실제 이벤트 광도곡선 연결 전에는 샘플 이벤트(단일렌즈/행성)로 곡선 읽기를 먼저 연습한다.', en: 'Before connecting live KMTNet event light curves, practice reading sample events (single-lens vs planetary).' },
  ],
  classroomUse: {
    suggestedTime: { ko: '45~60분', en: '45-60 minutes' },
    level: { ko: '고등학교 탐구 / 시민과학 외계행성 탐사', en: 'Secondary inquiry / citizen-science exoplanet search' },
    grouping: { ko: '관측소별 광도곡선을 나눠 본 뒤 네트워크 결합으로 아노말리 토의', en: 'Split light curves by site, then discuss anomalies on the combined network view' },
    teacherNotes: [
      { ko: '단일렌즈 곡선과 행성 아노말리 곡선을 비교해 근거 중심 토의를 유도한다.', en: 'Compare single-lens and planetary-anomaly curves to drive evidence-based discussion.' },
    ],
  },
  entry: {
    href: '/modules/kmtnet',
    label: { ko: '미시중력렌즈 탐구 시작', en: 'Start microlensing inquiry' },
    helperText: {
      ko: '실제 KMTNet 광도곡선으로 미시중력렌즈 이벤트를 분석합니다.',
      en: 'Analyze microlensing events with real KMTNet light curves.',
    },
  },
};

export const explorationModules: ExplorationModuleConfig[] = [
  exoplanetTransitModule,
  clusterCmdModule,
  kmtnetModule,
];

export function getExplorationModule(moduleId: string | undefined): ExplorationModuleConfig | null {
  return explorationModules.find((module) => module.id === moduleId) ?? null;
}

export function isModuleId(value: string | undefined): value is ModuleId {
  return explorationModules.some((module) => module.id === value);
}
