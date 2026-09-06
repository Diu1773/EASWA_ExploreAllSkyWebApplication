/**
 * 용어함 데이터 — 화면 우하단 「용어」 버튼이 여는 목록.
 *
 * 2026-07 현직 교사 검토에서 가장 넓게 나온 요구가 용어 설명이었다. 한 교사는
 * 「BTJD, BJD, Rp/R*, χ²_red, ROI 등 생소한 용어들이 갑자기 튀어나오는데 간단한
 * 설명 또는 한글로 풀어서 설명해주는 방식이 있으면 더 도움될 것」이라고 적었다.
 * 종전에는 식현상 모듈의 Step 0 접힘 안에만 8개가 있었고 KMTNet·성단에는 없었다.
 *
 * 규칙
 *  - **화면에 실제로 나오는 용어만 싣는다.** 안 쓰는 용어를 늘리면 목록이 사전이
 *    되고, 학습자는 자기가 본 것을 못 찾는다.
 *  - 뜻만 쓰고 **판단을 대신하지 않는다.** 「차이가 크면 비교성 탓」처럼 결론을
 *    미리 말하면 결과 해석의 학습자 수행(설계 원리 4)을 침범한다.
 *  - 한 항목은 두 문장을 넘기지 않는다. 강의가 아니라 확인용이다.
 */

export type GlossaryScope = 'common' | 'transit' | 'kmtnet' | 'cluster';

export interface GlossaryEntry {
  /** 화면에 보이는 그대로의 표기 */
  term: string;
  /** 검색에 함께 걸리는 다른 표기(영문 원어, 기호, 약자) */
  aliases?: string[];
  scope: GlossaryScope;
  def: { ko: string; en: string };
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── 공통 ────────────────────────────────────────────────────────────────
  {
    term: '광도곡선',
    aliases: ['light curve'],
    scope: 'common',
    def: {
      ko: '시간에 따른 별의 밝기를 점으로 찍은 그래프. 가로축이 시각, 세로축이 밝기다.',
      en: 'A graph of a star’s brightness over time — time on the x-axis, brightness on the y-axis.',
    },
  },
  {
    term: '등급',
    aliases: ['mag', 'magnitude'],
    scope: 'common',
    def: {
      ko: '별의 밝기를 나타내는 단위(mag). 값이 작을수록 밝다.',
      en: 'The unit for stellar brightness (mag). Smaller numbers mean brighter stars.',
    },
  },
  {
    term: '잔차',
    aliases: ['residual'],
    scope: 'common',
    def: {
      ko: '관측값에서 모델값을 뺀 나머지. 모델이 설명하지 못한 부분이다.',
      en: 'Observation minus model — the part the model does not explain.',
    },
  },
  {
    term: 'HJD',
    scope: 'common',
    def: {
      ko: '태양 중심을 기준으로 고친 관측 시각. 단위는 일(day)이다.',
      en: 'Heliocentric Julian Date — an observation time corrected to the Sun’s centre, in days.',
    },
  },
  {
    term: '불확도',
    aliases: ['1σ', 'sigma', '오차'],
    scope: 'common',
    def: {
      ko: '측정값이 흔들리는 폭. ±로 붙는 값이며 1σ는 그 기본 크기다.',
      en: 'How much a measurement wobbles; the ± figure, with 1σ as its basic size.',
    },
  },

