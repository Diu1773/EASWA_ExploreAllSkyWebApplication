import { useLangStore } from '../../i18n';

/**
 * Step 0 파이프라인 개념도 — 대상 선택부터 해석까지가 하나의 측광 파이프라인이라는
 * 큰 그림을 준다. 현장 피드백: 각 단계를 실행은 하는데 "왜 구경측광을 하고 왜
 * 차등측광을 하는가", "데이터가 어떻게 들어오고 전처리는 어디서 되는가"의 지도가
 * 없었다.
 *
 * 설계: 원리 2(기술 부담 완화)로 대부분을 플랫폼이 흡수하되, 원리 3(가시화)으로
 * 그 존재와 이유를 보인다. 그래서 목적은 "직접 하게"가 아니라 "자동 처리되지만
 * 각 단계가 왜 필요한지 알게" 하는 것 — role 색으로 자동/조절/판단을 가른다.
 *
 * 정직성: TESS cutout은 SPOC(과학팀)가 계기 보정을 이미 끝낸 자료다. 학습자·플랫폼이
 * 하는 '전처리'는 배경 제거(구경측광)·systematics 제거(차등측광)·정규화뿐. 계기 보정
 * 단계에 '완료' 배지를 달아 학습자가 하는 것으로 오독되지 않게 한다.
 */

type Role = 'auto' | 'tune' | 'interpret';

interface Stage {
  label: { ko: string; en: string };
  actor: { ko: string; en: string };
  why: { ko: string; en: string };
  role: Role;
}

const STAGES: Stage[] = [
  {
    label: { ko: '관측', en: 'Observation' },
    actor: { ko: 'TESS 위성', en: 'TESS satellite' },
    why: { ko: '별빛의 밝기를 시간에 따라 기록합니다.', en: 'Records the star’s brightness over time.' },
    role: 'auto',
  },
  {
    label: { ko: '계기 보정', en: 'Calibration' },
    actor: { ko: 'TESS 과학팀 · 완료', en: 'TESS science team · done' },
    why: {
      ko: '검출기 잡음·잡광을 제거합니다. 우리는 이미 보정된 자료를 받습니다.',
      en: 'Removes detector noise and stray light. We receive already-calibrated data.',
    },
    role: 'auto',
  },
  {
    label: { ko: '자료 취득', en: 'Data retrieval' },
    actor: { ko: '플랫폼 자동', en: 'Platform · auto' },
    why: {
      ko: 'MAST 아카이브에서 대상 별 주변만 잘라 받습니다(cutout).',
      en: 'Downloads just the region around the target star (cutout) from the MAST archive.',
    },
    role: 'auto',
  },
  {
    label: { ko: '구경측광', en: 'Aperture photometry' },
    actor: { ko: '플랫폼 · 구경 조절 가능', en: 'Platform · you tune the aperture' },
    why: {
      ko: '별빛은 여러 픽셀에 퍼집니다. 구경(원) 안의 픽셀을 다 모아 별의 밝기를 재고, 바깥 고리로 하늘 배경을 빼줍니다.',
      en: 'Starlight spreads across pixels. Summing the pixels inside the aperture measures the star; the outer ring subtracts the sky background.',
    },
    role: 'tune',
  },
  {
    label: { ko: '차등측광', en: 'Differential photometry' },
    actor: { ko: '플랫폼 · 비교성 선택', en: 'Platform · you pick comparisons' },
    why: {
      ko: '망원경 흔들림·온도 변화는 사진 속 모든 별을 함께 흔듭니다. 비교성으로 나누면 그 공통 흔들림이 지워지고 목표별 고유의 변화만 남습니다.',
      en: 'Jitter and thermal drift move every star together. Dividing by comparison stars cancels that shared wobble, leaving only the target’s own change.',
    },
    role: 'tune',
  },
  {
    label: { ko: '모델 적합', en: 'Model fit' },
    actor: { ko: '플랫폼 · ROI 선택', en: 'Platform · you pick the ROI' },
    why: {
      ko: '광도곡선의 식 모양에 모델을 맞춰 식 깊이와 Rp/R*를 뽑아냅니다.',
      en: 'Fits a model to the transit dip to extract the depth and Rp/R*.',
    },
    role: 'tune',
  },
  {
    label: { ko: '해석·기록', en: 'Interpret' },
    // 다른 단계는 「TESS 위성」·「플랫폼 자동」처럼 주체를 이름으로 적는데 여기만
    // 1인칭이었다. 같은 형식으로 맞춘다(2026-09-06 소유자 지적).
    actor: { ko: '직접 해석', en: 'You decide' },
    why: {
      ko: 'NASA 문헌값과 비교하고, 차이의 근거와 한계를 스스로 설명합니다.',
      en: 'Compare with the NASA reference and explain the evidence and limits yourself.',
    },
    role: 'interpret',
  },
];

