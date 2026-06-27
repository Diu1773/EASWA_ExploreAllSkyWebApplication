import {
  ASTRO_FALLBACK_IMAGE,
  KMT_MODULE_IMAGE,
  TESS_MODULE_IMAGE,
} from '../data/imageSources';
import { buildExplorerHref } from '../utils/explorerNavigation';
import { createCommonInquirySteps, makePrompt } from './commonSteps';
import type { ExplorationModuleConfig, ModuleId } from './types';

const kmtnetExplorerHref = buildExplorerHref({
  moduleId: 'kmtnet',
  topicId: 'microlensing',
  siteId: 'ctio',
  learningMode: 'guided',
});

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
          explanation: { ko: '혼입광이 신호를 희석해 식 깊이를 과소평가하게 만듭니다.', en: 'Blended light dilutes the signal, biasing the depth low.' },
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
        {
          id: 'tr_cond_sc2',
          type: 'choice',
          question: { ko: 'fit 구간(ROI)을 식 전후로 너무 좁게 잡으면 어떻게 될까?', en: 'What happens if you make the fit window (ROI) too narrow around the transit?' },
          options: [
            { ko: '기준선(baseline) 추정이 나빠져 식 깊이가 왜곡된다', en: 'The baseline is poorly estimated and the depth is distorted' },
            { ko: '계산이 빨라져 더 정확해진다', en: 'It computes faster and becomes more accurate' },
            { ko: '결과에 아무 영향이 없다', en: 'It has no effect on the result' },
          ],
          correctIndex: 0,
          explanation: { ko: '식 밖의 기준선을 받칠 구간이 부족하면 깊이가 편향됩니다.', en: 'Without enough out-of-transit baseline, the fitted depth becomes biased.' },
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
        label: { ko: 'Aperture / annulus', en: 'Aperture / annulus' },
        value: { ko: '학생이 조정 가능', en: 'Student-adjustable' },
        adjustable: true,
        description: { ko: '목표별과 비교성의 flux 측정 범위', en: 'Flux measurement region for target and comparison stars' },
      },
      {
        id: 'fit_roi',
        label: { ko: 'Fit ROI', en: 'Fit ROI' },
        value: { ko: 'Step 4에서 선택한 BJD 또는 phase 구간', en: 'BJD or phase interval selected in Step 4' },
        adjustable: true,
      },
      {
        id: 'model',
        label: { ko: '모델', en: 'Model' },
        value: { ko: 'batman 기반 transit fit 또는 단순 모델 fallback', en: 'batman transit fit or simplified fallback' },
        adjustable: false,
      },
    ],
    assumptions: [
      { ko: '비교성 ensemble은 목표별 외부 요인을 보정하는 안정적 기준으로 사용된다.', en: 'The comparison ensemble is treated as a stable reference for correcting external effects.' },
      { ko: '모델 적합값은 ROI와 전처리 조건에 의존한다.', en: 'Fit values depend on ROI and preprocessing conditions.' },
      { ko: '카탈로그 depth 기반 Rp/R*는 비교 기준이지 절대 정답이 아니다.', en: 'Catalog-depth-based Rp/R* is a comparison benchmark, not an unquestioned answer.' },
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
      { id: 'depth', label: { ko: 'Transit depth', en: 'Transit depth' }, value: { ko: '카탈로그 depth와 측정 depth 비교', en: 'Catalog depth compared with measured depth' } },
      { id: 'rp_rs', label: 'Rp/R*', value: { ko: 'sqrt(depth) 기준값과 fit 결과 비교', en: 'sqrt(depth) reference compared with fit result' } },
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
  reflectionQuestions: [
    makePrompt('transit_reflect_quality', '이번 분석에서 가장 큰 불확실성 원인은 무엇인가?', 'What is the largest uncertainty source in this analysis?'),
    makePrompt('transit_reflect_claim', '이 결과로 어떤 수준의 주장을 할 수 있고, 무엇은 주장할 수 없는가?', 'What can this result support, and what can it not support?'),
  ],
  teacherNotes: [
    { ko: '정답 수치보다 차이 원인을 자료와 조건으로 설명하는 활동에 초점을 둔다.', en: 'Focus on explaining differences through data and conditions rather than matching a single numeric answer.' },
    { ko: '입문형은 권장 설정을 따르고, 심화형은 aperture와 ROI 변경 효과를 비교한다.', en: 'Guided mode can follow recommended settings; advanced mode can compare aperture and ROI choices.' },
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
  image: ASTRO_FALLBACK_IMAGE,
  imageAlt: { ko: '성단과 은하 배경 이미지', en: 'Cluster and galaxy background image' },
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
    step6_reflect: {
      questions: [
        makePrompt('cmd_reflect_claim', '이번 CMD로 주장할 수 있는 것과 주장할 수 없는 것을 각각 하나씩 적어라.', 'Write one thing this CMD lets you claim, and one thing it does not.'),
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
  reflectionQuestions: [
    makePrompt('cmd_reflect_cause', '산출한 거리·나이가 문헌값과 다르다면 가장 큰 원인은 무엇이라 생각하는가? (소광 보정 / 구성원 오염 / 측광 오차 / 표준주계열·등시선 가정)', 'If your derived distance or age differs from the literature value, what do you think is the largest cause - extinction correction, member contamination, photometric error, or the standard-main-sequence/isochrone assumption?'),
    makePrompt('cmd_reflect_sensitivity', '구성원 선별 기준을 바꿨을 때 결과가 얼마나 민감했는가? 이것이 실제 자료 분석에 대해 알려주는 점은 무엇인가?', 'How sensitive was the result when you changed the membership criteria, and what does that reveal about analyzing real data?'),
    makePrompt('cmd_reflect_textbook', '교과서의 이상화된 CMD 그림과 실제 자료로 그린 CMD는 어떻게 달랐는가?', 'How did the CMD from real data differ from the idealized CMD figure in the textbook?'),
  ],
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
  title: { ko: 'KMTNet 관측 품질 탐구블럭', en: 'KMTNet Observation Quality Block' },
  subtitle: {
    ko: '관측소별 메타데이터와 품질 지표로 시간영역 관측의 신뢰도를 해석합니다.',
    en: 'Interpret time-domain observation reliability from site metadata and quality metrics.',
  },
  description: {
    ko: 'KMTNet 관측소, 관측 시간, seeing, sky background, cadence 같은 메타데이터를 확인하고 시간영역 시각화 또는 품질 분류 결과를 해석하는 탐구블럭입니다. 현재는 placeholder adapter를 사용합니다.',
    en: 'Inspect KMTNet site, time, seeing, sky background, and cadence metadata, then interpret time-series or quality-classification views. This currently uses a placeholder adapter.',
  },
  image: KMT_MODULE_IMAGE,
  imageAlt: { ko: 'KMTNet 관측 네트워크 이미지', en: 'KMTNet observing network image' },
  tags: ['KMTNet', 'Observation quality', 'Time series'],
  dataSource: {
    name: { ko: 'KASI KMTNet 관측 메타데이터', en: 'KASI KMTNet observation metadata' },
    provider: { ko: 'KASI KMTNet', en: 'KASI KMTNet' },
    description: {
      ko: '칠레, 남아프리카, 호주의 관측소 자료를 묶어 이벤트의 시간적 연속성과 관측 품질을 확인합니다.',
      en: 'Combines Chile, South Africa, and Australia site data to inspect temporal coverage and observation quality.',
    },
    accessMethod: {
      ko: '추후 KMTNet archive adapter 또는 수업용 샘플셋 연결',
      en: 'Future KMTNet archive adapter or classroom sample-set connection',
    },
    provenanceNote: {
      ko: '관측소, 필터, 노출시간, 품질 지표가 항상 표시되어야 합니다.',
      en: 'Site, filter, exposure time, and quality metrics should always remain visible.',
    },
  },
  learningGoals: [
    { ko: '다중 관측소 네트워크가 시간영역 관측 공백을 줄이는 이유를 설명한다.', en: 'Explain why a multi-site network reduces time-domain coverage gaps.' },
    { ko: 'seeing, sky background, cadence 같은 품질 지표를 해석한다.', en: 'Interpret quality metrics such as seeing, sky background, and cadence.' },
    { ko: '자동 품질 분류 결과를 근거와 함께 검토한다.', en: 'Review automated quality classification with supporting evidence.' },
  ],
  steps: createCommonInquirySteps({
    step1_select: {
      questions: [
        makePrompt('kmt_site_reason', '어떤 관측소 또는 관측 구간을 먼저 살펴볼 것인가?', 'Which site or observing interval will you inspect first?'),
      ],
    },
    step2_metadata: {
      selfChecks: [
        {
          id: 'kmt_meta_sc1',
          type: 'ox',
          question: { ko: '세 관측소(칠레·남아공·호주)는 경도가 달라, 한 곳이 낮이어도 다른 곳에서 관측을 이어 시간 공백을 줄인다.', en: 'The three sites (Chile, South Africa, Australia) span longitudes, so when one is in daylight another can keep observing, reducing time gaps.' },
          correct: 'O',
          explanation: { ko: '경도 분산이 연속 시간영역 관측의 핵심입니다.', en: 'Longitude spread is the key to continuous time-domain coverage.' },
        },
      ],
    },
    step3_analysis_conditions: {
      selfChecks: [
        {
          id: 'kmt_cond_sc1',
          type: 'ox',
          question: { ko: 'seeing 값이 커지면(나빠지면) 별상이 퍼져 측광 품질이 낮아진다.', en: 'When seeing increases (worsens), stellar images spread out and photometric quality drops.' },
          correct: 'O',
          explanation: { ko: '큰 seeing은 별상(PSF)을 넓혀 측광 정밀도를 떨어뜨립니다.', en: 'Larger seeing broadens the PSF, lowering photometric precision.' },
        },
      ],
    },
    step4_run_visualize: {
      questions: [
        makePrompt('kmt_quality_signal', '시각화에서 관측 품질이 달라지는 구간은 어디인가?', 'Where does the visualization show a change in observation quality?'),
      ],
    },
  }),
  metadataFields: [
    { id: 'sites', label: { ko: '관측소', en: 'Sites' }, value: 'CTIO, SAAO, SSO' },
    { id: 'metrics', label: { ko: '품질 지표', en: 'Quality metrics' }, value: { ko: 'seeing, sky background, cadence', en: 'seeing, sky background, cadence' } },
    { id: 'status', label: { ko: '연결 상태', en: 'Connection status' }, value: { ko: 'Placeholder adapter', en: 'Placeholder adapter' } },
  ],
  analysisConfig: {
    adapterKey: 'kmtnet',
    method: { ko: '관측 품질 요약 + 시간영역 시각화', en: 'Observation-quality summary + time-series visualization' },
    automaticTasks: [
      { ko: '관측소별 metadata 정규화', en: 'Normalize metadata by site' },
      { ko: '품질 지표 요약', en: 'Summarize quality metrics' },
      { ko: '시간 공백과 품질 분류 시각화', en: 'Visualize coverage gaps and quality classes' },
    ],
    parameters: [
      { id: 'site', label: { ko: '관측소', en: 'Site' }, value: 'CTIO / SAAO / SSO', adjustable: true },
      { id: 'quality_threshold', label: { ko: '품질 기준', en: 'Quality threshold' }, value: { ko: '수업별 조정', en: 'Classroom-adjustable' }, adjustable: true },
      { id: 'time_window', label: { ko: '시간 구간', en: 'Time window' }, value: { ko: '이벤트 주변 구간', en: 'Window around event' }, adjustable: true },
    ],
    assumptions: [
      { ko: '품질 지표는 관측 조건을 대표하지만 과학적 해석을 단독으로 결정하지 않는다.', en: 'Quality metrics represent observing conditions but do not alone determine scientific interpretation.' },
      { ko: '관측소별 시간대 차이는 coverage gap 해석의 핵심이다.', en: 'Longitude differences across sites are central to interpreting coverage gaps.' },
    ],
    qualitySignals: [
      { ko: 'seeing', en: 'Seeing' },
      { ko: 'sky background', en: 'Sky background' },
      { ko: 'cadence and missing frames', en: 'Cadence and missing frames' },
    ],
  },
  visualizationConfig: {
    primaryView: { ko: '관측소별 시간 coverage 및 품질 분류', en: 'Site coverage and quality-classification timeline' },
    layers: [
      { ko: '관측소별 cadence timeline', en: 'Cadence timeline by site' },
      { ko: '품질 등급 색상 overlay', en: 'Quality-class color overlay' },
      { ko: 'time-series 또는 이벤트 후보 표시', en: 'Time-series or event-candidate markers' },
    ],
    interpretationCues: [
      { ko: '연속 관측을 방해하는 시간 공백', en: 'Coverage gaps interrupting continuous monitoring' },
      { ko: '품질 저하가 몰린 구간', en: 'Intervals with clustered quality degradation' },
      { ko: '단일 관측소와 네트워크 결합의 차이', en: 'Difference between single-site and network-combined views' },
    ],
  },
  comparisonConfig: {
    referenceSource: { ko: '관측 품질 기준 또는 네트워크 결합 결과', en: 'Quality criteria or network-combined reference' },
    comparisonValues: [
      { id: 'coverage', label: { ko: 'Coverage', en: 'Coverage' }, value: { ko: '단일 관측소와 3개 관측소 결합 비교', en: 'Single-site compared with three-site combined coverage' } },
      { id: 'quality_class', label: { ko: '품질 등급', en: 'Quality class' }, value: { ko: 'good / caution / reject 기준 예정', en: 'Planned good / caution / reject criteria' } },
    ],
    qualityCriteria: [
      { ko: 'seeing이 커지면 별상이 퍼져 측광 품질이 낮아질 수 있다.', en: 'Larger seeing can broaden stellar profiles and reduce photometric quality.' },
      { ko: 'sky background가 높으면 faint target의 신뢰도가 낮아진다.', en: 'High sky background lowers reliability for faint targets.' },
      { ko: 'cadence 공백은 짧은 이벤트 해석을 어렵게 한다.', en: 'Cadence gaps make short events harder to interpret.' },
    ],
    interpretationRule: {
      ko: '자동 품질 등급을 결론으로 쓰지 말고, 관측소와 시간대별 근거를 확인한 뒤 해석한다.',
      en: 'Do not use automated quality class as the conclusion; inspect site- and time-specific evidence first.',
    },
  },
  reflectionQuestions: [
    makePrompt('kmt_reflect_network', '세 관측소를 합쳤을 때 해석이 어떻게 달라졌는가?', 'How did interpretation change after combining three sites?'),
    makePrompt('kmt_reflect_quality', '품질이 낮은 자료를 제외하거나 보류해야 하는 근거는 무엇인가?', 'What evidence supports excluding or flagging low-quality data?'),
  ],
  teacherNotes: [
    { ko: 'KMTNet 실제 자료 연결 전에는 품질 기준표와 시각화 색상 체계를 먼저 확정한다.', en: 'Before connecting live KMTNet data, finalize the quality rubric and visualization color scheme.' },
  ],
  classroomUse: {
    suggestedTime: { ko: '45~60분', en: '45-60 minutes' },
    level: { ko: '고등학교 탐구 / 시민과학 품질 판정 활동', en: 'Secondary inquiry / citizen-science quality review' },
    grouping: { ko: '관측소별 역할 분담 후 네트워크 결합 토의', en: 'Assign sites to groups, then discuss the combined network view' },
    teacherNotes: [
      { ko: '자동 품질 판정과 학생 판정을 비교해 근거 중심 토의를 유도한다.', en: 'Compare automated and student quality judgments to drive evidence-based discussion.' },
    ],
  },
  entry: {
    href: kmtnetExplorerHref,
    label: { ko: 'KMTNet 탐색으로 이동', en: 'Open KMTNet Explorer' },
    helperText: {
      ko: '현재 공통 블럭은 placeholder이며, 기존 KMTNet 탐색 화면은 유지됩니다.',
      en: 'The shared block is currently a placeholder while the existing KMTNet explorer remains available.',
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