  // ── 외계행성 식현상 ──────────────────────────────────────────────────────
  {
    term: 'cutout',
    aliases: ['컷아웃'],
    scope: 'transit',
    def: {
      ko: '넓은 관측 이미지에서 대상 별 주변만 잘라낸 작은 이미지 조각.',
      en: 'A small image patch cut from a wide observation, around the target star.',
    },
  },
  {
    term: 'sector',
    aliases: ['섹터'],
    scope: 'transit',
    def: {
      ko: 'TESS가 하늘을 나눠 약 27일씩 관측하는 구역. 한 sector가 한 관측 기간이다.',
      en: 'A patch of sky TESS observes for about 27 days. One sector is one observing run.',
    },
  },
  {
    term: '구경',
    aliases: ['aperture'],
    scope: 'transit',
    def: {
      ko: '별의 밝기를 잴 때 픽셀을 합산하는 원 모양 영역. 안쪽 원이 별, 바깥 고리가 하늘 배경이다.',
      en: 'The circle whose pixels are summed to measure a star: inner circle for the star, outer ring for sky background.',
    },
  },
  {
    term: 'FWHM',
    scope: 'transit',
    def: {
      ko: '별빛이 퍼진 폭(반치전폭). 점으로 보여야 할 별이 대기와 광학 때문에 번지는 정도다.',
      en: 'Full width at half maximum — how far a point-like star spreads out through atmosphere and optics.',
    },
  },
  {
    term: 'ROI (분석 구간)',
    scope: 'transit',
    def: {
      ko: '광도곡선에서 모델을 맞출 구간. 식의 앞뒤가 함께 들어가야 한다.',
      en: 'Region of interest — the slice of the light curve the model is fitted to, including both sides of the dip.',
    },
  },
  {
    term: 'BTJD',
    scope: 'transit',
    def: {
      ko: 'TESS가 쓰는 관측 시각. 단위는 일(day)이고 그래프의 가로축이 된다.',
      en: 'The observation time TESS uses, in days; it forms the x-axis of the graph.',
    },
  },
  {
    term: 'Rp/R*',
    aliases: ['반지름비', 'rp/rs'],
    scope: 'transit',
    def: {
      ko: '행성 반지름을 별 반지름으로 나눈 값. 두 길이의 비이므로 단위가 없다.',
      en: 'Planet radius divided by stellar radius — a ratio of two lengths, so it has no unit.',
    },
  },
  {
    term: 'χ²_red',
    aliases: ['환산 카이제곱', 'chi2', '적합 품질'],
    scope: 'transit',
    def: {
      ko: '모델이 관측점에서 벗어난 정도를 측정 오차로 나눠 평균한 값. 단위가 없고 1에 가까울수록 자료를 잘 설명한다.',
      en: 'Model-to-data mismatch averaged and scaled by the measurement error; unitless, and closer to 1 means the model explains the data well.',
    },
  },
  {
    term: '비교성',
    aliases: ['comparison star'],
    scope: 'transit',
    def: {
      ko: '목표 별과 같은 화면에 있는 다른 별. 두 별이 함께 겪은 변화를 나눠서 없애는 데 쓴다.',
      en: 'Another star in the same frame, used to divide out changes both stars went through together.',
    },
  },
  {
    term: '차등측광',
    aliases: ['differential photometry'],
    scope: 'transit',
    def: {
      ko: '목표 별의 밝기를 비교성의 밝기로 나누는 측정 방법. 하늘 상태처럼 둘에 공통인 변화가 상쇄된다.',
      en: 'Measuring a target’s brightness divided by comparison stars, so changes common to both cancel out.',
    },
  },
  {
    term: '식 깊이',
    aliases: ['transit depth'],
    scope: 'transit',
    def: {
      ko: '행성이 별 앞을 지날 때 밝기가 얼마나 줄어드는지의 비율.',
      en: 'How much the brightness drops while the planet crosses the star.',
    },
  },
  {
    term: '위상 접기',
    aliases: ['phase fold'],
    scope: 'transit',
    def: {
      ko: '공전 주기로 시간을 접어 여러 번의 식을 한 곡선 위에 겹치는 방법. 가로축이 0~1의 위상이 된다.',
      en: 'Folding time by the orbital period so repeated transits stack on one curve; the x-axis becomes phase from 0 to 1.',
    },
  },
  {
    term: '주연감광',
    aliases: ['limb darkening'],
    scope: 'transit',
    def: {
      ko: '별의 가장자리가 가운데보다 어둡게 보이는 현상. 식 곡선의 모양에 영향을 준다.',
      en: 'A star’s edge looking dimmer than its centre, which changes the shape of the transit curve.',
    },
  },

