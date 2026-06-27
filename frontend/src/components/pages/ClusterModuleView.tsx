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
      <SkyExplorer embedded onSelectTarget={handleSelectCluster} />
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

  const comparisonSlot = fitInfo && data ? (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">
        {lang === 'ko' ? '맞춘 거리 ↔ 시차 거리 (Gaia)' : 'Fitted distance ↔ parallax (Gaia)'}
      </span>
      <h3>{lang === 'ko' ? data.cluster.name_ko : data.cluster.name}</h3>
      <table className="inquiry-compare-table">
        <thead>
          <tr>
            <th>{lang === 'ko' ? '항목' : 'Quantity'}</th>
            <th>{lang === 'ko' ? '주계열 맞춤(내 추정)' : 'MS fit (yours)'}</th>
            <th>{lang === 'ko' ? '시차 기반(Gaia)' : 'Parallax (Gaia)'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{lang === 'ko' ? '거리 (pc)' : 'Distance (pc)'}</td>
            <td>{fitInfo.distancePc.toFixed(0)}</td>
            <td>{fitInfo.priorDistancePc.toFixed(0)}</td>
          </tr>
          <tr>
            <td>{lang === 'ko' ? '거리계수 m-M' : 'Distance modulus'}</td>
            <td>{fitInfo.distanceModulus.toFixed(2)}</td>
            <td>{fitInfo.priorModulus.toFixed(2)}</td>
          </tr>
          <tr>
            <td>{lang === 'ko' ? '적색화 E(B-V)' : 'Reddening E(B-V)'}</td>
            <td>{fitInfo.reddening.toFixed(2)}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
      <div className="inquiry-callout">
        {lang === 'ko'
          ? '두 거리가 다르다면 소광 보정·구성원 오염·표준 주계열 가정 중 무엇으로 설명할 수 있나요? 시차는 직접 측정값이고, 맞춘 거리는 표준 주계열 가정에 의존합니다.'
          : 'If the two differ, what explains it — extinction, member contamination, or the standard-sequence assumption? Parallax is a direct measurement; the fit depends on the assumed sequence.'}
      </div>
    </section>
  ) : (
    <div className="inquiry-lab-handoff">
      <p>
        {lang === 'ko'
          ? 'Step 4에서 주계열을 맞춘 뒤, 그 거리를 시차 거리와 비교합니다.'
          : 'Fit the main sequence in Step 4, then compare that distance with the parallax distance here.'}
      </p>
    </div>
  );

  const recordSave = data
    ? {
        workflow: 'cluster_cmd',
        templateId: 'cluster_record',
        targetId: selectedId,
        title: lang === 'ko' ? data.cluster.name_ko : data.cluster.name,
        context: {
          source: 'cluster-block',
          cluster: { id: data.cluster.id, name: data.cluster.name, member_count: data.member_count },
          ms_fit: fitInfo
            ? {
                distance_pc: fitInfo.distancePc,
                distance_modulus: fitInfo.distanceModulus,
                reddening: fitInfo.reddening,
                parallax_distance_pc: fitInfo.priorDistancePc,
              }
            : null,
        },
      }
    : undefined;

  return (
    <InquiryLayout
      module={module}
      adapter={clusterCmdAdapter}
      context={context}
      introSlot={<ClusterIntro />}
      contextSlot={contextSlot}
      selectionSlot={selectionSlot}
      analysisSlot={analysisSlot}
      comparisonSlot={comparisonSlot}
      recordSave={recordSave}
    />
  );
}
