import { useMemo } from 'react';
import { useLangStore } from '../../i18n';
import type { ClusterCmdResponse } from '../../api/client';
import {
  MEMBERSHIP_LABELS,
  applyMembership,
  type MembershipLevel,
} from '../../utils/clusterMembership';

const LEVELS: MembershipLevel[] = [0, 1, 2, 3, 4];
const W = 300;
const H = 210;

/**
 * Step 3 (분석 준비) for the cluster module.
 *
 * The step's job in this workflow is to let the learner see what a setting does
 * to the result before the real analysis — the transit module puts an aperture
 * sandbox here for the same reason. Until now the cluster module had nothing:
 * the step showed three lines of configuration text, so "what would happen if
 * the membership criteria changed?" (which its own 생각해보기 asks) could not
 * be answered by trying it.
 *
 * The knob is five named levels rather than a parallax value in mas. The
 * learner is judging "how strict", and the numbers that produces are shown
 * underneath rather than typed in — the analysis conditions stay visible
 * without becoming the thing to operate.
 */
export function ClusterMembershipSandbox({
  data,
  level,
  onLevelChange,
}: {
  data: ClusterCmdResponse;
  level: MembershipLevel;
  onLevelChange: (level: MembershipLevel) => void;
}) {
  const lang = useLangStore((s) => s.lang);
  const ko = lang === 'ko';

  const { current, standard, all } = useMemo(
    () => ({
      current: applyMembership(data, level),
      standard: applyMembership(data, 2),
      all: data.members,
    }),
    [data, level],
  );

  // One frame for every level so the diagram does not rescale as the learner
  // moves the knob — the point is that stars appear and disappear, and a moving
  // axis hides exactly that.
  const bounds = useMemo(() => {
    const colours = all.map((m) => m.bp_rp);
    const mags = all.map((m) => m.g_mag);
    const q = (xs: number[], p: number) => {
      const sorted = [...xs].sort((a, b) => a - b);
      return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
    };
    return {
      cMin: q(colours, 0.01) - 0.1,
      cMax: q(colours, 0.99) + 0.1,
      gMin: q(mags, 0.005) - 0.3,
      gMax: q(mags, 0.995) + 0.3,
    };
  }, [all]);

  const x = (c: number) => 34 + ((c - bounds.cMin) / (bounds.cMax - bounds.cMin || 1)) * (W - 46);
  const y = (g: number) => 10 + ((g - bounds.gMin) / (bounds.gMax - bounds.gMin || 1)) * (H - 34);

  const kept = new Set(current.members.map((m) => m.source_id));
  const pct = all.length ? Math.round((current.members.length / all.length) * 100) : 0;
  const vsStandard = current.members.length - standard.members.length;

  return (
    <section className="inquiry-info-panel cluster-membership">
      <span className="inquiry-panel-kicker">
        {ko ? '성단 구성원 선별 기준 바꿔 보기' : 'Try changing the membership criteria'}
      </span>

      <p className="cluster-membership-lead">
        {ko
          ? '성단의 별들은 함께 태어나 함께 움직입니다. 그래서 거리(시차)와 하늘에서 움직이는 방향·빠르기(고유운동)가 서로 비슷한 별을 구성원으로 봅니다. 기준을 얼마나 엄격하게 잡을지 바꿔 보고, 색-등급도가 어떻게 달라지는지 확인하세요. 여기서 정한 기준은 다음 단계의 분석에 그대로 쓰입니다.'
          : 'Cluster stars were born together and move together, so members are picked by having a similar distance (parallax) and a similar motion across the sky (proper motion). Change how strict that test is and watch the diagram. What you set here carries into the analysis in the next step.'}
      </p>

      <div className="cluster-membership-body">
        <div className="cluster-membership-controls">
          <div className="param-row">
            <label>
              {ko ? '성단 구성원 선별' : 'Selection'}:{' '}
              <strong>{MEMBERSHIP_LABELS[level][ko ? 'ko' : 'en']}</strong>
              {level === 2 && (
                <span className="cmd-fit-sub">{ko ? '문헌이 쓴 기준' : 'the published window'}</span>
              )}
            </label>
            <input
              type="range"
              min={0}
              max={LEVELS.length - 1}
              step={1}
              value={level}
              onChange={(e) => onLevelChange(Number(e.target.value) as MembershipLevel)}
            />
            <div className="cluster-membership-ticks">
              {LEVELS.map((l) => (
                <span key={l} className={l === level ? 'on' : undefined}>
                  {MEMBERSHIP_LABELS[l][ko ? 'ko' : 'en']}
                </span>
              ))}
            </div>
          </div>

          <dl className="cluster-data-cut-list">
            <div>
              <dt>{ko ? '남은 별' : 'Stars kept'}</dt>
              <dd>
                {current.members.length.toLocaleString()} / {all.length.toLocaleString()} ({pct}%)
              </dd>
            </div>
            <div>
              <dt>{ko ? '시차 범위' : 'Parallax range'}</dt>
              <dd>
                {current.window.parallaxMin.toFixed(2)} ~ {current.window.parallaxMax.toFixed(2)} mas
              </dd>
            </div>
            <div>
              <dt>{ko ? '고유운동 허용' : 'Proper-motion tolerance'}</dt>
              <dd>
                {current.window.pmTolerance == null
                  ? ko
                    ? '조건 없음'
                    : 'none'
                  : `± ${current.window.pmTolerance.toFixed(1)} mas/yr`}
              </dd>
            </div>
            <div>
              <dt>{ko ? '표준 기준과 견주면' : 'Against the standard'}</dt>
              <dd>
                {vsStandard === 0
                  ? ko
                    ? '같음'
                    : 'same'
                  : `${vsStandard > 0 ? '+' : ''}${vsStandard.toLocaleString()}${ko ? '개' : ''}`}
              </dd>
            </div>
          </dl>
        </div>

        <figure className="cluster-membership-figure">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ko ? '색-등급도 미리 보기' : 'CMD preview'}>
            <line x1={34} y1={6} x2={34} y2={H - 24} className="ti-axis" />
            <line x1={34} y1={H - 24} x2={W - 12} y2={H - 24} className="ti-axis" />
            <text x={30} y={14} className="ti-axis-label" textAnchor="end">
              {ko ? '밝음' : 'bright'}
            </text>
            <text x={W - 12} y={H - 8} className="ti-axis-label" textAnchor="end">
              {ko ? '색 (BP−RP) →' : 'colour →'}
            </text>
            {all.map((m) => {
              const inside = kept.has(m.source_id);
              return (
                <circle
                  key={m.source_id}
                  cx={x(m.bp_rp)}
                  cy={y(m.g_mag)}
                  r={inside ? 1.3 : 0.9}
                  className={inside ? 'cm-in' : 'cm-out'}
                />
              );
            })}
          </svg>
          <figcaption>
            {ko
              ? '주황이 구성원으로 남은 별, 회색이 걸러진 별입니다. 축은 고정돼 있어 별이 늘고 주는 것이 그대로 보입니다.'
              : 'Orange stars pass the test, grey ones are filtered out. The axes stay fixed so what changes is which stars remain.'}
          </figcaption>
        </figure>
      </div>

      <p className="cluster-membership-note">
        {ko
          ? '기준을 느슨하게 하면 성단과 무관한 배경별이 섞여 주계열의 띠가 두꺼워지고, 엄격하게 하면 띠는 또렷해지지만 별 수가 줄어 전향점처럼 별이 드문 곳이 잘 안 보이게 됩니다. 어느 쪽이 옳다기보다 무엇을 보려는지에 따라 달라집니다.'
          : 'Loosen it and unrelated field stars come in, thickening the main sequence; tighten it and the sequence sharpens but fewer stars remain, so sparse features such as the turn-off get harder to see. Neither is simply correct — it depends on what you are trying to see.'}
      </p>
    </section>
  );
}
