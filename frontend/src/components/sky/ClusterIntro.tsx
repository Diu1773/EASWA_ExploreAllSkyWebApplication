import { useLangStore } from '../../i18n';
import { INTRO_CLUSTERS, type IntroCluster } from './clusterIntroData';
import m45Photo from '../../assets/cluster-m45-pleiades.jpg';
import m13Photo from '../../assets/cluster-m13-hercules.jpg';

/**
 * Intro for the open-cluster CMD module (Step 0). Each cluster is shown as a
 * [photo ↔ real Gaia DR3 CMD] pair so learners match the cluster's look to its
 * diagram: a young open cluster (blue stars, high blue turn-off) vs an old
 * globular (dense, red-giant branch, low turn-off). Mirrors the 2022 curriculum
 * "색등급도로 성단의 나이" activity. Data: ./clusterIntroData.ts (real, downsampled).
 */

const PHOTO: Record<string, string> = { m45: m45Photo, m13: m13Photo };

function colorFor(c: number): string {
  if (c < 0.4) return '#9ec5ff';
  if (c < 0.8) return '#cfe0ff';
  if (c < 1.2) return '#eef2f7';
  if (c < 1.7) return '#ffe39b';
  if (c < 2.2) return '#ffb877';
  return '#ff7a6b';
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

// Turn-off taken from the actual plotted points so the marker always sits on data.
// Young open cluster: the brightest blue main-sequence star (its tip).
// Globular: a known astrophysical turn-off (faint, below the giant branch) from the data file.
function turnoffFor(cluster: IntroCluster): [number, number] {
  if (cluster.id === 'm13') {
    // Snap the catalog turn-off to the nearest point on the DENSE main-sequence
    // locus: isolated blue stragglers/field stars are excluded by requiring
    // neighbours, and color differences weigh heavily so the marker cannot
    // drift blueward off the sequence.
    const dense = cluster.points.filter(
      (p) =>
        cluster.points.filter(
          (q) => Math.abs(q[0] - p[0]) < 0.08 && Math.abs(q[1] - p[1]) < 0.4,
        ).length >= 4,
    );
    const pool = dense.length ? dense : cluster.points;
    const [tc, tg] = cluster.turnoff;
    const d = (p: [number, number]) => ((p[0] - tc) / 0.25) ** 2 + ((p[1] - tg) / 4) ** 2;
    return pool.reduce((best, p) => (d(p) < d(best) ? p : best), pool[0]);
  }
  // Young open cluster: the main-sequence tip = brightest blue member.
  const blue = cluster.points.filter((p) => p[0] < 0.6);
  const src = blue.length ? blue : cluster.points;
  return src.reduce((best, p) => (p[1] < best[1] ? p : best), src[0]);
}

function CmdSvg({ cluster, ko }: { cluster: IntroCluster; ko: boolean }) {
  const W = 300;
  const H = 188;
  const left = 30;
  const right = W - 12;
  const top = 12;
  const bottom = H - 26;

  const cs = cluster.points.map((p) => p[0]).sort((a, b) => a - b);
  const gs = cluster.points.map((p) => p[1]).sort((a, b) => a - b);
  const [toC, toG] = turnoffFor(cluster);
  // clip axis range to robust percentiles so a few outliers don't stretch it,
  // but always include the turn-off marker so it is never clamped to an edge
  const cMin = Math.min(pct(cs, 0.01), toC - 0.15);
  const cMax = Math.max(pct(cs, 0.99), toC + 0.05);
  const gMin = Math.min(pct(gs, 0.005), toG - 0.9);
  const gMax = Math.max(pct(gs, 0.995), toG + 0.3);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const xFor = (c: number) => left + ((clamp(c, cMin, cMax) - cMin) / (cMax - cMin)) * (right - left);
  const yFor = (g: number) => top + ((clamp(g, gMin, gMax) - gMin) / (gMax - gMin)) * (bottom - top); // bright (small g) at top

  const [tc, tg] = [toC, toG];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cluster-intro-cmd-svg" role="img" aria-label={ko ? '색-등급도' : 'CMD'}>
      <line x1={left} y1={top - 4} x2={left} y2={bottom} className="ti-axis" />
      <line x1={left} y1={bottom} x2={right} y2={bottom} className="ti-axis" />
      <text x={left - 4} y={top + 4} className="ti-axis-label" textAnchor="end">{ko ? '밝음' : 'bright'}</text>
      <text x={right} y={bottom + 16} className="ti-axis-label" textAnchor="end">{ko ? '색 (BP−RP) →' : 'color →'}</text>
      {cluster.points.map(([c, g], i) => (
        <circle key={i} cx={xFor(c)} cy={yFor(g)} r={1.5} fill={colorFor(c)} opacity={0.85} />
      ))}
      <circle cx={xFor(tc)} cy={yFor(tg)} r={7} className="ti-turnoff-ring" />
      <text
        x={xFor(tc) < (left + right) / 2 ? xFor(tc) + 11 : xFor(tc) - 11}
        y={yFor(tg) < (top + bottom) / 2 ? yFor(tg) + 16 : yFor(tg) - 9}
        className="ti-note"
        textAnchor={xFor(tc) < (left + right) / 2 ? 'start' : 'end'}
      >
        {ko ? '전향점' : 'turn-off'}
      </text>
    </svg>
  );
}

