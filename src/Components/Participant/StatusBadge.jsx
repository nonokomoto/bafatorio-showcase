import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { STATUS_STYLES } from './statusBadgeConfig';

const StatusBadge = ({ status }) => {
  const { t } = useTranslation('participant');

  if (!status || !STATUS_STYLES[status]) return null;

  const s = STATUS_STYLES[status];
  // As chaves i18n estão em minúsculas; o status vem do DynamoDB em maiúsculas.
  const label = t(`participantsV2.status.${status.toLowerCase()}`, status);

  return (
    <span
      className="color-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{
        '--badge-dot': s.dot,
        '--badge-light-bg': s.lightBg,
        '--badge-light-text': s.lightText,
        '--badge-dark-bg': s.darkBg,
        '--badge-dark-text': s.darkText,
      }}
    >
      <span className="badge-dot w-1.5 h-1.5 rounded-full flex-shrink-0" />
      {label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

export default StatusBadge;
