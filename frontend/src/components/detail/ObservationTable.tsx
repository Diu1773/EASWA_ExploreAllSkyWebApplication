import { useAppStore } from '../../stores/useAppStore';
import type { Observation } from '../../types/target';
import { useLangStore } from '../../i18n';

interface ObservationTableProps {
  observations: Observation[];
}

export function ObservationTable({ observations }: ObservationTableProps) {
  const selected = useAppStore((s) => s.selectedObservationIds);
  const toggle = useAppStore((s) => s.toggleObservation);
  const selectAll = useAppStore((s) => s.selectAllObservations);
  const clearSelections = useAppStore((s) => s.clearSelections);
  const lang = useLangStore((s) => s.lang);

  const allSelected = observations.length > 0 && selected.length === observations.length;
  const isTessTable = observations.some((obs) => obs.mission === 'TESS');
  const isKmtnetTable = observations.some((obs) => obs.mission === 'KMTNet');

  return (
    <div className="observation-table-wrap">
      <div className="obs-table-header">
        <div>
          <h4>{lang === 'ko' ? '관측 자료' : 'Observations'}</h4>
          <p className="obs-table-subtitle">
          {isTessTable
            ? lang === 'ko' ? 'TESS Sector와 cutout 자료' : 'TESS sectors and cutout products'
            : lang === 'ko' ? '관측 아카이브 기록' : 'Archive observation records'}
          </p>
        </div>
        <div className="obs-table-actions">
          <button
            className="btn-sm"
            onClick={() =>
              allSelected
                ? clearSelections()
                : selectAll(observations.map((o) => o.id))
            }
          >
            {allSelected
              ? lang === 'ko' ? '전체 해제' : 'Deselect All'
              : lang === 'ko' ? '전체 선택' : 'Select All'}
          </button>
          <span className="selected-count">
            {lang === 'ko' ? `${selected.length}개 선택` : `${selected.length} selected`}
          </span>
        </div>
      </div>
      <table className="obs-table">
        <thead>
          {isTessTable ? (
            <tr>
              <th></th>
              <th>Sector</th>
              <th>{lang === 'ko' ? '카메라' : 'Camera'}</th>
              <th>CCD</th>
              <th>{lang === 'ko' ? '대역' : 'Band'}</th>
              <th>{lang === 'ko' ? '프레임' : 'Frames'}</th>
              <th>Cutout</th>
            </tr>
          ) : isKmtnetTable ? (
            <tr>
              <th></th>
              <th>{lang === 'ko' ? '관측소' : 'Site'}</th>
              <th>{lang === 'ko' ? '관측 시각' : 'Epoch'}</th>
              <th>HJD</th>
              <th>{lang === 'ko' ? '필터' : 'Filter'}</th>
              <th>{lang === 'ko' ? '노출 (s)' : 'Exp (s)'}</th>
              <th>{lang === 'ko' ? '미리보기' : 'Preview'}</th>
              <th>FITS</th>
            </tr>
          ) : (
            <tr>
              <th></th>
              <th>{lang === 'ko' ? '관측 시각' : 'Epoch'}</th>
              <th>HJD</th>
              <th>{lang === 'ko' ? '필터' : 'Filter'}</th>
              <th>{lang === 'ko' ? '노출 (s)' : 'Exp (s)'}</th>
              <th>{lang === 'ko' ? '대기질량' : 'Airmass'}</th>
            </tr>
          )}
        </thead>
        <tbody>
          {observations.map((obs) => (
            <tr
              key={obs.id}
              className={selected.includes(obs.id) ? 'selected' : ''}
            >
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(obs.id)}
                  onChange={() => toggle(obs.id)}
                />
              </td>
              {isTessTable ? (
                <>
                  <td>{obs.display_label ?? `Sector ${obs.sector ?? '-'}`}</td>
                  <td>{obs.camera ?? '-'}</td>
                  <td>{obs.ccd ?? '-'}</td>
                  <td>{obs.filter_band}</td>
                  <td>
                    {obs.frame_count !== null && obs.frame_count !== undefined
                      ? obs.frame_count.toLocaleString()
                      : 'n/a'}
                  </td>
                  <td>
                    {obs.cutout_url ? (
                      <a
                        href={obs.cutout_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-link"
                      >
                        FITS
                      </a>
                    ) : (
                      lang === 'ko' ? '준비 중' : 'Pending'
                    )}
                  </td>
                </>
              ) : isKmtnetTable ? (
                <>
                  <td>{obs.display_label ?? '-'}</td>
                  <td>{obs.epoch.includes('T') ? new Date(obs.epoch).toLocaleString() : obs.epoch}</td>
                  <td>{obs.hjd.toFixed(5)}</td>
                  <td>{obs.filter_band}</td>
                  <td>{obs.exposure_sec}</td>
                  <td>
                    {obs.thumbnail_url ? (
                      <a
                        href={obs.thumbnail_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-link"
                      >
                        JPG
                      </a>
                    ) : (
                      'n/a'
                    )}
                  </td>
                  <td>
                    {obs.cutout_url ? (
                      <a
                        href={obs.cutout_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-link"
                      >
                        FITS
                      </a>
                    ) : (
                      'n/a'
                    )}
                  </td>
                </>
              ) : (
                <>
                  <td>{new Date(obs.epoch).toLocaleDateString()}</td>
                  <td>{obs.hjd.toFixed(4)}</td>
                  <td>{obs.filter_band}</td>
                  <td>{obs.exposure_sec}</td>
                  <td>{obs.airmass.toFixed(3)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