  // ── 미시중력렌즈 (KMTNet) ────────────────────────────────────────────────
  {
    term: '미시중력렌즈',
    aliases: ['microlensing'],
    scope: 'kmtnet',
    def: {
      ko: '앞의 천체가 뒤 별빛을 휘게 해서 뒤 별이 한동안 밝아 보이는 현상.',
      en: 'A foreground object bending the light of a background star, making it look brighter for a while.',
    },
  },
  {
    term: '증광',
    aliases: ['amplification', 'magnification'],
    scope: 'kmtnet',
    def: {
      ko: '렌즈 효과로 별이 평소보다 밝아진 정도.',
      en: 'How much brighter the lensing makes the star than usual.',
    },
  },
  {
    term: 't₀',
    aliases: ['t0', '피크 시각'],
    scope: 'kmtnet',
    def: {
      ko: '가장 밝아진 순간의 시각(HJD).',
      en: 'The time of peak brightness, in HJD.',
    },
  },
  {
    term: 'u₀',
    aliases: ['u0', '충격 파라미터'],
    scope: 'kmtnet',
    def: {
      ko: '렌즈와 별이 가장 가까워졌을 때의 거리. 아인슈타인 반경을 1로 본 값이라 단위가 없다.',
      en: 'The closest approach between lens and source, measured with the Einstein radius as 1, so it has no unit.',
    },
  },
  {
    term: 'tE',
    aliases: ['t_E', '아인슈타인 시간'],
    scope: 'kmtnet',
    def: {
      ko: '아인슈타인 반경을 가로지르는 데 걸리는 시간(일). 사건이 얼마나 오래 가는지를 정한다.',
      en: 'The time in days to cross the Einstein radius, which sets how long the event lasts.',
    },
  },
  {
    term: 'χ²/dof',
    aliases: ['카이제곱', '적합도'],
    scope: 'kmtnet',
    def: {
      ko: '모델이 자료에서 벗어난 정도를 자유도로 나눈 값. 단위가 없고 1에 가까울수록 잘 맞는다.',
      en: 'Model-to-data mismatch divided by the degrees of freedom; unitless, and closer to 1 fits better.',
    },
  },
  {
    term: '차분영상',
    aliases: ['DIA', 'difference image'],
    scope: 'kmtnet',
    def: {
      ko: '두 시각의 영상을 빼서 변한 부분만 남기는 방법. 별이 빽빽한 곳에서 밝기 변화를 재는 데 쓴다.',
      en: 'Subtracting one epoch from another so only what changed remains — used to measure brightness in crowded fields.',
    },
  },
  {
    term: '기준 영상',
    aliases: ['reference frame'],
    scope: 'kmtnet',
    def: {
      ko: '차분에서 빼는 쪽이 되는 영상. 다른 프레임을 여기에 맞춰 정렬한다.',
      en: 'The frame others are subtracted from and aligned to.',
    },
  },
  {
    term: '관측소',
    aliases: ['CTIO', 'SAAO', 'SSO'],
    scope: 'kmtnet',
    def: {
      ko: 'KMTNet의 세 관측소. 칠레(CTIO)·남아프리카공화국(SAAO)·오스트레일리아(SSO)에 나뉘어 있어 밤을 이어 관측한다.',
      en: 'KMTNet’s three sites — Chile (CTIO), South Africa (SAAO) and Australia (SSO) — spread out so observation continues through the night.',
    },
  },

