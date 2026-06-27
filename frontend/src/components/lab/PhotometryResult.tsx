import type { PhotometryMeasurement } from '../../types/photometry';
import { useLangStore } from '../../i18n';

interface PhotometryResultProps {
  measurements: PhotometryMeasurement[];
}

export function PhotometryResult({ measurements }: PhotometryResultProps) {
  const lang = useLangStore((s) => s.lang);
  if (measurements.length === 0) return null;

  return (
    <div className="photometry-result">
      <h4>{lang === 'ko' ? '측광 결과' : 'Photometry Measurements'}</h4>
      <div className="result-table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>#</th>
              <th>HJD</th>
              <th>{lang === 'ko' ? '원시 Flux' : 'Raw Flux'}</th>
              <th>{lang === 'ko' ? '배경 Flux' : 'Sky Flux'}</th>
              <th>{lang === 'ko' ? '순 Flux' : 'Net Flux'}</th>
              <th>{lang === 'ko' ? '기기 등급' : 'Inst. Mag'}</th>
              <th>{lang === 'ko' ? '오차' : 'Error'}</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((m, i) => (
              <tr key={m.observation_id}>
                <td>{i + 1}</td>
                <td>{m.hjd.toFixed(4)}</td>
                <td>{m.raw_flux.toFixed(1)}</td>
                <td>{m.sky_flux.toFixed(1)}</td>
                <td>{m.net_flux.toFixed(1)}</td>
                <td>{m.instrumental_mag.toFixed(4)}</td>
                <td>&plusmn;{m.mag_error.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