/**
 * 처음 보는 용어 미리보기. 현장 피드백: aperture·ROI·FWHM 같은 단어가 뒤에서
 * 설명 없이 먼저 나온다. Step 0이 전체 탐구의 첫 화면이라, 여기서 미리 정의하면
 * "처음 등장 전에 뜻을 안다". 접이식이라 아는 사람은 펼치지 않아 과부하가 없다.
 */
const GLOSSARY: { term: string; def: { ko: string; en: string } }[] = [
  {
    term: 'cutout',
    def: {
      ko: '넓은 관측 이미지에서 대상 별 주변만 잘라낸 작은 이미지 조각.',
      en: 'A small image patch cut from a wide observation, around the target star.',
    },
  },
  {
    term: 'sector',
    def: {
      ko: 'TESS가 하늘을 나눠 약 27일씩 관측하는 구역. 한 sector = 한 관측 기간.',
      en: 'A patch of sky TESS observes for ~27 days. One sector = one observing run.',
    },
  },
  {
    term: 'aperture (구경)',
    def: {
      ko: '별의 밝기를 잴 때 픽셀을 합산하는 원 모양 영역. 안쪽 원 = 별, 바깥 고리 = 하늘 배경.',
      en: 'The circle whose pixels are summed to measure a star. Inner circle = star, outer ring = sky background.',
    },
  },
  {
    term: 'FWHM',
    def: {
      ko: '별빛이 퍼진 폭(반치전폭). 점인 별이 대기·광학 때문에 번지는 정도.',
      en: 'Full width at half maximum — how wide a (point-like) star spreads out from atmosphere and optics.',
    },
  },
  {
    term: 'ROI (분석 구간)',
    def: {
      ko: 'Region of Interest. 광도곡선에서 모델을 맞출 구간(식 전후).',
      en: 'Region of Interest — the slice of the light curve (around the transit) the model is fit to.',
    },
  },
  // 현장 전문가 검토(2026-07)에서 한글 풀이를 요구받은 세 용어. 이 목록은 미리 보기용이고,
  // 실제로 값이 나오는 Step 4·5 화면에는 같은 뜻의 짧은 설명을 그 자리에 함께 둔다.
  {
    term: 'BTJD (시간축)',
    def: {
      ko: 'TESS가 쓰는 관측 시각. 일(day) 단위로 세며, 그래프의 가로축이 된다.',
      en: 'The time stamp TESS uses, counted in days; it becomes the graph’s horizontal axis.',
    },
  },
  {
    term: 'Rp/R* (반지름비)',
    def: {
      ko: '행성 반지름을 별 반지름으로 나눈 값. 별빛이 가려진 깊이에서 나오며, 이 탐구의 주요 산출값이다.',
      en: 'Planet radius divided by star radius — read off the transit depth; the main value this inquiry produces.',
    },
  },
  {
    term: 'χ²_red (적합 품질)',
    def: {
      ko: '모델 곡선이 관측점에서 벗어난 정도를 측정 오차로 나눠 평균한 값. 1에 가까울수록 모델이 자료를 잘 설명한다.',
      en: 'Average model-to-data mismatch scaled by measurement error; closer to 1 means the model explains the data well.',
    },
  },
];

export function TransitPipelineDiagram() {
  const lang = useLangStore((s) => s.lang);
  const ko = lang === 'ko';
  return (
    <section className="transit-pipeline">
      <span className="inquiry-panel-kicker">{ko ? '탐구 단계' : 'How the analysis flows'}</span>
      <p className="transit-pipeline-intro">
        {ko
          ? '주황으로 표시된 단계는 직접 정합니다. 나머지는 플랫폼이 계산합니다.'
          : 'The platform handles most steps automatically. The steps marked in orange below are yours — settings like comparisons and aperture, and the final interpretation. See why each step matters before you start.'}
      </p>
      <ol className="transit-pipeline-flow">
        {STAGES.map((stage, i) => (
          <li key={stage.label.en} className={`transit-pipeline-stage role-${stage.role}`}>
            <span className="transit-pipeline-num">{i + 1}</span>
            <div className="transit-pipeline-body">
              <div className="transit-pipeline-head">
                <strong>{stage.label[lang]}</strong>
                <span className="transit-pipeline-actor">{stage.actor[lang]}</span>
              </div>
              <p className="transit-pipeline-why">{stage.why[lang]}</p>
            </div>
          </li>
        ))}
      </ol>
      <details className="transit-glossary">
        <summary>{ko ? '처음 보는 용어 풀어보기' : 'Unfamiliar terms'}</summary>
        <dl className="transit-glossary-list">
          {GLOSSARY.map((entry) => (
            <div key={entry.term}>
              <dt>{entry.term}</dt>
              <dd>{entry.def[lang]}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