  // ── 성단 색등급도 ────────────────────────────────────────────────────────
  {
    term: '색등급도',
    aliases: ['CMD', '색-등급도'],
    scope: 'cluster',
    def: {
      ko: '별의 색을 가로축, 밝기를 세로축에 찍은 그래프. 성단의 별들이 이루는 띠 모양을 본다.',
      en: 'A graph with stellar colour on the x-axis and brightness on the y-axis, used to read the band a cluster’s stars form.',
    },
  },
  {
    term: '색지수 BP−RP',
    aliases: ['BP-RP', '색지수'],
    scope: 'cluster',
    def: {
      ko: '파란 쪽 밝기에서 붉은 쪽 밝기를 뺀 값. 클수록 붉고 차가운 별이다.',
      en: 'Blue-band brightness minus red-band brightness; larger means a redder, cooler star.',
    },
  },
  {
    term: '주계열',
    aliases: ['main sequence'],
    scope: 'cluster',
    def: {
      ko: '색등급도에서 대부분의 별이 놓이는 띠. 중심에서 수소를 태우는 동안 머무는 자리다.',
      en: 'The band most stars sit on while burning hydrogen in their cores.',
    },
  },
  {
    term: '전향점',
    aliases: ['turn-off', 'turnoff'],
    scope: 'cluster',
    def: {
      ko: '주계열이 꺾이는 지점. 무거운 별부터 먼저 떠나므로 위치가 성단의 나이와 관계있다.',
      en: 'Where the main sequence bends. Heavier stars leave first, so its position relates to the cluster’s age.',
    },
  },
  {
    term: '등시선',
    aliases: ['isochrone'],
    scope: 'cluster',
    def: {
      ko: '같은 나이의 별들이 색등급도에서 그릴 이론 곡선. 관측 분포에 겹쳐 맞춰 본다.',
      en: 'The theoretical curve stars of one age would trace, overlaid on the observed distribution.',
    },
  },
  {
    term: '거리지수',
    aliases: ['m-M', '거리 지수'],
    scope: 'cluster',
    def: {
      ko: '겉보기 등급에서 절대 등급을 뺀 값. 거리가 멀수록 커지며 곡선을 위아래로 움직인다.',
      en: 'Apparent minus absolute magnitude; it grows with distance and shifts the curve vertically.',
    },
  },
  {
    term: '소광 A_V',
    aliases: ['extinction', '성간소광'],
    scope: 'cluster',
    def: {
      ko: '성간 먼지가 별빛을 가리는 정도. 별을 어둡고 붉게 만든다.',
      en: 'How much interstellar dust dims starlight, making stars fainter and redder.',
    },
  },
  {
    term: '금속함량',
    aliases: ['metallicity', 'Z', 'M/H'],
    scope: 'cluster',
    def: {
      ko: '수소·헬륨보다 무거운 원소가 별에 든 정도. 주계열 전체의 색을 옮긴다.',
      en: 'How much of a star is elements heavier than hydrogen and helium; it shifts the colour of the whole main sequence.',
    },
  },
  {
    term: '시차',
    aliases: ['parallax'],
    scope: 'cluster',
    def: {
      ko: '지구가 공전하면서 별의 위치가 조금씩 달라 보이는 각도. 거리를 재는 데 쓴다.',
      en: 'The small angular shift of a star as Earth orbits, used to measure distance.',
    },
  },
  {
    term: '고유운동',
    aliases: ['proper motion', 'pmra', 'pmdec'],
    scope: 'cluster',
    def: {
      ko: '별이 하늘에서 실제로 움직이는 방향과 빠르기. 같은 성단의 별들은 비슷하게 움직인다.',
      en: 'How fast and in which direction a star actually moves across the sky; cluster members move alike.',
    },
  },
  {
    term: 'RUWE',
    scope: 'cluster',
    def: {
      ko: 'Gaia 위치 측정이 얼마나 잘 맞았는지를 나타내는 값. 이 앱은 1.4 미만인 별만 쓴다.',
      en: 'A measure of how well Gaia’s astrometric fit worked; this app keeps only stars below 1.4.',
    },
  },
];

/** 현재 모듈의 용어를 앞에, 공통 용어를 그다음에 둔다. */
export function glossaryFor(scope: GlossaryScope | null): GlossaryEntry[] {
  const mine = scope && scope !== 'common' ? GLOSSARY.filter((e) => e.scope === scope) : [];
  const common = GLOSSARY.filter((e) => e.scope === 'common');
  const rest = GLOSSARY.filter((e) => e.scope !== 'common' && !mine.includes(e));
  return [...mine, ...common, ...rest];
}