function ageLabel(ageGyr: number, ko: boolean): string {
  if (!ko) return `${ageGyr} Gyr`;
  const eok = ageGyr * 10; // Gyr → 억 년
  return `약 ${eok % 1 === 0 ? eok : eok.toFixed(1)}억 년`;
}

export function ClusterIntro() {
  const lang = useLangStore((s) => s.lang);
  const ko = lang === 'ko';

  return (
    <div className="topic-intro">
      <div className="cluster-intro-grid">
        {INTRO_CLUSTERS.map((cl) => (
          <article className="cluster-intro-card" key={cl.id}>
            <img
              className="cluster-intro-photo"
              src={PHOTO[cl.id]}
              alt={ko ? `${cl.nameKo} 사진` : `${cl.nameEn} photo`}
              loading="lazy"
            />
            <div className="cluster-intro-body">
              <div className="cluster-intro-head">
                <strong>{ko ? cl.nameKo : cl.nameEn}</strong>
                <span className="cluster-intro-tag">
                  {(ko ? cl.tagKo : cl.tagEn)} · {ageLabel(cl.ageGyr, ko)}
                </span>
              </div>
              <CmdSvg cluster={cl} ko={ko} />
            </div>
          </article>
        ))}
      </div>
      <p className="topic-intro-caption">
        {ko
          ? '왼쪽은 실제 성단 사진, 오른쪽은 그 성단의 실제 Gaia DR3 색-등급도입니다. 주계열이 꺾이는 전향점을 비교해 보세요 — 젊은 산개성단(플레이아데스)은 파란(뜨거운) 별까지 주계열에 남아 전향점이 왼쪽 위에 있고, 늙은 구상성단(M13)은 무거운 별이 모두 진화해 전향점이 오른쪽 아래로 내려가고 적색거성가지가 뚜렷합니다. Step 4에서 직접 성단을 골라 같은 색-등급도로 나이·거리를 구합니다.'
          : "Left: a real photo of each cluster; right: that cluster's real Gaia DR3 color–magnitude diagram. Compare the main-sequence turn-off — the young open cluster (Pleiades) keeps blue, hot stars on the sequence so its turn-off is upper-left, while the old globular (M13) has lost its massive stars, so the turn-off drops down-right and a red-giant branch stands out. In Step 4 you pick a cluster and read its age and distance from the same kind of diagram."}
      </p>
      <p className="cluster-intro-credit">
        {ko
          ? '사진: 플레이아데스 — NASA/ESA/AURA·Caltech · M13 — ESA/Hubble & NASA (퍼블릭 도메인) · 자료: ESA Gaia DR3 (구성원 표본)'
          : 'Photos: Pleiades — NASA/ESA/AURA·Caltech · M13 — ESA/Hubble & NASA (public domain) · Data: ESA Gaia DR3 (member sample)'}
      </p>
    </div>
  );
}
