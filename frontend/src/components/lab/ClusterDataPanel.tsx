import { useMemo, useState } from 'react';
import { useLangStore } from '../../i18n';
import { SkyDataPanel } from '../inquiry/SkyDataPanel';
import type { ClusterCmdResponse } from '../../api/client';

const PREVIEW_ROWS = 12;

/**
 * Step 2 (자료 확인) for the cluster module. Before this the step showed three
 * static lines ("자료 형식: 측광 카탈로그(표)") and no data at all, so there was
 * nothing to look at and nothing to notice. The transit module's Step 2 shows a
 * real sky image plus the observation parameters; this is the catalogue
 * equivalent — the field on the sky, the actual selection cuts the backend
 * applied, and real rows from the table the CMD is drawn from.
 */
export function ClusterDataPanel({ data }: { data: ClusterCmdResponse }) {
  const lang = useLangStore((s) => s.lang);
  const ko = lang === 'ko';
  const [showAll, setShowAll] = useState(false);
  const c = data.cluster;

  // DSS previews get unusable past a degree or so, and the nearby clusters here
  // span up to 6°, so the preview shows the centre and says so.
  const fovDeg = Math.min(1.0, Math.max(0.25, c.search_radius_deg * 2));
  const truncated = c.search_radius_deg * 2 > fovDeg;

  const rows = useMemo(
    () => (showAll ? data.members.slice(0, 200) : data.members.slice(0, PREVIEW_ROWS)),
    [data.members, showAll],
  );

  const pmText =
    c.pm_tol == null
      ? ko
        ? '고유운동 조건 없음'
        : 'no proper-motion cut'
      : `${c.pmra_c.toFixed(1)} ± ${c.pm_tol.toFixed(1)}, ${c.pmdec_c.toFixed(1)} ± ${c.pm_tol.toFixed(1)} mas/yr`;

  return (
    <div className="cluster-data-panel">
      <SkyDataPanel
        targetName={ko ? c.name_ko : c.name}
        ra={c.ra}
        dec={c.dec}
        fovDeg={fovDeg}
        analysedDataNote={{
          ko: '실제 분석에 쓰는 자료는 사진이 아니라 아래 표입니다. Gaia DR3 카탈로그에서 이 영역의 별마다 밝기(G)와 색(BP−RP)을 받아옵니다.',
          en: 'What is actually analysed is not the photo but the table below: per-star brightness (G) and colour (BP−RP) fetched from the Gaia DR3 catalogue for this field.',
        }}
        chips={[
          { label: { ko: '성단', en: 'Cluster' }, value: ko ? c.name_ko : c.name },
          { label: { ko: '중심 좌표', en: 'Centre' }, value: `RA ${c.ra.toFixed(2)}°, Dec ${c.dec.toFixed(2)}°` },
          { label: { ko: '검색 반지름', en: 'Search radius' }, value: `${c.search_radius_deg}°` },
          { label: { ko: '받아온 별 수', en: 'Stars returned' }, value: data.member_count.toLocaleString() },
          { label: { ko: '자료', en: 'Data' }, value: data.data_source },
          { label: { ko: '색지수', en: 'Colour index' }, value: data.color_label },
        ]}
      />
      {truncated && (
        <p className="cluster-data-note">
          {ko
            ? `이 성단은 하늘에서 반지름 ${c.search_radius_deg}° 만큼 퍼져 있어 사진에는 가운데 ${fovDeg.toFixed(2)}° 만 담겼습니다. 아래 표의 별은 퍼진 영역 전체에서 골라온 것입니다.`
            : `This cluster spans ${c.search_radius_deg}° in radius, so the image shows only the central ${fovDeg.toFixed(2)}°. The table below covers the full field.`}
        </p>
      )}

      <section className="inquiry-info-panel cluster-data-cuts">
        <span className="inquiry-panel-kicker">
          {ko ? '이 별들을 고른 조건' : 'How these stars were selected'}
        </span>
        <dl className="cluster-data-cut-list">
          <div>
            <dt>{ko ? '시차' : 'Parallax'}</dt>
            <dd>{`${c.plx_min} ~ ${c.plx_max} mas`}</dd>
          </div>
          <div>
            <dt>{ko ? '고유운동' : 'Proper motion'}</dt>
            <dd>{pmText}</dd>
          </div>
          <div>
            <dt>{ko ? '측광 품질' : 'Astrometric quality'}</dt>
            <dd>RUWE &lt; 1.4</dd>
          </div>
          <div>
            <dt>{ko ? '중심에서' : 'Within'}</dt>
            <dd>{`${c.search_radius_deg}°`}</dd>
          </div>
        </dl>
        <p className="cluster-data-note">
          {ko
            ? '시차는 별까지의 거리를, 고유운동은 하늘에서 움직이는 방향과 빠르기를 나타냅니다. 같은 성단의 별은 함께 태어나 함께 움직이므로 이 두 값이 서로 비슷합니다. 조건을 느슨하게 잡으면 성단과 무관한 배경별이 섞이고, 빡빡하게 잡으면 진짜 구성원도 빠집니다.'
            : 'Parallax stands for distance, proper motion for how the star moves across the sky. Cluster members were born together and move together, so both agree among them. A loose cut lets unrelated field stars in; a tight one drops real members.'}
        </p>
      </section>

      <section className="inquiry-info-panel">
        <span className="inquiry-panel-kicker">
          {ko ? 'CMD를 그리는 데 쓰는 표' : 'The table the CMD is drawn from'}
        </span>
        <div className="cluster-data-table-wrap">
          <table className="inquiry-compare-table cluster-data-table">
            <thead>
              <tr>
                <th>Gaia source_id</th>
                <th>{ko ? 'G 등급' : 'G mag'}</th>
                <th>BP−RP</th>
                <th>{ko ? '시차 (mas)' : 'Parallax (mas)'}</th>
                <th>pmRA</th>
                <th>pmDec</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.source_id}>
                  <td>{m.source_id}</td>
                  <td>{m.g_mag.toFixed(3)}</td>
                  <td>{m.bp_rp.toFixed(3)}</td>
                  <td>{m.parallax == null ? '—' : m.parallax.toFixed(3)}</td>
                  <td>{m.pmra == null ? '—' : m.pmra.toFixed(2)}</td>
                  <td>{m.pmdec == null ? '—' : m.pmdec.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cluster-data-note">
          {ko
            ? `전체 ${data.member_count.toLocaleString()}개 가운데 ${rows.length}개를 보이고 있습니다. Step 4의 색-등급도는 이 표의 BP−RP를 가로축, G를 세로축에 찍은 것입니다.`
            : `Showing ${rows.length} of ${data.member_count.toLocaleString()} rows. The Step 4 diagram plots BP−RP from this table against G.`}
        </p>
        {!showAll && data.member_count > PREVIEW_ROWS && (
          <button type="button" className="btn-sm" onClick={() => setShowAll(true)}>
            {ko ? '200개까지 펼쳐 보기' : 'Show up to 200 rows'}
          </button>
        )}
      </section>
    </div>
  );
}
