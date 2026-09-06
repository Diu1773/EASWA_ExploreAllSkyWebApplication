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
              <th title={lang === 'ko' ? '관측 시각. 태양 중심을 기준으로 고친 율리우스일이며 단위는 일이다.' : undefined}>
                {lang === 'ko' ? '관측 시각 HJD' : 'HJD'}
              </th>
              <th title={lang === 'ko' ? '구경 안에서 센 빛의 총량. 하늘 배경이 아직 섞여 있다.' : undefined}>
                {lang === 'ko' ? '원시 밝기값' : 'Raw Flux'}
              </th>
              <th title={lang === 'ko' ? '같은 넓이에 해당하는 하늘 배경의 밝기값.' : undefined}>
                {lang === 'ko' ? '배경 밝기값' : 'Sky Flux'}
              </th>
              <th title={lang === 'ko' ? '원시에서 배경을 뺀 값. 별 자체의 밝기값이다.' : undefined}>
                {lang === 'ko' ? '순 밝기값' : 'Net Flux'}
              </th>
              <th title={lang === 'ko' ? '밝기값을 등급으로 환산한 값(mag). 값이 작을수록 밝다.' : undefined}>
                {lang === 'ko' ? '기기 등급' : 'Inst. Mag'}
              </th>
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
