/**
 * Graph axis titles arrive from the API in English ("HJD", "Phase",
 * "Magnitude", "Gaia BP - RP"). On the July 2026 field review a teacher wrote
 * that the axes did not say what they show and asked for the variable and its
 * unit to be spelled out where the graph appears, not only in a glossary.
 *
 * These helpers translate the DISPLAY string only. Callers that branch on the
 * raw label (magnitude autorange, residual formatting) must keep reading the
 * original value — renaming for display must not change plot behaviour.
 */

type Lang = 'ko' | 'en';

const AXIS_TITLE_KO: Record<string, string> = {
  hjd: '관측 시각 HJD (일)',
  btjd: '관측 시각 BTJD (일)',
  phase: '위상 (0~1)',
  'orbital phase': '공전 위상 (0~1)',
  '공전 위상': '공전 위상 (0~1)',
  'normalized flux': '정규화 밝기 (평소가 1)',
  '정규화 flux': '정규화 밝기 (평소가 1)',
  'delta mag': '밝기 변화 (mag)',
  '등급 변화량': '밝기 변화 (mag)',
  magnitude: '밝기 등급 (mag, 작을수록 밝음)',
  'i-band magnitude (kmtnet pysis difference photometry)':
    'I 필터 등급 (mag, 작을수록 밝음)',
  'relative magnitude from actual kmtnet cutouts':
    '기준 밝기와의 차 (mag)',
  // 성단 그래프는 가로축 아래에 범례가 붙는다. 라벨이 길면 겹쳐서 둘 다 못
  // 읽으므로(2026-09-06 화면 확인) 뜻과 방향만 남기고 짧게 쓴다.
  'gaia bp - rp': '색지수 BP−RP (클수록 붉은 별)',
  'gaia g': '겉보기 등급 G (작을수록 밝음)',
};

/** Korean axis title for a raw API label; other languages pass through. */
export function axisTitle(label: string, lang: Lang): string {
  if (lang !== 'ko') return label;
  return AXIS_TITLE_KO[label.trim().toLowerCase()] ?? label;
}
