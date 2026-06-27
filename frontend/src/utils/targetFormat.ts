import type { Target } from '../types/target';
import type { Lang } from '../i18n';

type TFn = (key: string, fallback?: string) => string;

export function formatTargetSource(
  source: string | null | undefined,
  t: TFn
): string | null {
  if (!source) return null;
  if (source === 'nasa_exoplanet_archive') return t('detail.source.nasaArchive');
  if (source === 'curated_fallback') return t('detail.source.curatedFallback');
  return source.replace(/_/g, ' ');
}

export function formatTargetType(type: string | null | undefined, t: TFn): string {
  if (type === 'Transit Planet') return t('detail.type.transitPlanet');
  return type ?? '';
}

/** "12.30 V host" → 언어별 라벨 ("12.30 V host" / "12.30 V 등급 (주성)") */
export function formatMagnitude(range: string, t: TFn): string {
  const match = range.match(/^([\d.+-]+)\s*V\s*host$/i);
  if (match) return `${match[1]} ${t('detail.vHost')}`;
  return range;
}

/** IAU 88개 별자리 영문 → 한글 이름 매핑 */
const CONSTELLATION_KO: Record<string, string> = {
  Andromeda: '안드로메다자리', Antlia: '공기펌프자리', Apus: '극락조자리',
  Aquarius: '물병자리', Aquila: '독수리자리', Ara: '제단자리',
  Aries: '양자리', Auriga: '마차부자리', Bootes: '목동자리',
  Caelum: '조각칼자리', Camelopardalis: '기린자리', Cancer: '게자리',
  'Canes Venatici': '사냥개자리', 'Canis Major': '큰개자리', 'Canis Minor': '작은개자리',
  Capricornus: '염소자리', Carina: '용골자리', Cassiopeia: '카시오페이아자리',
  Centaurus: '센타우루스자리', Cepheus: '세페우스자리', Cetus: '고래자리',
  Chamaeleon: '카멜레온자리', Circinus: '컴퍼스자리', Columba: '비둘기자리',
  'Coma Berenices': '머리털자리', 'Corona Australis': '남쪽왕관자리', 'Corona Borealis': '북쪽왕관자리',
  Corvus: '까마귀자리', Crater: '컵자리', Crux: '남십자자리',
  Cygnus: '백조자리', Delphinus: '돌고래자리', Dorado: '황새치자리',
  Draco: '용자리', Equuleus: '조랑말자리', Eridanus: '에리다누스자리',
  Fornax: '화로자리', Gemini: '쌍둥이자리', Grus: '두루미자리',
  Hercules: '헤르쿨레스자리', Horologium: '시계자리', Hydra: '바다뱀자리',
  Hydrus: '물뱀자리', Indus: '인디언자리', Lacerta: '도마뱀자리',
  Leo: '사자자리', 'Leo Minor': '작은사자자리', Lepus: '토끼자리',
  Libra: '천칭자리', Lupus: '이리자리', Lynx: '살쾡이자리',
  Lyra: '거문고자리', Mensa: '테이블산자리', Microscopium: '현미경자리',
  Monoceros: '외뿔소자리', Musca: '파리자리', Norma: '직각자자리',
  Octans: '팔분의자리', Ophiuchus: '뱀주인자리', Orion: '오리온자리',
  Pavo: '공작자리', Pegasus: '페가수스자리', Perseus: '페르세우스자리',
  Phoenix: '불사조자리', Pictor: '화가자리', Pisces: '물고기자리',
  'Piscis Austrinus': '남쪽물고기자리', Puppis: '고물자리', Pyxis: '나침반자리',
  Reticulum: '그물자리', Sagitta: '화살자리', Sagittarius: '궁수자리',
  Scorpius: '전갈자리', Sculptor: '조각가자리', Scutum: '방패자리',
  Serpens: '뱀자리', Sextans: '육분의자리', Taurus: '황소자리',
  Telescopium: '망원경자리', Triangulum: '삼각형자리', 'Triangulum Australe': '남쪽삼각형자리',
  Tucana: '큰부리새자리', 'Ursa Major': '큰곰자리', 'Ursa Minor': '작은곰자리',
  Vela: '돛자리', Virgo: '처녀자리', Volans: '날치자리', Vulpecula: '여우자리',
};

export function formatConstellation(name: string | null | undefined, lang: Lang): string {
  if (!name) return '';
  if (lang === 'ko') return CONSTELLATION_KO[name] ?? name;
  return name;
}

/** transit_depth/period/duration 숫자 필드로 언어별 설명 문장 생성 */
export function buildTargetDescription(target: Target, lang: Lang): string {
  const depth = target.transit_depth_pct;
  const period = target.period_days;
  const duration = target.transit_duration_hours;
  if (target.topic_id === 'microlensing' && lang === 'en') {
    if (target.type === 'ML-P') {
      return `${target.name} is a KMTNet microlensing event with a candidate planetary anomaly. Compare the multi-site coverage and inspect departures from a single-lens model.`;
    }
    if (target.type === 'ML-HM') {
      return `${target.name} is a high-magnification KMTNet microlensing event. Inspect how the three observatories cover the peak.`;
    }
    return `${target.name} is a KMTNet single-lens microlensing event toward the Galactic bulge.`;
  }
  if (depth == null || period == null) return target.description;

  if (lang === 'ko') {
    let text = `${target.name}의 식 깊이는 ${depth.toFixed(2)}%이고 공전 주기는 ${period.toFixed(3)}일이다.`;
    if (duration != null) text += ` 일반적인 식 지속 시간은 ${duration.toFixed(2)}시간이다.`;
    return text;
  }
  let text = `${target.name} has a transit depth of ${depth.toFixed(2)}% and an orbital period of ${period.toFixed(3)} d.`;
  if (duration != null) text += ` Typical transit duration is ${duration.toFixed(2)} h.`;
  return text;
}
