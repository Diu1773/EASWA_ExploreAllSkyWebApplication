import type { ClusterCmdResponse, ClusterInfo, ClusterMember } from '../api/client';

/**
 * Which stars count as cluster members, on one knob.
 *
 * The server sends more stars than the published membership window so this can
 * be loosened as well as tightened — Step 3 asks what happens when the criteria
 * change, and that is unanswerable if the field stars were already removed.
 *
 * Five named levels rather than a free number: the learner is choosing "how
 * strict", not calibrating a threshold, and a bare σ or mas value is a question
 * they have no way to answer. 표준 is the window published with the cluster
 * parameters (Cantat-Gaudin et al. 2020), so the default diagram is the one the
 * literature values belong to.
 */
export type MembershipLevel = 0 | 1 | 2 | 3 | 4;

export const DEFAULT_MEMBERSHIP_LEVEL: MembershipLevel = 2;

export const MEMBERSHIP_LABELS: Record<MembershipLevel, { ko: string; en: string }> = {
  0: { ko: '아주 느슨', en: 'Very loose' },
  1: { ko: '느슨', en: 'Loose' },
  2: { ko: '표준', en: 'Standard' },
  3: { ko: '엄격', en: 'Strict' },
  4: { ko: '아주 엄격', en: 'Very strict' },
};

/** Multiplier on the published window: 1.0 at 표준, wider below, tighter above. */
const WINDOW_SCALE: Record<MembershipLevel, number> = {
  0: 2.5,
  1: 1.6,
  2: 1.0,
  3: 0.6,
  4: 0.35,
};

export interface MembershipWindow {
  parallaxMin: number;
  parallaxMax: number;
  pmCentreRa: number;
  pmCentreDec: number;
  pmTolerance: number | null;
}

export function membershipWindow(cluster: ClusterInfo, level: MembershipLevel): MembershipWindow {
  const scale = WINDOW_SCALE[level];
  const centre = (cluster.plx_min + cluster.plx_max) / 2;
  const half = ((cluster.plx_max - cluster.plx_min) / 2) * scale;
  return {
    parallaxMin: Math.max(0.001, centre - half),
    parallaxMax: centre + half,
    pmCentreRa: cluster.pmra_c,
    pmCentreDec: cluster.pmdec_c,
    pmTolerance: cluster.pm_tol == null ? null : cluster.pm_tol * scale,
  };
}

export function isMember(member: ClusterMember, window: MembershipWindow): boolean {
  const { parallax, pmra, pmdec } = member;
  if (parallax == null || parallax < window.parallaxMin || parallax > window.parallaxMax) {
    return false;
  }
  if (window.pmTolerance == null) return true;
  if (pmra == null || pmdec == null) return false;
  return (
    Math.abs(pmra - window.pmCentreRa) <= window.pmTolerance &&
    Math.abs(pmdec - window.pmCentreDec) <= window.pmTolerance
  );
}

export interface MembershipResult {
  window: MembershipWindow;
  members: ClusterMember[];
  /** Everything the server sent, before the window is applied. */
  fetched: number;
}

export function applyMembership(
  data: ClusterCmdResponse,
  level: MembershipLevel,
): MembershipResult {
  const window = membershipWindow(data.cluster, level);
  return {
    window,
    members: data.members.filter((member) => isMember(member, window)),
    fetched: data.members.length,
  };
}

/** The response as the rest of the app should see it once a level is chosen. */
export function withMembership(
  data: ClusterCmdResponse,
  level: MembershipLevel,
): { data: ClusterCmdResponse; result: MembershipResult } {
  const result = applyMembership(data, level);
  return {
    data: { ...data, members: result.members, member_count: result.members.length },
    result,
  };
}
