import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { fetchClusterCmd, type ClusterCmdResponse } from '../../api/client';
import type { Target } from '../../types/target';
import { useLangStore } from '../../i18n';
import { clusterCmdAdapter } from '../../explorationBlocks/adapters/clusterCmdAdapter';
import type { ExplorationModuleConfig } from '../../explorationBlocks/types';
import { InquiryLayout } from '../inquiry';
import { ClusterCmdVisualizer, type ClusterFitInfo } from '../lab/ClusterCmdVisualizer';
import { SkyExplorer } from '../sky/SkyExplorer';
import { ClusterIntro } from '../sky/ClusterIntro';

interface ClusterModuleViewProps {
  module: ExplorationModuleConfig;
}

export function ClusterModuleView({ module }: ClusterModuleViewProps) {
  const lang = useLangStore((state) => state.lang);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('cluster') ?? '';
  const setTopic = useAppStore((state) => state.setTopic);

  const handleSelectCluster = (selected: Target) => {
    const next = new URLSearchParams(searchParams);
    next.set('cluster', selected.id);
    setSearchParams(next, { replace: false });
  };

  const [data, setData] = useState<ClusterCmdResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fitInfo, setFitInfo] = useState<ClusterFitInfo | null>(null);

  // Drive the embedded sky map (Step 1) to show open-cluster targets.
  useEffect(() => {
    setTopic('open_cluster_cmd');
  }, [setTopic]);

  useEffect(() => {
    setFitInfo(null);
    if (!selectedId) {
      setData(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchClusterCmd(selectedId)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((err: unknown) => {
        if (active) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Failed to load cluster data');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const contextSlot = data ? (
    <div className="inquiry-target-context">
      <div>
        <span className="inquiry-target-context-kicker">{lang === 'ko' ? '선택한 성단' : 'Selected cluster'}</span>
        <strong>{lang === 'ko' ? data.cluster.name_ko : data.cluster.name}</strong>
        <span className="inquiry-target-context-meta">
          {`${data.member_count.toLocaleString()} ${lang === 'ko' ? '구성원' : 'members'}`}
        </span>
      </div>
    </div>
  ) : null;

  const selectionSlot = (
    <div className="inquiry-sky-embed">
      <p className="inquiry-sky-embed-hint">
        {data
          ? lang === 'ko'
            ? `현재 선택: ${data.cluster.name_ko} — 다른 성단을 클릭하면 바꿉니다.`
            : `Selected: ${data.cluster.name} — click another cluster to change.`
          : lang === 'ko'
            ? '전천 지도에서 성단을 클릭해 선택하세요.'
            : 'Click a cluster on the sky map to select it.'}
      </p>
      <SkyExplorer
        embedded
        onSelectTarget={handleSelectCluster}
        focusTargetId={selectedId || null}
      />
    </div>
  );

  const analysisSlot = useMemo(() => {
    if (loading) {
      return (
        <div className="inquiry-lab-handoff">
          <p>{lang === 'ko' ? 'Gaia DR3에서 성단 측광을 불러오는 중…' : 'Loading cluster photometry from Gaia DR3…'}</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="inquiry-lab-handoff">
          <p style={{ color: '#fca5a5' }}>
            {(lang === 'ko' ? '데이터를 불러오지 못했습니다: ' : 'Could not load data: ') + error}
          </p>
        </div>
      );
    }
    if (data) {
      return <ClusterCmdVisualizer data={data} onFitChange={setFitInfo} />;
    }
    return (
      <div className="inquiry-lab-handoff">
        <p>{lang === 'ko' ? '먼저 Step 1에서 성단을 선택하세요.' : 'Select a cluster in Step 1 first.'}</p>
      </div>
    );
  }, [loading, error, data, lang]);

  const context = useMemo(() => ({ clusterData: data }), [data]);

  const comparisonSlot = fitInfo && data ? (() => {
    const ko = lang === 'ko';
    const ref = data.cluster;
    const pct = (mine: number, lit: number) => (lit ? `${(((mine - lit) / lit) * 100).toFixed(0)}%` : '—');
    const signed = (v: number, digits: number) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
    const refAgeGyr = ref.ref_age_gyr;
    const rows: Array<{ label: string; mine: string; parallax: string; lit: string; diff: string }> = [
      {
        label: ko ? '거리 (pc)' : 'Distance (pc)',
        mine: fitInfo.distancePc.toFixed(0),
        parallax: fitInfo.priorDistancePc.toFixed(0),
        lit: ref.ref_distance_pc.toFixed(0),
        diff: pct(fitInfo.distancePc, ref.ref_distance_pc),
      },
      {
        label: ko ? '거리계수 m-M' : 'Distance modulus m-M',
        mine: fitInfo.distanceModulus.toFixed(2),
        parallax: fitInfo.priorModulus.toFixed(2),
        lit: ref.ref_distance_modulus.toFixed(2),
        diff: `${signed(fitInfo.distanceModulus - ref.ref_distance_modulus, 2)} mag`,
      },
      {
        label: ko ? '나이 (Gyr)' : 'Age (Gyr)',
        mine: fitInfo.ageGyr.toFixed(2),
        parallax: '—',
        lit: refAgeGyr.toFixed(2),
        diff: pct(fitInfo.ageGyr, refAgeGyr),
      },
      {
        label: ko ? '나이 log(t/yr)' : 'Age log(t/yr)',
        mine: fitInfo.logAge.toFixed(1),
        parallax: '—',
        lit: ref.ref_logage.toFixed(2),
        diff: signed(fitInfo.logAge - ref.ref_logage, 2),
      },
      {
        label: ko ? '소광 A_V (mag)' : 'Extinction A_V (mag)',
        mine: fitInfo.av.toFixed(2),
        parallax: '—',
        lit: ref.ref_av.toFixed(2),
        diff: `${signed(fitInfo.av - ref.ref_av, 2)} mag`,
      },
    ];
    return (
      <section className="inquiry-info-panel">
        <span className="inquiry-panel-kicker">
          {ko ? '내가 맞춘 값, Gaia 시차, 문헌값' : 'Your fit, Gaia parallax, literature'}
        </span>
        <h3>{ko ? ref.name_ko : ref.name}</h3>
        <table className="inquiry-compare-table">
          <thead>
            <tr>
              <th>{ko ? '항목' : 'Quantity'}</th>
              <th>{ko ? '내 등시선 맞춤' : 'My isochrone fit'}</th>
              <th>{ko ? '시차 기반 (Gaia)' : 'Parallax (Gaia)'}</th>
              <th>{ko ? '문헌값' : 'Literature'}</th>
              <th>{ko ? '내 값과 문헌값의 차이' : 'Fit minus literature'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.mine}</td>
                <td>{row.parallax}</td>
                <td>{row.lit}</td>
                <td>{row.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="inquiry-compare-source">
          {ko ? '문헌값 출처: ' : 'Literature source: '}
          {ref.reference}
          {ko
            ? '. 문헌 거리는 Gaia 시차 기반이고, 나이와 소광은 그 논문의 신경망 추정값입니다.'
            : '. The literature distance is parallax-based; age and extinction are that paper\'s neural-network estimates.'}
        </p>
        <div className="inquiry-callout">
          {ko
            ? '세 값 중 문헌과 가장 많이 어긋난 것은 무엇입니까. 그 차이를 소광 보정, 구성원 오염, 등시선 모델 가정(금속함량 고정, 쌍성 미고려) 중 무엇으로 설명할 수 있습니까. 거리와 소광은 서로 바꿔 맞출 수 있으므로, 한쪽을 문헌값에 두고 다른 쪽을 다시 맞춰 보십시오.'
            : 'Which of the three values departs most from the literature? Can extinction, member contamination, or the isochrone assumptions (fixed metallicity, no binaries) explain it? Distance and extinction trade off, so fix one at the literature value and refit the other.'}
        </div>
      </section>
    );
  })() : (
    <div className="inquiry-lab-handoff">
      <p>
        {lang === 'ko'
          ? 'Step 4에서 등시선을 맞춘 뒤, 그 나이·거리·소광을 시차 거리와 문헌값과 비교합니다.'
          : 'Fit the isochrone in Step 4, then compare its age, distance and extinction with the parallax distance and the literature here.'}
      </p>
    </div>
  );

  return (
    <InquiryLayout
      module={module}
      adapter={clusterCmdAdapter}
      context={context}
      introSlot={<ClusterIntro />}
      contextSlot={contextSlot}
      selectionSlot={selectionSlot}
      selectionConfirm={{
        ready: Boolean(selectedId),
        label: { ko: '이 성단으로 확인', en: 'Confirm this cluster' },
        hint: { ko: '먼저 지도에서 성단을 선택하세요.', en: 'Select a cluster on the map first.' },
      }}
      analysisSlot={analysisSlot}
      comparisonSlot={comparisonSlot}
      draftTargetId={selectedId}
    />
  );
}
