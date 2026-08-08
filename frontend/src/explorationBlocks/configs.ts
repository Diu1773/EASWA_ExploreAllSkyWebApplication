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
          question: { ko: '겉보기 등급이 더 밝은(숫자가 작은) 별일수록 광도곡선의 잡음이 작아 식 신호를 보기 쉽다.', en: 'A brighter host (smaller magnitude) gives a lower-noise light curve, making the transit easier to see.' },
          correct: 'O',
          explanation: { ko: '밝은 별은 받는 광자 수가 많아 신호대잡음비(S/N)가 높습니다.', en: 'Brighter stars deliver more photons, so the signal-to-noise ratio is higher.' },
        },
        {
          id: 'tr_meta_sc2',
          type: 'ox',
          question: { ko: 'TESS는 픽셀이 커서 주변 별빛이 섞이면(blending) 측정한 식 깊이가 실제보다 얕게 나올 수 있다.', en: 'Because TESS pixels are large, blending from nearby stars can make the measured transit depth shallower than the true value.' },
          correct: 'O',
          explanation: { ko: '주변 별빛 오염이 신호를 희석해 식 깊이를 과소평가하게 만듭니다.', en: 'Blended light dilutes the signal, biasing the depth low.' },
        },
      ],
    },
    step3_analysis_conditions: {
      selfChecks: [
        {
          id: 'tr_cond_sc1',
          type: 'ox',
          question: { ko: '측광 구경(aperture)을 무작정 키우면 항상 더 정확해진다.', en: 'Making the photometry aperture larger always improves accuracy.' },
          correct: 'X',
          explanation: { ko: '너무 키우면 주변 별·배경이 섞여 오히려 잡음이 커집니다 — 적정 크기가 중요합니다.', en: 'Too large an aperture lets in nearby stars and background, raising noise; the right size matters.' },
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
            ko: 'Rp/R*와 식 깊이를 기준값과 비교하고, 비교성 품질·별빛 오염·구경 크기·ROI·잡음·모델 가정을 근거로 설명하세요.',
            en: 'Compare Rp/R* and depth with the reference; explain using comparison-star quality, blending, aperture, ROI, noise, and model assumptions.',
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
        makePrompt('cmd_meta_membership', '구성원을 어떤 기준(시차·고유운동 확률)으로 선별했는가? 배경별이 섞이면 CMD에 어떤 흔적이 남을까?', 'By what criteria (parallax, proper-motion probability) were members selected? What trace would contaminating field stars leave on the CMD?'),
      ],
      selfChecks: [
        {
          id: 'cmd_meta_sc1',
          type: 'ox',
          question: { ko: 'BP-RP 색지수가 클수록 표면온도가 높은 파란 별이다.', en: 'A larger BP-RP color index means a hotter, bluer star.' },
          correct: 'X',
          explanation: { ko: '반대입니다 — 색지수가 클수록 더 붉고 차가운 별입니다.', en: 'The opposite — a larger BP-RP means a redder, cooler star.' },
        },
        {
          id: 'cmd_meta_sc2',
          type: 'ox',
          question: { ko: '구성원 선별을 느슨하게 하면 배경별이 섞여 주계열 띠가 두꺼워진다.', en: 'Loosening membership selection lets field stars in and broadens the main-sequence band.' },
          correct: 'O',
          explanation: { ko: '오염된 배경별이 CMD에 흩어져 띠를 두껍게 만듭니다.', en: 'Contaminating field stars scatter across the CMD, widening the band.' },
        },
      ],
    },
    step3_analysis_conditions: {
      questions: [
        makePrompt('cmd_cond_membership', '구성원 확률 기준을 높이거나 낮추면 주계열의 두께와 배경 산포가 어떻게 변할 것으로 예상하는가?', 'If you raise or lower the membership-probability cut, how do you expect the main-sequence width and background scatter to change?'),
        makePrompt('cmd_cond_extinction', '성간 소광(적색화) 보정을 하지 않으면 CMD는 색·등급 방향으로 어느 쪽으로 이동하는가?', 'Without interstellar extinction (reddening) correction, in which color and magnitude direction does the CMD shift?'),
      ],
      selfChecks: [
        {
          id: 'cmd_cond_sc1',
          type: 'ox',
          question: { ko: '성간 소광(적색화)을 보정하지 않으면 CMD가 더 붉고 어두운 쪽으로 치우친다.', en: 'Without reddening correction, the CMD is shifted toward redder and fainter.' },
          correct: 'O',
          explanation: { ko: '소광은 별을 어둡게 + 붉게 만들어 CMD를 그 방향으로 밀어냅니다.', en: 'Extinction dims and reddens stars, pushing the CMD that way.' },
        },
        {
          id: 'cmd_cond_sc2',
          type: 'choice',
          question: { ko: '구성원 확률 기준을 높이면 CMD가 어떻게 변할까?', en: 'If you raise the membership-probability cut, how does the CMD change?' },
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
    },
    step5_compare: {
      questions: [
        makePrompt('cmd_cmp_age', '두 성단의 전향점 위치를 비교하라. 전향점이 더 어두운 성단이 더 늙은 성단인 이유를 질량-수명 관계로 설명하고, 문헌 나이값과 네 판단이 일치하는지 확인하라.', 'Compare the turn-off positions of the two clusters. Using the mass-lifetime relation, explain why the cluster with the fainter turn-off is older, and check whether your judgment agrees with literature ages.'),
        makePrompt('cmd_cmp_distance', '관측 주계열을 표준 주계열(절대등급)에 맞췄을 때의 등급 차이(거리계수 m-M)로 거리를 구하고(r = 10^((m-M+5)/5)), 문헌 거리와 비교하라.', 'Fit the observed main sequence to the standard main sequence (absolute magnitude); from the magnitude offset (distance modulus m-M) compute the distance (r = 10^((m-M+5)/5)) and compare with the literature value.'),
      ],
    },
    // Field ids match backend/survey_templates/cluster_record.json (v2) 1:1 —
    // Step 6 IS the record form and the save panel submits these answers. The
    // fitted distance is NOT retyped by the learner: it rides along in the
    // record context (ms_fit) straight from the Step 4 fit.
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
      { id: 'membership_cut', label: { ko: '구성원 선별', en: 'Member selection' }, value: { ko: '시차·고유운동 기반', en: 'Parallax + proper motion' }, adjustable: false },
      { id: 'extinction', label: { ko: '소광 보정', en: 'Extinction correction' }, value: { ko: '수동 확인', en: 'Manual review' }, adjustable: true },
    ],
    assumptions: [
      { ko: '선택된 별들이 성단 구성원이라는 가정이 CMD 형태에 영향을 준다.', en: 'Assuming selected stars are members affects the CMD shape.' },
      { ko: '소광과 거리 보정이 충분하지 않으면 기준 등시선과 어긋날 수 있다.', en: 'Insufficient extinction or distance correction can shift the CMD from reference isochrones.' },
    ],
    qualitySignals: [
      { ko: '측광 오차', en: 'Photometric error' },
      { ko: '구성원 확률', en: 'Membership probability' },
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
    referenceSource: { ko: '등시선 모델 또는 문헌 CMD', en: 'Isochrone model or literature CMD' },
    comparisonValues: [
      { id: 'age', label: { ko: '나이 추정', en: 'Age estimate' }, value: { ko: '전향점 위치로 상대 나이 비교', en: 'Relative age from turn-off position' } },
      { id: 'distance', label: { ko: '거리 계수', en: 'Distance modulus' }, value: { ko: '시차 기반 거리와 문헌값 비교', en: 'Parallax distance vs literature value' } },
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
    level: { ko: '중등 심화~고등', en: 'Upper middle to secondary' },
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
          explanation: { ko: '경도 분산에 의한 연속 관측이 짧은 아노말리 포착의 핵심입니다.', en: 'Continuous coverage from the longitude spread is key to catching brief anomalies.' },
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
