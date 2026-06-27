import { useLocation, useNavigate } from 'react-router-dom';
import type { Target } from '../../types/target';
import { useT, useLangStore } from '../../i18n';
import {
  formatTargetSource,
  formatTargetType,
  formatMagnitude,
  formatConstellation,
  buildTargetDescription,
} from '../../utils/targetFormat';
import {
  buildTargetHref,
  getExplorerContext,
} from '../../utils/explorerNavigation';

interface TargetPopupProps {
  target: Target;
  gotoHint: string | null;
  gotoHintTone: 'info' | 'error' | null;
  gotoInProgress: boolean;
  gotoUnlocked: boolean;
  onGoto: () => void;
  onClose: () => void;
  embedded?: boolean;
}

export function TargetPopup({
  target,
  gotoHint,
  gotoHintTone,
  gotoInProgress,
  gotoUnlocked,
  onGoto,
  onClose,
  embedded = false,
}: TargetPopupProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const context = getExplorerContext(new URLSearchParams(location.search), {
    topicId: target.topic_id,
  });
  const sourceLabel = formatTargetSource(target.data_source, t);
  const isCluster = target.topic_id === 'open_cluster_cmd';
  const isExoplanet = target.topic_id === 'exoplanet_transit';

  return (
    <div className="target-popup">
      <div className="target-popup-header">
        <h3>{target.name}</h3>
        <button className="close-btn" onClick={onClose} aria-label={t('popup.close')}>
          &times;
        </button>
      </div>
      <div className="target-popup-body">
        <p>
          <strong>{t('popup.type')}:</strong> {formatTargetType(target.type, t)}
        </p>
        <p>
          <strong>{t('popup.constellation')}:</strong> {formatConstellation(target.constellation, lang)}
        </p>
        <p>
          <strong>{t('popup.magnitude')}:</strong> {formatMagnitude(target.magnitude_range, t)}
        </p>
        {target.period_days && (
          <p>
            <strong>{t('popup.period')}:</strong> {target.period_days} {t('popup.days')}
          </p>
        )}
        {sourceLabel && (
          <p>
            <strong>{t('popup.source')}:</strong> {sourceLabel}
          </p>
        )}
        <p className="target-desc">{buildTargetDescription(target, lang)}</p>
      </div>
      {!embedded && (
        <div className="target-popup-actions">
          <button
            className="btn-primary"
            disabled={gotoInProgress}
            onClick={onGoto}
          >
            {gotoInProgress ? t('popup.gotoSlewing') : 'GOTO'}
          </button>
          <button
            className="btn-secondary"
            disabled={!gotoUnlocked || gotoInProgress}
            onClick={() =>
              navigate(
                isCluster
                  ? `/modules/cluster-cmd?cluster=${target.id}`
                  : isExoplanet
                    ? `/modules/exoplanet-transit?target=${target.id}`
                    : buildTargetHref(target.id, context),
              )
            }
          >
            {isCluster
              ? lang === 'ko'
                ? '성단 CMD 탐구 시작'
                : 'Start Cluster CMD'
              : isExoplanet
                ? lang === 'ko'
                  ? '식현상 탐구 시작'
                  : 'Start Transit Inquiry'
                : t('popup.viewDetails')}
          </button>
        </div>
      )}
      {!embedded &&
        (gotoHint ? (
          <p
            className={`target-popup-hint ${
              gotoHintTone === 'error' ? 'error-text' : 'info-text'
            }`}
          >
            {gotoHint}
          </p>
        ) : !gotoUnlocked ? (
          <p className="target-popup-hint">{t('popup.gotoHint')}</p>
        ) : (
          <p className="target-popup-hint success-text">{t('popup.detailUnlocked')}</p>
        ))}
    </div>
  );
}
